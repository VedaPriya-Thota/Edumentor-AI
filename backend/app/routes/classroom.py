import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import conn
from app.models import (
    TopicCreate, AssignmentCreate, AssignmentStatusUpdate,
    AssignmentGrade, AssignmentSubmit, TopicCommentCreate,
)
from app.auth import get_current_user

router = APIRouter(prefix="/classroom", tags=["Classroom"])

# Directory for file uploads
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


# ─────────────────────────────────────────────────────────────────────────────
# TOPICS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/topics")
def create_topic(data: TopicCreate, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can post topics")

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO daily_topics (course_id, title, content) VALUES (?, ?, ?)",
        (data.course_id, data.title, data.content),
    )
    conn.commit()
    return {"message": "Topic posted successfully"}


@router.get("/topics/{course_id}")
def get_topics(course_id: int, user=Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, course_id, date, title, content FROM daily_topics WHERE course_id = ? ORDER BY date DESC",
        (course_id,),
    )
    rows = cursor.fetchall()
    return {
        "topics": [
            {
                "id": r[0], "course_id": r[1],
                "created_at": r[2], "title": r[3], "content": r[4],
            }
            for r in rows
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# TOPIC COMMENTS (per-topic doubt/discussion)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/topic/{topic_id}/comments")
def get_topic_comments(topic_id: int, user=Depends(get_current_user)):
    """Return all comments on a specific topic."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT dr.id, u.name AS author, dr.body, dr.created_at, dr.author_id
        FROM discussion_replies dr
        JOIN discussion_threads dt ON dr.thread_id = dt.id
        JOIN users u ON dr.author_id = u.id
        WHERE dt.topic_id = ?
        ORDER BY dr.created_at ASC
        """,
        (topic_id,),
    )
    rows = cursor.fetchall()
    student_id = user.get("id") or user.get("user_id")
    return {
        "comments": [
            {
                "id": r[0], "author": r[1], "text": r[2],
                "created_at": r[3], "is_mine": r[4] == student_id,
            }
            for r in rows
        ]
    }


@router.post("/topic/{topic_id}/comment")
def add_topic_comment(topic_id: int, data: TopicCommentCreate, user=Depends(get_current_user)):
    """
    Add a comment/doubt to a topic.
    Automatically creates a discussion thread for the topic if one doesn't exist.
    """
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    # Fetch topic to get course_id
    cursor.execute("SELECT id, course_id, title FROM daily_topics WHERE id = ?", (topic_id,))
    topic = cursor.fetchone()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    course_id = topic[1]
    topic_title = topic[2]

    # Find or create a "comments" thread for this topic
    cursor.execute(
        "SELECT id FROM discussion_threads WHERE topic_id = ? AND course_id = ? LIMIT 1",
        (topic_id, course_id),
    )
    thread = cursor.fetchone()
    if thread:
        thread_id = thread[0]
    else:
        cursor.execute(
            """
            INSERT INTO discussion_threads (course_id, topic_id, author_id, title, body)
            VALUES (?, ?, ?, ?, ?)
            """,
            (course_id, topic_id, student_id, f"Discussion: {topic_title}", "Auto-created thread"),
        )
        conn.commit()
        thread_id = cursor.lastrowid

    # Insert reply
    cursor.execute(
        "INSERT INTO discussion_replies (thread_id, author_id, body) VALUES (?, ?, ?)",
        (thread_id, student_id, data.text),
    )
    conn.commit()
    reply_id = cursor.lastrowid

    # Log engagement event
    try:
        from app.routes.engagement import record_event
        record_event(student_id, "topic_view", course_id=course_id, ref_id=topic_id)
    except Exception:
        pass

    return {
        "comment": {
            "id": reply_id,
            "author": user.get("name", "You"),
            "text": data.text,
            "created_at": None,
            "is_mine": True,
        }
    }


# Also expose the frontend URL pattern: /discussion/topic/{topic_id}
# and /discussion/comment  (used by the existing StudentClassroom.jsx)
# These are aliases to the same logic registered under a different prefix in discussion.py.
# We add them here so classroom.py stays self-contained.

@router.get("/discussion/topic/{topic_id}")
def get_topic_comments_alt(topic_id: int, user=Depends(get_current_user)):
    return get_topic_comments(topic_id, user)


@router.post("/discussion/comment")
def add_topic_comment_alt(data: TopicCommentCreate, user=Depends(get_current_user)):
    return add_topic_comment(data.topic_id, data, user)


# ─────────────────────────────────────────────────────────────────────────────
# ASSIGNMENTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/assignments")
def create_assignment(data: AssignmentCreate, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can create assignments")

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO assignments (course_id, title, content, type, due_date) VALUES (?, ?, ?, ?, ?)",
        (data.course_id, data.title, data.content, data.type, data.due_date),
    )
    conn.commit()
    return {"message": "Assignment created successfully"}


@router.get("/assignments/{course_id}")
def get_assignments(course_id: int, user=Depends(get_current_user)):
    """Return assignments with this student's submission status attached."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT a.id, a.course_id, a.title, a.content, a.type, a.due_date,
               s.status, s.file_path, s.submitted_at, s.marks, s.feedback, s.id AS sub_id
        FROM assignments a
        LEFT JOIN assignment_submissions s
               ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.course_id = ?
        ORDER BY a.due_date ASC
        """,
        (student_id, course_id),
    )
    rows = cursor.fetchall()

    return {
        "assignments": [
            {
                "id": r[0], "course_id": r[1], "title": r[2], "content": r[3],
                "type": r[4], "due_date": r[5],
                "status": r[6] or "pending",
                "file_path": r[7], "submitted_at": r[8],
                "grade": r[9], "feedback": r[10], "submission_id": r[11],
            }
            for r in rows
        ]
    }


@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    data: AssignmentSubmit,
    user=Depends(get_current_user),
):
    """
    Student submits a text answer for an assignment.
    Also logs an engagement event.
    """
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    cursor.execute("SELECT id, course_id FROM assignments WHERE id = ?", (assignment_id,))
    res = cursor.fetchone()
    if not res:
        raise HTTPException(status_code=404, detail="Assignment not found")
    course_id = res[1]

    try:
        cursor.execute(
            """
            INSERT INTO assignment_submissions (assignment_id, student_id, file_path, status)
            VALUES (?, ?, ?, 'completed')
            ON CONFLICT(assignment_id, student_id)
            DO UPDATE SET file_path = excluded.file_path, status = 'completed',
                          submitted_at = CURRENT_TIMESTAMP
            """,
            (assignment_id, student_id, data.text),
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Submission failed: {e}")

    # Log engagement event
    try:
        from app.routes.engagement import record_event
        record_event(student_id, "assignment_submit", course_id=course_id, ref_id=assignment_id)
    except Exception:
        pass

    return {
        "message": "Assignment submitted successfully",
        "assignment_id": assignment_id,
        "status": "submitted",
        "submitted_at": None,
    }


@router.get("/assignments/{course_id}/my-submissions")
def get_my_submissions(course_id: int, user=Depends(get_current_user)):
    """Return this student's own submissions for all assignments in a course."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT s.id, s.assignment_id, s.status, s.submitted_at, s.marks, s.feedback
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ? AND a.course_id = ?
        """,
        (student_id, course_id),
    )
    rows = cursor.fetchall()

    return {
        "submissions": [
            {
                "id": r[0], "assignment_id": r[1], "status": r[2],
                "submitted_at": r[3], "grade": r[4], "feedback": r[5],
            }
            for r in rows
        ]
    }


@router.post("/assignments/{assignment_id}/upload")
async def upload_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    student_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()
    cursor.execute("SELECT type, course_id FROM assignments WHERE id = ?", (assignment_id,))
    res = cursor.fetchone()
    if not res or res[0] != "writing":
        raise HTTPException(status_code=400, detail="Not a writing assignment")
    course_id = res[1]

    safe_filename = f"{student_id}_{assignment_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        cursor.execute(
            """
            INSERT INTO assignment_submissions (assignment_id, student_id, file_path, status)
            VALUES (?, ?, ?, 'completed')
            ON CONFLICT(assignment_id, student_id)
            DO UPDATE SET file_path = ?, status = 'completed', submitted_at = CURRENT_TIMESTAMP
            """,
            (assignment_id, student_id, file_path, file_path),
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Upload failed")

    try:
        from app.routes.engagement import record_event
        record_event(student_id, "assignment_submit", course_id=course_id, ref_id=assignment_id)
    except Exception:
        pass

    return {"message": "File uploaded successfully", "file_path": file_path}


# ─────────────────────────────────────────────────────────────────────────────
# GRADING
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/assignments/{submission_id}/grade")
def grade_submission(submission_id: int, data: AssignmentGrade, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can grade submissions")

    cursor = conn.cursor()
    cursor.execute("SELECT id, student_id FROM assignment_submissions WHERE id = ?", (submission_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found")

    student_id = row[1]
    cursor.execute(
        "UPDATE assignment_submissions SET marks = ?, feedback = ?, status = 'graded' WHERE id = ?",
        (data.marks, data.feedback, submission_id),
    )

    # Notify the student that their work was graded
    if data.feedback:
        try:
            from app.database import conn as _conn
            _conn.cursor().execute(
                """
                INSERT INTO student_notifications
                    (student_id, type, title, message, ref_id, priority)
                VALUES (?, 'instructor_feedback', ?, ?, ?, 1)
                """,
                (
                    student_id,
                    "📝 Assignment Graded",
                    f"Your assignment was graded: {data.marks}/100. Feedback: {data.feedback}",
                    submission_id,
                ),
            )
        except Exception:
            pass

    conn.commit()
    return {"message": "Submission graded", "marks": data.marks, "feedback": data.feedback}


@router.get("/assignments/{course_id}/submissions")
def get_all_submissions(course_id: int, user=Depends(get_current_user)):
    """Instructor view: all submissions for a course."""
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can view all submissions")

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT s.id, a.title, u.name AS student_name, s.status,
               s.file_path, s.submitted_at, s.marks, s.feedback
        FROM assignment_submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        WHERE a.course_id = ?
        ORDER BY a.title, s.submitted_at DESC
        """,
        (course_id,),
    )
    rows = cursor.fetchall()

    return [
        {
            "submission_id": r[0], "assignment_title": r[1], "student_name": r[2],
            "status": r[3], "file_path": r[4], "submitted_at": r[5],
            "marks": r[6], "feedback": r[7],
        }
        for r in rows
    ]
