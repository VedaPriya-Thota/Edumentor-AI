"""
analytics.py — enhanced analytics, badges, heatmap, classroom overview
======================================================================

Existing endpoints (unchanged behaviour):
  GET /analytics/weak-topics
  GET /analytics/leaderboard
  GET /analytics/progress
  GET /analytics/study-plan
  GET /analytics/recommendations
  GET /analytics/gamification
  GET /analytics/daily-goal
  GET /analytics/quiz-history
  GET /analytics/performance
  GET /analytics/doubt-history
  GET /analytics/course-progress/{course_id}
  GET /analytics/course-leaderboard/{course_id}

New endpoints:
  GET /analytics/badges                      student's earned badges
  GET /analytics/heatmap                     activity heatmap (84-day window)
  GET /analytics/student-overview            cross-course summary for student
  GET /analytics/classroom-overview/{cid}   instructor: full course breakdown
  GET /analytics/inactive-students/{cid}    instructor: inactive student list
"""

from fastapi import APIRouter, Depends
from datetime import date, timedelta
from app.database import conn
from app.auth import get_current_user
from app.llm import generate_study_plan, generate_quiz, generate_feedback

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ─────────────────────────────────────────────────────────────────────────────
# SHARED HELPERS (used internally)
# ─────────────────────────────────────────────────────────────────────────────

def get_topic_stats(student_id):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT topic, SUM(correct), SUM(wrong)
        FROM performance
        WHERE student_id = ?
        GROUP BY topic
    """, (student_id,))
    results = cursor.fetchall()
    topics = []
    for topic, correct, wrong in results:
        correct = correct or 0
        wrong = wrong or 0
        total = correct + wrong
        accuracy = (correct / total) * 100 if total > 0 else 0
        topics.append({
            "topic": topic,
            "correct": correct,
            "wrong": wrong,
            "accuracy": round(accuracy, 2)
        })
    return topics


# ─────────────────────────────────────────────────────────────────────────────
# BADGE DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

BADGE_CATALOG = [
    {
        "key": "first_step",
        "name": "First Step",
        "description": "Completed your first quiz",
        "icon": "🚀",
        "tier": "bronze",
    },
    {
        "key": "quiz_master",
        "name": "Quiz Master",
        "description": "Completed 10 or more quizzes",
        "icon": "🏆",
        "tier": "gold",
    },
    {
        "key": "perfect_score",
        "name": "Perfect Score",
        "description": "Achieved 100% on any quiz",
        "icon": "💯",
        "tier": "gold",
    },
    {
        "key": "overachiever",
        "name": "Overachiever",
        "description": "Maintained an average accuracy above 85%",
        "icon": "⚡",
        "tier": "platinum",
    },
    {
        "key": "consistent_learner",
        "name": "Consistent Learner",
        "description": "Maintained a 7-day activity streak",
        "icon": "🔥",
        "tier": "silver",
    },
    {
        "key": "hot_streak",
        "name": "Hot Streak",
        "description": "Maintained a 14-day activity streak",
        "icon": "🌋",
        "tier": "gold",
    },
    {
        "key": "top_contributor",
        "name": "Top Contributor",
        "description": "Posted 5 or more discussion replies",
        "icon": "💬",
        "tier": "silver",
    },
    {
        "key": "question_master",
        "name": "Question Master",
        "description": "Asked 5 or more doubts to the AI Mentor",
        "icon": "🤔",
        "tier": "bronze",
    },
    {
        "key": "assignment_hero",
        "name": "Assignment Hero",
        "description": "Submitted 5 or more assignments",
        "icon": "📋",
        "tier": "silver",
    },
    {
        "key": "dedicated_student",
        "name": "Dedicated Student",
        "description": "Active on 10 or more unique days",
        "icon": "📅",
        "tier": "silver",
    },
    {
        "key": "xp_hunter",
        "name": "XP Hunter",
        "description": "Accumulated 1,000 total XP",
        "icon": "✨",
        "tier": "gold",
    },
    {
        "key": "course_champion",
        "name": "Course Champion",
        "description": "Ranked #1 on any course leaderboard",
        "icon": "👑",
        "tier": "platinum",
    },
    {
        "key": "knowledge_seeker",
        "name": "Knowledge Seeker",
        "description": "Enrolled in 3 or more courses",
        "icon": "📚",
        "tier": "bronze",
    },
    {
        "key": "daily_grinder",
        "name": "Daily Grinder",
        "description": "Met the daily XP goal 5 days in a row",
        "icon": "💪",
        "tier": "silver",
    },
]

TIER_ORDER = {"bronze": 0, "silver": 1, "gold": 2, "platinum": 3}


def _compute_badges(student_id: int) -> list[str]:
    """
    Evaluate all badge criteria for a student and return list of earned badge keys.
    Uses only read queries — no side-effects.
    """
    cursor = conn.cursor()
    earned = []

    # ── quiz count & accuracy ─────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(*), AVG(percentage), MAX(percentage) FROM quiz_history WHERE student_id = ?",
        (student_id,),
    )
    qh = cursor.fetchone()
    quiz_count = qh[0] or 0
    avg_pct = qh[1] or 0
    max_pct = qh[2] or 0

    if quiz_count >= 1:
        earned.append("first_step")
    if quiz_count >= 10:
        earned.append("quiz_master")
    if max_pct >= 100:
        earned.append("perfect_score")
    if avg_pct >= 85 and quiz_count >= 5:
        earned.append("overachiever")

    # ── streak ────────────────────────────────────────────────────────────
    cursor.execute(
        "SELECT streak FROM gamification WHERE student_id = ?",
        (student_id,),
    )
    gam = cursor.fetchone()
    streak = gam[0] if gam else 0
    if streak >= 7:
        earned.append("consistent_learner")
    if streak >= 14:
        earned.append("hot_streak")

    # ── discussion replies ────────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(*) FROM discussion_replies WHERE author_id = ?",
        (student_id,),
    )
    reply_count = cursor.fetchone()[0] or 0
    if reply_count >= 5:
        earned.append("top_contributor")

    # ── doubts asked ─────────────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(*) FROM doubts WHERE student_id = ?",
        (student_id,),
    )
    doubt_count = cursor.fetchone()[0] or 0
    if doubt_count >= 5:
        earned.append("question_master")

    # ── assignment submissions ────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(*) FROM assignment_submissions WHERE student_id = ? AND status IN ('completed','graded')",
        (student_id,),
    )
    sub_count = cursor.fetchone()[0] or 0
    if sub_count >= 5:
        earned.append("assignment_hero")

    # ── unique active days ────────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(DISTINCT date) FROM daily_progress WHERE student_id = ? AND xp_earned > 0",
        (student_id,),
    )
    active_days = cursor.fetchone()[0] or 0
    if active_days >= 10:
        earned.append("dedicated_student")

    # ── XP total ─────────────────────────────────────────────────────────
    cursor.execute(
        "SELECT xp FROM gamification WHERE student_id = ?",
        (student_id,),
    )
    xp_row = cursor.fetchone()
    xp = xp_row[0] if xp_row else 0
    if xp >= 1000:
        earned.append("xp_hunter")

    # ── course champion (rank #1 in any course leaderboard) ──────────────
    # This is expensive to compute fully; we check if student is the top
    # XP holder in any enrolled course as a proxy.
    cursor.execute(
        "SELECT course_id FROM enrollments WHERE user_id = ? AND role = 'student'",
        (student_id,),
    )
    course_ids = [r[0] for r in cursor.fetchall()]
    for cid in course_ids:
        cursor.execute(
            """
            SELECT e.user_id,
                   COALESCE(g.xp, 0) as xp,
                   (SELECT COUNT(*) FROM quiz_history qh2
                    WHERE qh2.student_id = e.user_id AND qh2.course_id = ?) AS quiz_ct
            FROM enrollments e
            LEFT JOIN gamification g ON e.user_id = g.student_id
            WHERE e.course_id = ?
            ORDER BY xp DESC, quiz_ct DESC
            LIMIT 1
            """,
            (cid, cid),
        )
        top = cursor.fetchone()
        if top and top[0] == student_id:
            earned.append("course_champion")
            break

    # ── enrolled in 3+ courses ────────────────────────────────────────────
    if len(course_ids) >= 3:
        earned.append("knowledge_seeker")

    # ── daily grinder: met goal 5 consecutive days ────────────────────────
    cursor.execute(
        """
        SELECT date FROM daily_progress
        WHERE student_id = ? AND xp_earned >= 50
        ORDER BY date DESC
        LIMIT 10
        """,
        (student_id,),
    )
    goal_dates = [row[0] for row in cursor.fetchall()]
    if len(goal_dates) >= 5:
        # Check if any 5 consecutive dates exist
        sorted_dates = sorted(
            [date.fromisoformat(d) for d in goal_dates if d], reverse=True
        )
        consecutive = 1
        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i - 1] - sorted_dates[i]).days == 1:
                consecutive += 1
                if consecutive >= 5:
                    earned.append("daily_grinder")
                    break
            else:
                consecutive = 1

    return list(set(earned))


def _persist_badges(student_id: int, earned_keys: list[str]):
    """Upsert earned badges into student_badges table."""
    cursor = conn.cursor()
    for key in earned_keys:
        cursor.execute(
            "INSERT OR IGNORE INTO student_badges (student_id, badge_key) VALUES (?, ?)",
            (student_id, key),
        )
    conn.commit()


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING ENDPOINTS (preserved exactly)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/weak-topics")
def get_weak_topics(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    topics = get_topic_stats(student_id)
    return {
        "topics": [
            {**t, "status": "Weak" if t["accuracy"] < 50 else "Strong"}
            for t in topics
        ]
    }


@router.get("/leaderboard")
def leaderboard():
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users WHERE role = 'student'")
    students = cursor.fetchall()

    leaderboard_data = []
    for s in students:
        student_id, name = s
        cursor.execute("""
            SELECT SUM(correct + wrong), SUM(correct), COUNT(*)
            FROM performance WHERE student_id = ?
        """, (student_id,))
        perf = cursor.fetchone()
        total_q = perf[0] or 0
        total_correct = perf[1] or 0
        total_quizzes = perf[2] or 0
        accuracy = (total_correct / total_q) * 100 if total_q > 0 else 0

        cursor.execute("SELECT xp, streak FROM gamification WHERE student_id = ?", (student_id,))
        game_data = cursor.fetchone()
        if game_data:
            xp, streak = game_data
        else:
            xp = total_q * 2 + total_correct * 5
            streak = 0

        score = (xp * 0.6) + (accuracy * 0.3) + (total_quizzes * 0.1)

        # Attach earned badge count
        cursor.execute(
            "SELECT COUNT(*) FROM student_badges WHERE student_id = ?", (student_id,)
        )
        badge_count = cursor.fetchone()[0] or 0

        leaderboard_data.append({
            "student_id": student_id,
            "name": name,
            "xp": xp,
            "accuracy": round(accuracy, 2),
            "quizzes": total_quizzes,
            "streak": streak,
            "score": round(score, 2),
            "badge_count": badge_count,
        })

    leaderboard_data = sorted(leaderboard_data, key=lambda x: x["score"], reverse=True)
    for i, student in enumerate(leaderboard_data):
        student["rank"] = i + 1

    return {"leaderboard": leaderboard_data}


@router.get("/progress")
def progress(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT correct, wrong, topic FROM performance WHERE student_id = ?
    """, (student_id,))
    rows = cursor.fetchall()

    history = []
    total_correct = 0
    total_wrong = 0

    for i, (c, w, topic) in enumerate(rows):
        c = c or 0
        w = w or 0
        total = c + w
        history.append({
            "test": i + 1,
            "topic": topic,
            "correct": c,
            "wrong": w,
            "accuracy": round((c / total) * 100, 2) if total else 0
        })
        total_correct += c
        total_wrong += w

    total_questions = total_correct + total_wrong
    accuracy = (total_correct / total_questions) * 100 if total_questions else 0
    avg_score = total_correct / len(history) if history else 0

    topics = get_topic_stats(student_id)
    weak_topics = [{"topic": t["topic"], "accuracy": t["accuracy"]} for t in topics if t["accuracy"] < 50]

    return {
        "total_quizzes": len(history),
        "total_questions": total_questions,
        "correct": total_correct,
        "wrong": total_wrong,
        "accuracy": round(accuracy, 2),
        "avg_score": round(avg_score, 2),
        "history": history,
        "weak_topics": weak_topics
    }


@router.get("/study-plan")
def study_plan(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    topics = get_topic_stats(student_id)
    if not topics:
        return {"message": "No data available"}
    weakest = min(topics, key=lambda x: x["accuracy"])
    plan = generate_study_plan(weakest["topic"])
    return {"weakest_topic": weakest["topic"], "accuracy": weakest["accuracy"], "study_plan": plan}


@router.get("/recommendations")
def recommendations(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    topics = get_topic_stats(student_id)
    weak_topics = [t for t in topics if t["accuracy"] < 50]
    if not weak_topics:
        return {"message": "You're doing great! 🎉"}
    topic_names = [t["topic"] for t in weak_topics]
    ai_feedback = generate_feedback(", ".join(topic_names), 0, 0)
    study_plan = generate_study_plan(topic_names[0])
    practice = generate_quiz(topic_names[0], 5, "easy")
    return {
        "weak_topics": topic_names,
        "ai_recommendation": ai_feedback,
        "study_plan": study_plan,
        "recommended_topic": topic_names[0],
        "practice_questions": practice,
    }


@router.get("/gamification")
def gamification(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("SELECT xp, streak FROM gamification WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()
    return {"xp": row[0] if row else 0, "streak": row[1] if row else 0}


@router.get("/daily-goal")
def daily_goal(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    today = str(date.today())
    cursor = conn.cursor()
    cursor.execute("SELECT xp_earned FROM daily_progress WHERE student_id = ? AND date = ?", (student_id, today))
    row = cursor.fetchone()
    xp_today = row[0] if row else 0
    goal = 50
    return {"xp_today": xp_today, "goal": goal, "progress": round((xp_today / goal) * 100, 2)}


@router.get("/quiz-history")
def get_quiz_history(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT topic, score, percentage, created_at FROM quiz_history
        WHERE student_id = ? ORDER BY created_at DESC
    """, (student_id,))
    rows = cursor.fetchall()
    return {
        "history": [{"topic": r[0], "score": r[1], "percentage": r[2], "date": r[3]} for r in rows]
    }


@router.get("/performance")
def performance(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT topic, AVG(percentage) FROM quiz_history
        WHERE student_id = ? GROUP BY topic
    """, (student_id,))
    data = cursor.fetchall()
    weak = []
    strong = []
    for topic, avg in data:
        if avg < 50:
            weak.append(topic)
        elif avg > 75:
            strong.append(topic)
    return {"weak_topics": weak, "strong_topics": strong}


@router.get("/doubt-history")
def doubt_history(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT question, answer, created_at FROM doubts
        WHERE student_id = ? ORDER BY created_at DESC LIMIT 20
    """, (student_id,))
    rows = cursor.fetchall()
    return {"history": [{"question": r[0], "answer": r[1], "date": r[2]} for r in rows]}


@router.get("/course-progress/{course_id}")
def course_progress(course_id: int, user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?", (student_id, course_id))
    if not cursor.fetchone():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not enrolled in this course")

    cursor.execute("SELECT COUNT(*) FROM assignments WHERE course_id = ?", (course_id,))
    total_assignments = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*) FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE a.course_id = ? AND s.student_id = ? AND s.status IN ('completed','graded')
    """, (course_id, student_id))
    completed_assignments = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM course_quizzes WHERE course_id = ?", (course_id,))
    total_course_quizzes = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*), AVG(percentage)
        FROM course_quiz_submissions cqs
        JOIN course_quizzes cq ON cqs.quiz_id = cq.id
        WHERE cq.course_id = ? AND cqs.student_id = ?
    """, (course_id, student_id))
    cq_row = cursor.fetchone()
    attempted_course_quizzes = cq_row[0] or 0
    course_quiz_avg = round(cq_row[1] or 0, 2)

    cursor.execute("""
        SELECT COUNT(*), AVG(percentage) FROM quiz_history WHERE student_id = ? AND course_id = ?
    """, (student_id, course_id))
    fq_row = cursor.fetchone()
    free_quizzes = fq_row[0] or 0
    free_quiz_avg = round(fq_row[1] or 0, 2)

    total_quizzes_taken = attempted_course_quizzes + free_quizzes
    overall_avg = round(
        ((course_quiz_avg * attempted_course_quizzes) + (free_quiz_avg * free_quizzes)) / total_quizzes_taken, 2
    ) if total_quizzes_taken else 0

    cursor.execute("""
        SELECT topic, score, percentage, created_at FROM quiz_history
        WHERE student_id = ? AND course_id = ? ORDER BY created_at DESC LIMIT 10
    """, (student_id, course_id))
    recent_quizzes = [{"topic": r[0], "score": r[1], "percentage": r[2], "date": r[3]} for r in cursor.fetchall()]

    # Discussion activity for this course
    cursor.execute("""
        SELECT
          (SELECT COUNT(*) FROM discussion_threads WHERE course_id = ? AND author_id = ?),
          (SELECT COUNT(*) FROM discussion_replies dr
           JOIN discussion_threads dt ON dr.thread_id = dt.id
           WHERE dt.course_id = ? AND dr.author_id = ?)
    """, (course_id, student_id, course_id, student_id))
    disc = cursor.fetchone()
    threads_created = disc[0] or 0
    replies_posted = disc[1] or 0

    # Topic count for course
    cursor.execute("SELECT COUNT(*) FROM daily_topics WHERE course_id = ?", (course_id,))
    total_topics = cursor.fetchone()[0] or 0

    # Score trend for chart (last 10 quiz_history entries for this course)
    history_for_chart = [
        {"label": f"Q{i+1}", "score": qz["percentage"]}
        for i, qz in enumerate(reversed(recent_quizzes))
    ]

    return {
        "course_id": course_id,
        "assignments": {
            "total": total_assignments,
            "completed": completed_assignments,
            "completion_rate": round((completed_assignments / total_assignments) * 100, 2) if total_assignments else 0,
        },
        "course_quizzes": {
            "total": total_course_quizzes,
            "attempted": attempted_course_quizzes,
            "avg_accuracy": course_quiz_avg,
        },
        "free_quizzes": {"attempted": free_quizzes, "avg_accuracy": free_quiz_avg},
        "overall_accuracy": overall_avg,
        "topics_total": total_topics,
        "discussion": {"threads": threads_created, "replies": replies_posted},
        "recent_quizzes": recent_quizzes,
        "history": history_for_chart,
    }


@router.get("/course-leaderboard/{course_id}")
def course_leaderboard(course_id: int, user=Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.user_id, u.name
        FROM enrollments e JOIN users u ON e.user_id = u.id
        WHERE e.course_id = ? AND u.role = 'student'
    """, (course_id,))
    students = cursor.fetchall()

    leaderboard_data = []
    for student_id, name in students:
        cursor.execute("""
            SELECT SUM(correct + wrong), SUM(correct), COUNT(*)
            FROM quiz_history WHERE student_id = ? AND course_id = ?
        """, (student_id, course_id))
        qh = cursor.fetchone()
        total_q = qh[0] or 0
        total_correct = qh[1] or 0
        total_quizzes = qh[2] or 0

        cursor.execute("""
            SELECT SUM(correct + wrong), SUM(correct), COUNT(*)
            FROM course_quiz_submissions cqs
            JOIN course_quizzes cq ON cqs.quiz_id = cq.id
            WHERE cqs.student_id = ? AND cq.course_id = ?
        """, (student_id, course_id))
        cqs = cursor.fetchone()
        total_q += cqs[0] or 0
        total_correct += cqs[1] or 0
        total_quizzes += cqs[2] or 0

        accuracy = (total_correct / total_q) * 100 if total_q else 0

        cursor.execute("SELECT xp, streak FROM gamification WHERE student_id = ?", (student_id,))
        game = cursor.fetchone()
        xp = game[0] if game else 0
        streak = game[1] if game else 0

        score = (xp * 0.6) + (accuracy * 0.3) + (total_quizzes * 0.1)

        # Badges earned
        cursor.execute("SELECT COUNT(*) FROM student_badges WHERE student_id = ?", (student_id,))
        badge_count = cursor.fetchone()[0] or 0

        # Assignment completion
        cursor.execute("""
            SELECT COUNT(*) FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE s.student_id = ? AND a.course_id = ? AND s.status IN ('completed','graded')
        """, (student_id, course_id))
        assignments_done = cursor.fetchone()[0] or 0

        leaderboard_data.append({
            "student_id": student_id,
            "name": name,
            "xp": xp,
            "accuracy": round(accuracy, 2),
            "quizzes": total_quizzes,
            "streak": streak,
            "score": round(score, 2),
            "badge_count": badge_count,
            "assignments_done": assignments_done,
        })

    leaderboard_data.sort(key=lambda x: x["score"], reverse=True)
    for i, entry in enumerate(leaderboard_data):
        entry["rank"] = i + 1

    return {"course_id": course_id, "leaderboard": leaderboard_data}


# ─────────────────────────────────────────────────────────────────────────────
# NEW: BADGES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/badges")
def get_badges(user=Depends(get_current_user)):
    """
    Returns the student's badge status: earned + locked, with metadata.
    Also persists newly earned badges to student_badges table.
    """
    student_id = user.get("id") or user.get("user_id")
    earned_keys = _compute_badges(student_id)
    _persist_badges(student_id, earned_keys)

    # Fetch earned_at timestamps
    cursor = conn.cursor()
    cursor.execute(
        "SELECT badge_key, earned_at FROM student_badges WHERE student_id = ?",
        (student_id,),
    )
    earned_at_map = {r[0]: r[1] for r in cursor.fetchall()}

    result = []
    for badge in BADGE_CATALOG:
        is_earned = badge["key"] in earned_keys
        result.append({
            **badge,
            "earned": is_earned,
            "earned_at": earned_at_map.get(badge["key"]) if is_earned else None,
        })

    # Sort: earned first (by tier desc), then locked
    result.sort(
        key=lambda b: (
            0 if b["earned"] else 1,
            -TIER_ORDER.get(b.get("tier", "bronze"), 0),
        )
    )

    return {
        "earned_count": len(earned_keys),
        "total_count": len(BADGE_CATALOG),
        "badges": result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW: ACTIVITY HEATMAP (last 84 days = 12 weeks)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/heatmap")
def activity_heatmap(user=Depends(get_current_user)):
    """
    Returns per-day activity counts for the last 84 days (12 weeks).
    Activity = quiz submissions + assignment submissions + engagement events.
    """
    student_id = user.get("id") or user.get("user_id")
    start_date = date.today() - timedelta(days=83)
    start_str = str(start_date)

    cursor = conn.cursor()

    # Build a dict of date → count
    activity: dict[str, int] = {}

    # 1. quiz_history
    cursor.execute(
        """
        SELECT date(created_at), COUNT(*)
        FROM quiz_history
        WHERE student_id = ? AND date(created_at) >= ?
        GROUP BY date(created_at)
        """,
        (student_id, start_str),
    )
    for row in cursor.fetchall():
        activity[row[0]] = activity.get(row[0], 0) + row[1]

    # 2. assignment_submissions
    cursor.execute(
        """
        SELECT date(submitted_at), COUNT(*)
        FROM assignment_submissions
        WHERE student_id = ? AND date(submitted_at) >= ?
        GROUP BY date(submitted_at)
        """,
        (student_id, start_str),
    )
    for row in cursor.fetchall():
        activity[row[0]] = activity.get(row[0], 0) + row[1]

    # 3. discussion replies (authored by student)
    cursor.execute(
        """
        SELECT date(created_at), COUNT(*)
        FROM discussion_replies
        WHERE author_id = ? AND date(created_at) >= ?
        GROUP BY date(created_at)
        """,
        (student_id, start_str),
    )
    for row in cursor.fetchall():
        activity[row[0]] = activity.get(row[0], 0) + row[1]

    # 4. engagement_events (login, etc.)
    cursor.execute(
        """
        SELECT date(created_at), COUNT(*)
        FROM engagement_events
        WHERE student_id = ? AND date(created_at) >= ?
        GROUP BY date(created_at)
        """,
        (student_id, start_str),
    )
    for row in cursor.fetchall():
        # Weight logins lower
        activity[row[0]] = activity.get(row[0], 0) + min(row[1], 2)

    # Generate full 84-day sequence (zeros for missing days)
    heatmap = []
    for i in range(84):
        d = str(start_date + timedelta(days=i))
        heatmap.append({"date": d, "count": activity.get(d, 0)})

    total_active_days = sum(1 for h in heatmap if h["count"] > 0)
    max_day_count = max((h["count"] for h in heatmap), default=0)

    return {
        "heatmap": heatmap,
        "total_active_days": total_active_days,
        "max_day_count": max_day_count,
        "start_date": str(start_date),
        "end_date": str(date.today()),
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW: STUDENT CROSS-COURSE OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/student-overview")
def student_overview(user=Depends(get_current_user)):
    """
    Comprehensive cross-course overview for the current student.
    Returns per-course stats + global rollup + badges + topic breakdown.
    """
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    # Enrolled courses
    cursor.execute("""
        SELECT e.course_id, c.name, c.code
        FROM enrollments e JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND e.role = 'student'
    """, (student_id,))
    courses = cursor.fetchall()

    courses_data = []
    for course_id, name, code in courses:
        # Assignment completion
        cursor.execute("SELECT COUNT(*) FROM assignments WHERE course_id = ?", (course_id,))
        total_a = cursor.fetchone()[0] or 0
        cursor.execute("""
            SELECT COUNT(*) FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.course_id = ? AND s.student_id = ? AND s.status IN ('completed','graded')
        """, (course_id, student_id))
        done_a = cursor.fetchone()[0] or 0

        # Quiz accuracy for this course
        cursor.execute("""
            SELECT COUNT(*), AVG(percentage) FROM quiz_history
            WHERE student_id = ? AND course_id = ?
        """, (student_id, course_id))
        qh = cursor.fetchone()
        quiz_count = qh[0] or 0
        quiz_avg = round(qh[1] or 0, 2)

        # Discussion
        cursor.execute("""
            SELECT COUNT(*) FROM discussion_replies dr
            JOIN discussion_threads dt ON dr.thread_id = dt.id
            WHERE dt.course_id = ? AND dr.author_id = ?
        """, (course_id, student_id))
        replies = cursor.fetchone()[0] or 0

        courses_data.append({
            "course_id": course_id,
            "name": name,
            "code": code,
            "assignment_completion": round((done_a / total_a) * 100, 1) if total_a else 0,
            "assignments_done": done_a,
            "assignments_total": total_a,
            "quiz_count": quiz_count,
            "quiz_avg_accuracy": quiz_avg,
            "discussion_replies": replies,
        })

    # Global stats
    cursor.execute("""
        SELECT COUNT(*), AVG(percentage), MAX(percentage)
        FROM quiz_history WHERE student_id = ?
    """, (student_id,))
    gq = cursor.fetchone()
    total_quizzes = gq[0] or 0
    global_accuracy = round(gq[1] or 0, 2)

    cursor.execute("""
        SELECT COUNT(*) FROM assignment_submissions
        WHERE student_id = ? AND status IN ('completed','graded')
    """, (student_id,))
    total_submitted = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*) FROM discussion_replies WHERE author_id = ?
    """, (student_id,))
    total_replies = cursor.fetchone()[0] or 0

    cursor.execute("""
        SELECT COUNT(*) FROM doubts WHERE student_id = ?
    """, (student_id,))
    total_doubts = cursor.fetchone()[0] or 0

    cursor.execute("SELECT xp, streak FROM gamification WHERE student_id = ?", (student_id,))
    gam = cursor.fetchone()
    xp = gam[0] if gam else 0
    streak = gam[1] if gam else 0

    # Topic breakdown (top 8 topics)
    topics = get_topic_stats(student_id)
    topics_sorted = sorted(topics, key=lambda t: -(t["correct"] + t["wrong"]))[:8]

    # Badges
    earned_keys = _compute_badges(student_id)
    _persist_badges(student_id, earned_keys)

    return {
        "global": {
            "total_quizzes": total_quizzes,
            "global_accuracy": global_accuracy,
            "total_assignments_submitted": total_submitted,
            "total_discussion_replies": total_replies,
            "total_doubts_asked": total_doubts,
            "xp": xp,
            "streak": streak,
            "courses_enrolled": len(courses),
            "badges_earned": len(earned_keys),
        },
        "courses": courses_data,
        "topic_breakdown": topics_sorted,
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW: INSTRUCTOR — CLASSROOM OVERVIEW  (per-course deep analytics)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classroom-overview/{course_id}")
def classroom_overview(course_id: int, user=Depends(get_current_user)):
    """
    Full classroom analytics for instructors:
      - Assignment completion rates per assignment
      - Per-quiz average score
      - Topic participation (discussion per topic)
      - Per-student activity breakdown
      - Inactive student detection
    """
    if user.get("role") != "instructor":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Instructor access only")

    cursor = conn.cursor()

    # Enrolled students
    cursor.execute("""
        SELECT e.user_id, u.name
        FROM enrollments e JOIN users u ON e.user_id = u.id
        WHERE e.course_id = ? AND u.role = 'student'
    """, (course_id,))
    students = cursor.fetchall()
    student_count = len(students)

    # ── Assignment stats ──────────────────────────────────────────────────
    cursor.execute("""
        SELECT a.id, a.title, a.due_date, a.type,
               COUNT(s.id) AS submitted,
               SUM(CASE WHEN s.status = 'graded' THEN 1 ELSE 0 END) AS graded,
               AVG(s.marks) AS avg_marks
        FROM assignments a
        LEFT JOIN assignment_submissions s ON a.id = s.assignment_id
        WHERE a.course_id = ?
        GROUP BY a.id
        ORDER BY a.due_date ASC
    """, (course_id,))
    assignment_rows = cursor.fetchall()

    assignments_overview = []
    for r in assignment_rows:
        submitted = r[4] or 0
        completion_rate = round((submitted / student_count) * 100, 1) if student_count else 0
        assignments_overview.append({
            "assignment_id": r[0],
            "title": r[1],
            "due_date": r[2],
            "type": r[3],
            "submitted": submitted,
            "total_students": student_count,
            "completion_rate": completion_rate,
            "graded": r[5] or 0,
            "avg_marks": round(r[6] or 0, 1),
        })

    # ── Quiz stats ────────────────────────────────────────────────────────
    cursor.execute("""
        SELECT cq.id, cq.title, cq.topic, cq.difficulty,
               COUNT(cqs.id) AS attempts,
               AVG(cqs.percentage) AS avg_pct,
               MAX(cqs.percentage) AS max_pct,
               MIN(cqs.percentage) AS min_pct
        FROM course_quizzes cq
        LEFT JOIN course_quiz_submissions cqs ON cq.id = cqs.quiz_id
        WHERE cq.course_id = ?
        GROUP BY cq.id
        ORDER BY cq.created_at DESC
    """, (course_id,))
    quiz_rows = cursor.fetchall()

    quizzes_overview = []
    for r in quiz_rows:
        attempts = r[4] or 0
        attempt_rate = round((attempts / student_count) * 100, 1) if student_count else 0
        quizzes_overview.append({
            "quiz_id": r[0],
            "title": r[1],
            "topic": r[2],
            "difficulty": r[3],
            "attempts": attempts,
            "total_students": student_count,
            "attempt_rate": attempt_rate,
            "avg_accuracy": round(r[5] or 0, 1),
            "max_accuracy": round(r[6] or 0, 1),
            "min_accuracy": round(r[7] or 0, 1),
        })

    # ── Topic participation (discussion threads/replies per topic) ────────
    cursor.execute("""
        SELECT dt_topic.id, dt_topic.title,
               COUNT(DISTINCT th.id) AS threads,
               COUNT(DISTINCT dr.id) AS replies
        FROM daily_topics dt_topic
        LEFT JOIN discussion_threads th ON th.topic_id = dt_topic.id
        LEFT JOIN discussion_replies dr ON dr.thread_id = th.id
        WHERE dt_topic.course_id = ?
        GROUP BY dt_topic.id
        ORDER BY dt_topic.date DESC
    """, (course_id,))
    topic_rows = cursor.fetchall()

    topics_overview = [
        {
            "topic_id": r[0],
            "title": r[1],
            "threads": r[2] or 0,
            "replies": r[3] or 0,
            "total_activity": (r[2] or 0) + (r[3] or 0),
        }
        for r in topic_rows
    ]

    # ── Per-student activity ──────────────────────────────────────────────
    today_str = str(date.today())
    students_activity = []
    for student_id, name in students:
        # Last active from gamification
        cursor.execute(
            "SELECT last_active, xp, streak FROM gamification WHERE student_id = ?",
            (student_id,),
        )
        gam = cursor.fetchone()
        last_active = gam[0] if gam else None
        xp = gam[1] if gam else 0
        streak = gam[2] if gam else 0
        days_inactive = 0
        if last_active:
            try:
                days_inactive = (date.today() - date.fromisoformat(str(last_active))).days
            except ValueError:
                days_inactive = 0
        else:
            days_inactive = 999

        # Quiz attempts for this course
        cursor.execute("""
            SELECT COUNT(*), AVG(percentage) FROM quiz_history
            WHERE student_id = ? AND course_id = ?
        """, (student_id, course_id))
        qh = cursor.fetchone()
        quiz_ct = qh[0] or 0
        quiz_acc = round(qh[1] or 0, 1)

        # Assignments submitted
        cursor.execute("""
            SELECT COUNT(*) FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE s.student_id = ? AND a.course_id = ? AND s.status IN ('completed','graded')
        """, (student_id, course_id))
        a_done = cursor.fetchone()[0] or 0

        # Discussion replies in this course
        cursor.execute("""
            SELECT COUNT(*) FROM discussion_replies dr
            JOIN discussion_threads dt ON dr.thread_id = dt.id
            WHERE dt.course_id = ? AND dr.author_id = ?
        """, (course_id, student_id))
        disc = cursor.fetchone()[0] or 0

        students_activity.append({
            "student_id": student_id,
            "name": name,
            "last_active": last_active,
            "days_inactive": days_inactive,
            "xp": xp,
            "streak": streak,
            "quiz_count": quiz_ct,
            "quiz_accuracy": quiz_acc,
            "assignments_done": a_done,
            "discussion_activity": disc,
            "risk_level": (
                "critical" if days_inactive >= 7 else
                "warning" if days_inactive >= 3 else
                "at_risk" if days_inactive >= 2 else
                "active"
            ),
        })

    # Sort by days_inactive desc so most at-risk float to top
    students_activity.sort(key=lambda s: s["days_inactive"], reverse=True)

    # ── Class-wide summary ────────────────────────────────────────────────
    total_topics = len(topics_overview)
    total_discussion = sum(t["total_activity"] for t in topics_overview)
    avg_quiz_acc = round(
        sum(s["quiz_accuracy"] for s in students_activity) / len(students_activity), 1
    ) if students_activity else 0
    inactive_count = sum(1 for s in students_activity if s["days_inactive"] >= 3)

    return {
        "course_id": course_id,
        "summary": {
            "total_students": student_count,
            "total_topics": total_topics,
            "total_assignments": len(assignments_overview),
            "total_quizzes": len(quizzes_overview),
            "avg_quiz_accuracy": avg_quiz_acc,
            "total_discussion_activity": total_discussion,
            "inactive_students": inactive_count,
        },
        "assignments": assignments_overview,
        "quizzes": quizzes_overview,
        "topics": topics_overview,
        "students": students_activity,
    }


# ─────────────────────────────────────────────────────────────────────────────
# NEW: INSTRUCTOR — INACTIVE STUDENTS (quick endpoint for alerts panel)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/inactive-students/{course_id}")
def inactive_students(course_id: int, threshold_days: int = 3, user=Depends(get_current_user)):
    """
    Returns students who have been inactive for >= threshold_days in a course.
    Quick endpoint for the instructor engagement panel.
    """
    if user.get("role") != "instructor":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Instructor access only")

    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.user_id, u.name
        FROM enrollments e JOIN users u ON e.user_id = u.id
        WHERE e.course_id = ? AND u.role = 'student'
    """, (course_id,))
    students = cursor.fetchall()

    inactive = []
    for student_id, name in students:
        cursor.execute(
            "SELECT last_active FROM gamification WHERE student_id = ?", (student_id,)
        )
        row = cursor.fetchone()
        last_active = row[0] if row else None
        days_inactive = 999
        if last_active:
            try:
                days_inactive = (date.today() - date.fromisoformat(str(last_active))).days
            except ValueError:
                pass

        if days_inactive >= threshold_days:
            # Check overdue assignments
            today_str = str(date.today())
            cursor.execute("""
                SELECT COUNT(*) FROM assignments a
                LEFT JOIN assignment_submissions s
                       ON a.id = s.assignment_id AND s.student_id = ?
                WHERE a.course_id = ?
                  AND (s.status IS NULL OR s.status NOT IN ('completed','graded'))
                  AND a.due_date IS NOT NULL AND a.due_date < ?
            """, (student_id, course_id, today_str))
            overdue = cursor.fetchone()[0] or 0

            inactive.append({
                "student_id": student_id,
                "name": name,
                "last_active": last_active,
                "days_inactive": days_inactive,
                "overdue_assignments": overdue,
                "severity": "critical" if days_inactive >= 7 else "warning",
            })

    inactive.sort(key=lambda s: s["days_inactive"], reverse=True)
    return {"course_id": course_id, "threshold_days": threshold_days, "inactive_students": inactive}
