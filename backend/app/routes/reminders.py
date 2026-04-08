"""
reminders.py — combined personal reminders + system pending-tasks
=================================================================

Routes
------
  GET  /reminders/pending                   Aggregated system pending tasks (unchanged)
  GET  /reminders/                          Personal reminder list
  POST /reminders/                          Create personal reminder
  PATCH /reminders/{id}                     Update personal reminder (title/time/completed)
  DELETE /reminders/{id}                    Delete personal reminder
"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.auth import get_current_user
from app.models import PersonalReminderCreate, PersonalReminderUpdate

router = APIRouter(prefix="/reminders", tags=["Reminders"])


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM: Aggregated pending tasks
# (original behaviour preserved exactly)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pending")
def get_pending(user=Depends(get_current_user)):
    """
    Aggregated pending tasks for the current student:
      - Overdue / due-soon assignments not yet submitted
      - Course quizzes not yet attempted
      - Recent daily topics from the last 7 days
    """
    student_id = user.get("id") or user.get("user_id")
    today = str(date.today())
    week_ago = str(date.today() - timedelta(days=7))

    cursor = conn.cursor()

    # Enrolled course IDs
    cursor.execute(
        "SELECT course_id FROM enrollments WHERE user_id = ? AND role = 'student'",
        (student_id,)
    )
    course_ids = [r[0] for r in cursor.fetchall()]

    if not course_ids:
        return {
            "summary": {"pending_assignments": 0, "pending_quizzes": 0,
                        "overdue_items": 0, "recent_topics": 0},
            "pending_assignments": [],
            "pending_quizzes": [],
            "recent_topics": [],
        }

    placeholders = ",".join("?" * len(course_ids))

    # Assignments not yet submitted — not past due more than 30 days
    cursor.execute(
        f"""
        SELECT a.id, a.title, a.type, a.due_date, a.course_id, c.name AS course_name,
               COALESCE(s.status, 'pending') AS status
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_submissions s
               ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.course_id IN ({placeholders})
          AND (s.status IS NULL OR s.status != 'completed')
          AND (a.due_date IS NULL OR a.due_date >= date('now', '-30 days'))
        ORDER BY a.due_date ASC
        """,
        [student_id] + course_ids
    )
    assignment_rows = cursor.fetchall()

    pending_assignments = []
    for r in assignment_rows:
        due = r[3]
        overdue = due is not None and due < today
        pending_assignments.append({
            "assignment_id": r[0],
            "title": r[1],
            "type": r[2],
            "due_date": due,
            "course_id": r[4],
            "course_name": r[5],
            "status": r[6],
            "overdue": overdue,
        })

    # Course quizzes not yet attempted
    cursor.execute(
        f"""
        SELECT cq.id, cq.title, cq.topic, cq.difficulty, cq.due_date,
               cq.course_id, c.name AS course_name
        FROM course_quizzes cq
        JOIN courses c ON cq.course_id = c.id
        LEFT JOIN course_quiz_submissions cqs
               ON cq.id = cqs.quiz_id AND cqs.student_id = ?
        WHERE cq.course_id IN ({placeholders})
          AND cqs.id IS NULL
          AND (cq.due_date IS NULL OR cq.due_date >= date('now', '-7 days'))
        ORDER BY cq.due_date ASC
        """,
        [student_id] + course_ids
    )
    quiz_rows = cursor.fetchall()

    pending_quizzes = []
    for r in quiz_rows:
        due = r[4]
        overdue = due is not None and due < today
        pending_quizzes.append({
            "quiz_id": r[0],
            "title": r[1],
            "topic": r[2],
            "difficulty": r[3],
            "due_date": due,
            "course_id": r[5],
            "course_name": r[6],
            "overdue": overdue,
        })

    # Daily topics from last 7 days
    cursor.execute(
        f"""
        SELECT dt.id, dt.title, dt.date, dt.course_id, c.name AS course_name
        FROM daily_topics dt
        JOIN courses c ON dt.course_id = c.id
        WHERE dt.course_id IN ({placeholders})
          AND dt.date >= ?
        ORDER BY dt.date DESC
        """,
        course_ids + [week_ago]
    )
    topic_rows = cursor.fetchall()

    recent_topics = [
        {
            "topic_id": r[0],
            "title": r[1],
            "date": r[2],
            "course_id": r[3],
            "course_name": r[4],
        }
        for r in topic_rows
    ]

    overdue_count = (
        sum(1 for a in pending_assignments if a["overdue"]) +
        sum(1 for q in pending_quizzes if q["overdue"])
    )

    return {
        "summary": {
            "pending_assignments": len(pending_assignments),
            "pending_quizzes": len(pending_quizzes),
            "overdue_items": overdue_count,
            "recent_topics": len(recent_topics),
        },
        "pending_assignments": pending_assignments,
        "pending_quizzes": pending_quizzes,
        "recent_topics": recent_topics,
    }


# ─────────────────────────────────────────────────────────────────────────────
# PERSONAL REMINDERS — full CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/")
def list_reminders(user=Depends(get_current_user)):
    """Return all personal reminders for the current student, newest first."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, title, time, completed, created_at
        FROM personal_reminders
        WHERE student_id = ?
        ORDER BY completed ASC, created_at DESC
        """,
        (student_id,),
    )
    rows = cursor.fetchall()
    return {
        "reminders": [
            {
                "id": r[0], "title": r[1], "time": r[2],
                "completed": bool(r[3]), "created_at": r[4],
            }
            for r in rows
        ]
    }


@router.post("/")
def create_reminder(data: PersonalReminderCreate, user=Depends(get_current_user)):
    """Create a new personal reminder."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO personal_reminders (student_id, title, time) VALUES (?, ?, ?)",
        (student_id, data.title, data.time),
    )
    conn.commit()
    new_id = cursor.lastrowid
    return {
        "reminder": {
            "id": new_id,
            "title": data.title,
            "time": data.time,
            "completed": False,
        }
    }


@router.patch("/{reminder_id}")
def update_reminder(
    reminder_id: int,
    data: PersonalReminderUpdate,
    user=Depends(get_current_user),
):
    """Update title, time, or completed status of a personal reminder."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    # Verify ownership
    cursor.execute(
        "SELECT id FROM personal_reminders WHERE id = ? AND student_id = ?",
        (reminder_id, student_id),
    )
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Reminder not found")

    updates = []
    values = []
    if data.title is not None:
        updates.append("title = ?")
        values.append(data.title)
    if data.time is not None:
        updates.append("time = ?")
        values.append(data.time)
    if data.completed is not None:
        updates.append("completed = ?")
        values.append(1 if data.completed else 0)

    if not updates:
        return {"ok": True}

    values.append(reminder_id)
    cursor.execute(
        f"UPDATE personal_reminders SET {', '.join(updates)} WHERE id = ?",
        values,
    )
    conn.commit()
    return {"ok": True}


@router.delete("/{reminder_id}")
def delete_reminder(reminder_id: int, user=Depends(get_current_user)):
    """Delete a personal reminder."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM personal_reminders WHERE id = ? AND student_id = ?",
        (reminder_id, student_id),
    )
    conn.commit()
    return {"ok": True}
