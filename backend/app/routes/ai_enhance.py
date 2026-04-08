"""
AI Enhancement Router  —  /ai/*
================================
Optional enhancement endpoints layered on top of the core classroom system.

Design principles:
  - Every response includes "ai_available: bool" so the frontend can
    degrade gracefully when the LLM is unavailable.
  - No endpoint in this file modifies core data directly.
    Auto-evaluation returns a SUGGESTION; the instructor must explicitly
    call the existing grade endpoint to persist it.
  - Auth is required on all endpoints (same JWT as core routes).
  - Rate: no extra rate-limiting beyond what the LLM provider enforces.
"""

from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import conn
from app.services.ai_classroom import (
    generate_assignment_hint,
    draft_quiz,
    generate_nudge,
    get_recommendations,
    auto_evaluate,
    summarize_discussion,
)

router = APIRouter(prefix="/ai", tags=["AI Enhancements"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────

class HintRequest(BaseModel):
    student_question: Optional[str] = None

class QuizDraftRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "medium"
    course_context: Optional[str] = None

class NudgeRequest(BaseModel):
    student_id: int
    course_id: Optional[int] = None

class RecommendRequest(BaseModel):
    # All fields optional — fallbacks handled in service
    weak_topics: Optional[list[str]] = None
    recent_topics: Optional[list[str]] = None

class SummarizeRequest(BaseModel):
    pass  # no body needed — data fetched from DB


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _require_instructor(user):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Instructors only")

def _student_id(user):
    return user.get("id") or user.get("user_id")


# ─────────────────────────────────────────────────────────────────────────────
# 1.  GET /ai/assignment/{assignment_id}/hint
#     Student requests a hint for an assignment.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/assignment/{assignment_id}/hint")
def assignment_hint(
    assignment_id: int,
    body: HintRequest,
    user=Depends(get_current_user),
):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT title, content FROM assignments WHERE id = ?",
        (assignment_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    result = generate_assignment_hint(
        assignment_title=row[0],
        assignment_content=row[1] or "",
        student_question=body.student_question,
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2.  POST /ai/quiz/draft
#     Instructor gets an AI-generated quiz draft to review before publishing.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/quiz/draft")
def quiz_draft(body: QuizDraftRequest, user=Depends(get_current_user)):
    _require_instructor(user)
    result = draft_quiz(
        topic=body.topic,
        num_questions=body.num_questions,
        difficulty=body.difficulty,
        course_context=body.course_context,
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 3.  POST /ai/nudge/{student_id}
#     Instructor gets a personalised message draft to send to an inactive student.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/nudge/{student_id}")
def nudge_student(
    student_id: int,
    body: NudgeRequest,
    user=Depends(get_current_user),
):
    _require_instructor(user)
    cursor = conn.cursor()

    # Fetch student name
    cursor.execute("SELECT name FROM users WHERE id = ?", (student_id,))
    student_row = cursor.fetchone()
    if not student_row:
        raise HTTPException(status_code=404, detail="Student not found")
    student_name = student_row[0]

    # Days inactive from gamification
    cursor.execute(
        "SELECT last_active FROM gamification WHERE student_id = ?",
        (student_id,),
    )
    gam = cursor.fetchone()
    days_inactive = 0
    if gam and gam[0]:
        from datetime import date
        try:
            last = date.fromisoformat(str(gam[0]))
            days_inactive = (date.today() - last).days
        except Exception:
            pass

    # Pending assignments
    pending_items: list[str] = []
    if body.course_id:
        cursor.execute(
            """
            SELECT a.title FROM assignments a
            LEFT JOIN assignment_submissions s
                   ON a.id = s.assignment_id AND s.student_id = ?
            WHERE a.course_id = ? AND (s.id IS NULL OR s.status = 'pending')
            LIMIT 5
            """,
            (student_id, body.course_id),
        )
        pending_items = [r[0] for r in cursor.fetchall()]

    # Course name
    course_name = None
    if body.course_id:
        cursor.execute("SELECT name FROM courses WHERE id = ?", (body.course_id,))
        c = cursor.fetchone()
        if c:
            course_name = c[0]

    result = generate_nudge(
        student_name=student_name,
        days_inactive=days_inactive,
        pending_items=pending_items,
        course_name=course_name,
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 4.  GET /ai/recommendations
#     Personalised learning recommendations for the current student.
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/recommendations")
def ai_recommendations(user=Depends(get_current_user)):
    uid = _student_id(user)
    cursor = conn.cursor()

    # Weak topics from performance table
    cursor.execute(
        """
        SELECT topic,
               SUM(correct) AS c,
               SUM(wrong)   AS w
        FROM performance
        WHERE student_id = ?
        GROUP BY topic
        HAVING (SUM(correct) * 1.0 / NULLIF(SUM(correct) + SUM(wrong), 0)) < 0.6
        ORDER BY w DESC
        LIMIT 6
        """,
        (uid,),
    )
    weak_topics = [r[0] for r in cursor.fetchall()]

    # Recent quiz topics
    cursor.execute(
        "SELECT DISTINCT topic FROM quiz_history WHERE student_id = ? ORDER BY created_at DESC LIMIT 6",
        (uid,),
    )
    recent_topics = [r[0] for r in cursor.fetchall()]

    # Overall accuracy
    cursor.execute(
        "SELECT SUM(correct), SUM(wrong) FROM performance WHERE student_id = ?",
        (uid,),
    )
    row = cursor.fetchone()
    total_c, total_w = (row[0] or 0), (row[1] or 0)
    accuracy = (total_c / max(total_c + total_w, 1)) * 100

    # Enrolled courses
    cursor.execute(
        """
        SELECT c.name FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ?
        """,
        (uid,),
    )
    enrolled_courses = [r[0] for r in cursor.fetchall()]

    result = get_recommendations(
        weak_topics=weak_topics,
        recent_quiz_topics=recent_topics,
        accuracy=accuracy,
        enrolled_courses=enrolled_courses,
    )
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 5.  POST /ai/submission/{submission_id}/evaluate
#     Instructor gets an AI-suggested grade for a text submission.
#     Returns a SUGGESTION — does NOT persist anything.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/submission/{submission_id}/evaluate")
def evaluate_submission(
    submission_id: int,
    user=Depends(get_current_user),
):
    _require_instructor(user)
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT s.file_path, a.title, a.content, a.max_marks
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = ?
        """,
        (submission_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found")

    student_answer = row[0] or ""
    assignment_title = row[1] or "Assignment"
    assignment_content = row[2] or ""
    max_marks = row[3] or 100

    result = auto_evaluate(
        assignment_title=assignment_title,
        assignment_content=assignment_content,
        student_answer=student_answer,
        max_marks=int(max_marks),
    )
    result["submission_id"] = submission_id
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 6.  POST /ai/topic/{topic_id}/summarize
#     Summarize the discussion thread attached to a topic.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/topic/{topic_id}/summarize")
def summarize_topic(topic_id: int, user=Depends(get_current_user)):
    cursor = conn.cursor()

    # Get topic title
    cursor.execute(
        "SELECT title FROM daily_topics WHERE id = ?",
        (topic_id,),
    )
    topic_row = cursor.fetchone()
    if not topic_row:
        raise HTTPException(status_code=404, detail="Topic not found")
    topic_title = topic_row[0]

    # Fetch all comments via discussion_replies
    cursor.execute(
        """
        SELECT u.name, dr.body, dr.created_at
        FROM discussion_replies dr
        JOIN discussion_threads dt ON dr.thread_id = dt.id
        JOIN users u ON dr.author_id = u.id
        WHERE dt.topic_id = ?
        ORDER BY dr.created_at ASC
        """,
        (topic_id,),
    )
    rows = cursor.fetchall()
    comments = [{"author": r[0], "text": r[1], "created_at": r[2]} for r in rows]

    if not comments:
        return {
            "ai_available": True,
            "summary": "No discussion comments yet for this topic.",
            "key_points": [],
            "common_questions": [],
            "resolved": False,
            "comment_count": 0,
        }

    result = summarize_discussion(topic_title=topic_title, comments=comments)
    result["comment_count"] = len(comments)
    return result
