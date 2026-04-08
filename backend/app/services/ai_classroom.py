"""
AI Classroom Service Layer
==========================
All AI-enhancement functions for the classroom system live here.
This module has ZERO side effects — it only calls the LLM and returns
structured data.  Persistence, auth, and HTTP concerns belong in the
router layer (ai_enhance.py).

Each public function follows the same contract:
  - Returns a plain dict on success
  - Returns {"ai_available": False, "reason": str} on any LLM failure
  - NEVER raises — callers should never crash because AI is unavailable
"""

from __future__ import annotations
import json
import re
import traceback

from app.llm import generate_response, extract_json

# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _safe_call(fn, *args, **kwargs) -> dict:
    """Wrap any AI call so that failures return a graceful sentinel."""
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        traceback.print_exc()
        return {"ai_available": False, "reason": str(exc)}


def _is_failure(result: dict) -> bool:
    return isinstance(result, dict) and result.get("ai_available") is False


# ─────────────────────────────────────────────────────────────────────────────
# 1. Assignment Hints
# ─────────────────────────────────────────────────────────────────────────────

def _do_generate_assignment_hint(
    assignment_title: str,
    assignment_content: str,
    student_question: str | None = None,
) -> dict:
    """
    Generate a Socratic hint — nudges the student toward the answer without
    giving it away directly.
    """
    extra = f"\nThe student asks: {student_question}" if student_question else ""

    prompt = f"""You are a helpful teaching assistant.
A student is working on this assignment:
Title: {assignment_title}
Instructions: {assignment_content[:800]}{extra}

Give 2–3 HINTS that guide the student without revealing the answer.
Format as a numbered list.  Keep each hint under 2 sentences.
Do NOT include the solution.
"""
    raw = generate_response(prompt)
    return {"ai_available": True, "hints": raw.strip()}


def generate_assignment_hint(
    assignment_title: str,
    assignment_content: str,
    student_question: str | None = None,
) -> dict:
    return _safe_call(
        _do_generate_assignment_hint,
        assignment_title, assignment_content, student_question,
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Quiz Draft for Instructors
# ─────────────────────────────────────────────────────────────────────────────

def _do_draft_quiz(
    topic: str,
    num_questions: int = 5,
    difficulty: str = "medium",
    course_context: str | None = None,
) -> dict:
    """
    Generate a quiz draft that the instructor can review and edit before
    publishing.  Reuses the same JSON schema as the student quiz system.
    """
    context_block = f"\nCourse context: {course_context[:400]}" if course_context else ""

    prompt = f"""Generate a quiz for an instructor to review.
Topic: {topic}
Difficulty: {difficulty}
Questions: {num_questions}{context_block}

Return ONLY valid JSON in this exact format:
{{
  "questions": [
    {{
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "explanation": "..."
    }}
  ]
}}
Types allowed: mcq (4 options), true_false (options: ["True","False"]), fill_blank (options: []).
All questions must have: type, question, options, correct_answer, explanation.
"""
    raw = generate_response(prompt)
    quiz_data = extract_json(raw)

    # Validate + sanitise (same rules as llm.generate_quiz)
    questions = quiz_data.get("questions") or []
    for q in questions:
        if q.get("type") == "true_false":
            q["options"] = ["True", "False"]
        if q.get("type") == "mcq":
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) < 4:
                q["options"] = ["Option A", "Option B", "Option C", "Option D"]
            elif len(opts) > 4:
                q["options"] = opts[:4]
        if q.get("type") != "fill_blank" and not q.get("options"):
            q["options"] = ["True", "False"] if q.get("type") == "true_false" else ["A", "B", "C", "D"]

    return {"ai_available": True, "questions": questions, "topic": topic}


def draft_quiz(
    topic: str,
    num_questions: int = 5,
    difficulty: str = "medium",
    course_context: str | None = None,
) -> dict:
    return _safe_call(_do_draft_quiz, topic, num_questions, difficulty, course_context)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Smart Nudge for Inactive Students
# ─────────────────────────────────────────────────────────────────────────────

def _do_generate_nudge(
    student_name: str,
    days_inactive: int,
    pending_items: list[str],
    course_name: str | None = None,
) -> dict:
    """
    Craft a warm, motivational, non-pushy message for a student who has been
    inactive.  The instructor can send this directly or edit it first.
    """
    items_text = "\n".join(f"- {item}" for item in pending_items[:5]) if pending_items else "- No specific pending items"
    course_block = f" in {course_name}" if course_name else ""

    prompt = f"""Write a short, warm, encouraging message to a student.
Student: {student_name}
Days since last activity: {days_inactive}{course_block}
Pending work:
{items_text}

Guidelines:
- Keep it under 4 sentences
- Sound like a supportive instructor, not an automated alert
- Acknowledge their absence briefly
- Focus on encouragement and next step
- Do NOT be preachy or guilt-tripping
- Do NOT use emojis excessively
Return only the message text, no subject line.
"""
    raw = generate_response(prompt)
    return {
        "ai_available": True,
        "message": raw.strip(),
        "student_name": student_name,
        "days_inactive": days_inactive,
    }


def generate_nudge(
    student_name: str,
    days_inactive: int,
    pending_items: list[str],
    course_name: str | None = None,
) -> dict:
    return _safe_call(_do_generate_nudge, student_name, days_inactive, pending_items, course_name)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Personalized Learning Recommendations
# ─────────────────────────────────────────────────────────────────────────────

def _do_recommend(
    weak_topics: list[str],
    recent_quiz_topics: list[str],
    accuracy: float,
    enrolled_courses: list[str],
) -> dict:
    """
    Return 3–5 actionable, personalized learning recommendations based on the
    student's performance data.
    """
    weak_str = ", ".join(weak_topics[:6]) if weak_topics else "none identified"
    recent_str = ", ".join(recent_quiz_topics[:6]) if recent_quiz_topics else "none"
    courses_str = ", ".join(enrolled_courses[:4]) if enrolled_courses else "unknown"

    prompt = f"""You are a learning coach. Provide 3–5 personalized study recommendations.

Student performance:
- Overall accuracy: {accuracy:.0f}%
- Weak topics: {weak_str}
- Recent quiz topics: {recent_str}
- Enrolled in: {courses_str}

Return ONLY valid JSON:
{{
  "recommendations": [
    {{
      "title": "short title",
      "reason": "one sentence why",
      "action": "specific action to take (start with a verb)",
      "priority": "high|medium|low"
    }}
  ]
}}
No extra text outside the JSON.
"""
    raw = generate_response(prompt)
    data = extract_json(raw)
    recs = data.get("recommendations") or []

    # Fallback: parse as plain text if JSON fails
    if not recs and raw.strip():
        recs = [{"title": "Study Tip", "reason": "", "action": line.strip(" -•"), "priority": "medium"}
                for line in raw.split("\n") if line.strip()]

    return {"ai_available": True, "recommendations": recs}


def get_recommendations(
    weak_topics: list[str],
    recent_quiz_topics: list[str],
    accuracy: float,
    enrolled_courses: list[str],
) -> dict:
    return _safe_call(_do_recommend, weak_topics, recent_quiz_topics, accuracy, enrolled_courses)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Auto-Evaluation of Subjective Answers
# ─────────────────────────────────────────────────────────────────────────────

def _do_auto_evaluate(
    assignment_title: str,
    assignment_content: str,
    student_answer: str,
    max_marks: int = 100,
) -> dict:
    """
    Evaluate a student's text submission and suggest marks + feedback.
    This is a SUGGESTION ONLY — the instructor must confirm before it is saved.
    The response includes a confidence level so the instructor knows how much
    to trust the AI's judgment.
    """
    prompt = f"""You are an expert instructor grading a student's assignment submission.

Assignment: {assignment_title}
Instructions: {assignment_content[:600]}

Student's submission:
\"\"\"
{student_answer[:1500]}
\"\"\"

Maximum marks: {max_marks}

Evaluate the submission and return ONLY valid JSON:
{{
  "suggested_marks": <integer 0–{max_marks}>,
  "confidence": "high|medium|low",
  "feedback": "2–4 sentences of constructive feedback",
  "strengths": ["one", "two"],
  "improvements": ["one", "two"]
}}

Grading rubric:
- Correctness and accuracy (40%)
- Completeness (30%)
- Clarity of explanation (20%)
- Structure (10%)
No extra text outside the JSON.
"""
    raw = generate_response(prompt)
    data = extract_json(raw)

    if not data or "suggested_marks" not in data:
        return {"ai_available": False, "reason": "Could not parse evaluation response"}

    # Clamp marks
    data["suggested_marks"] = max(0, min(max_marks, int(data.get("suggested_marks", 0))))
    data["ai_available"] = True
    data["is_suggestion"] = True   # always remind callers this is a suggestion
    return data


def auto_evaluate(
    assignment_title: str,
    assignment_content: str,
    student_answer: str,
    max_marks: int = 100,
) -> dict:
    return _safe_call(_do_auto_evaluate, assignment_title, assignment_content, student_answer, max_marks)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Discussion Thread Summarization
# ─────────────────────────────────────────────────────────────────────────────

def _do_summarize_discussion(
    topic_title: str,
    comments: list[dict],
) -> dict:
    """
    Produce a concise summary of a long discussion thread so students can
    quickly grasp the key points without reading every comment.
    """
    if not comments:
        return {"ai_available": True, "summary": "No comments to summarize yet.", "key_points": []}

    # Build a condensed thread (cap at 30 most-recent comments × 200 chars each)
    thread_text = "\n".join(
        f"{c.get('author', 'Student')}: {str(c.get('text') or c.get('body') or '')[:200]}"
        for c in comments[-30:]
    )

    prompt = f"""Summarize this classroom discussion thread about "{topic_title}".

Thread:
{thread_text}

Return ONLY valid JSON:
{{
  "summary": "2–3 sentence overview of the discussion",
  "key_points": ["point 1", "point 2", "point 3"],
  "common_questions": ["question 1", "question 2"],
  "resolved": true or false
}}
No extra text outside the JSON.
"""
    raw = generate_response(prompt)
    data = extract_json(raw)

    if not data or "summary" not in data:
        # Fallback: return raw as summary
        return {"ai_available": True, "summary": raw.strip(), "key_points": [], "common_questions": [], "resolved": False}

    data["ai_available"] = True
    return data


def summarize_discussion(topic_title: str, comments: list[dict]) -> dict:
    return _safe_call(_do_summarize_discussion, topic_title, comments)
