from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.models import ThreadCreate, ReplyCreate
from app.auth import get_current_user

router = APIRouter(prefix="/discussion", tags=["Discussion"])


# -------------------------------
# HELPER — verify enrollment
# -------------------------------
def _assert_enrolled(user_id: int, course_id: int):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?",
        (user_id, course_id)
    )
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not enrolled in this course")


# -------------------------------
# POST /discussion/thread
# Create a new thread (student or instructor)
# -------------------------------
@router.post("/thread")
def create_thread(data: ThreadCreate, user=Depends(get_current_user)):
    author_id = user.get("id") or user.get("user_id")
    _assert_enrolled(author_id, data.course_id)

    # Validate topic_id belongs to this course if provided
    if data.topic_id is not None:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM daily_topics WHERE id = ? AND course_id = ?",
            (data.topic_id, data.course_id)
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Topic not found in this course")

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO discussion_threads (course_id, topic_id, author_id, title, body)
        VALUES (?, ?, ?, ?, ?)
        """,
        (data.course_id, data.topic_id, author_id, data.title, data.body)
    )
    conn.commit()
    return {"message": "Thread created", "thread_id": cursor.lastrowid}


# -------------------------------
# GET /discussion/threads/{course_id}
# List all threads for a course — pinned threads first
# -------------------------------
@router.get("/threads/{course_id}")
def list_threads(course_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    _assert_enrolled(user_id, course_id)

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT dt.id, dt.title, dt.body, dt.is_pinned, dt.created_at,
               u.name AS author_name, u.role AS author_role,
               dt.topic_id,
               (SELECT COUNT(*) FROM discussion_replies dr WHERE dr.thread_id = dt.id) AS reply_count
        FROM discussion_threads dt
        JOIN users u ON dt.author_id = u.id
        WHERE dt.course_id = ?
        ORDER BY dt.is_pinned DESC, dt.created_at DESC
        """,
        (course_id,)
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "body": r[2],
            "is_pinned": bool(r[3]),
            "created_at": r[4],
            "author_name": r[5],
            "author_role": r[6],
            "topic_id": r[7],
            "reply_count": r[8]
        }
        for r in rows
    ]


# -------------------------------
# GET /discussion/thread/{thread_id}
# Get a single thread and all its replies
# -------------------------------
@router.get("/thread/{thread_id}")
def get_thread(thread_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT dt.id, dt.course_id, dt.topic_id, dt.title, dt.body,
               dt.is_pinned, dt.created_at,
               u.name AS author_name, u.role AS author_role
        FROM discussion_threads dt
        JOIN users u ON dt.author_id = u.id
        WHERE dt.id = ?
        """,
        (thread_id,)
    )
    thread = cursor.fetchone()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    course_id = thread[1]
    _assert_enrolled(user_id, course_id)

    # Fetch replies
    cursor.execute(
        """
        SELECT dr.id, dr.body, dr.is_endorsed, dr.created_at,
               u.name AS author_name, u.role AS author_role, dr.author_id
        FROM discussion_replies dr
        JOIN users u ON dr.author_id = u.id
        WHERE dr.thread_id = ?
        ORDER BY dr.is_endorsed DESC, dr.created_at ASC
        """,
        (thread_id,)
    )
    reply_rows = cursor.fetchall()

    replies = [
        {
            "id": r[0],
            "body": r[1],
            "is_endorsed": bool(r[2]),
            "created_at": r[3],
            "author_name": r[4],
            "author_role": r[5],
            "is_own": r[6] == user_id
        }
        for r in reply_rows
    ]

    return {
        "id": thread[0],
        "course_id": thread[1],
        "topic_id": thread[2],
        "title": thread[3],
        "body": thread[4],
        "is_pinned": bool(thread[5]),
        "created_at": thread[6],
        "author_name": thread[7],
        "author_role": thread[8],
        "replies": replies
    }


# -------------------------------
# POST /discussion/thread/{thread_id}/reply
# Post a reply to a thread
# -------------------------------
@router.post("/thread/{thread_id}/reply")
def post_reply(thread_id: int, data: ReplyCreate, user=Depends(get_current_user)):
    author_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()
    cursor.execute("SELECT course_id FROM discussion_threads WHERE id = ?", (thread_id,))
    thread = cursor.fetchone()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    _assert_enrolled(author_id, thread[0])

    cursor.execute(
        "INSERT INTO discussion_replies (thread_id, author_id, body) VALUES (?, ?, ?)",
        (thread_id, author_id, data.body)
    )
    conn.commit()
    return {"message": "Reply posted", "reply_id": cursor.lastrowid}


# -------------------------------
# PATCH /discussion/thread/{thread_id}/pin
# Instructor pins or unpins a thread
# -------------------------------
@router.patch("/thread/{thread_id}/pin")
def pin_thread(thread_id: int, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can pin threads")

    cursor = conn.cursor()
    cursor.execute("SELECT is_pinned FROM discussion_threads WHERE id = ?", (thread_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Thread not found")

    new_pinned = 0 if row[0] else 1
    cursor.execute(
        "UPDATE discussion_threads SET is_pinned = ? WHERE id = ?",
        (new_pinned, thread_id)
    )
    conn.commit()
    return {"message": "Thread pinned" if new_pinned else "Thread unpinned", "is_pinned": bool(new_pinned)}


# -------------------------------
# PATCH /discussion/reply/{reply_id}/endorse
# Instructor endorses a reply as the correct answer
# -------------------------------
@router.patch("/reply/{reply_id}/endorse")
def endorse_reply(reply_id: int, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can endorse replies")

    cursor = conn.cursor()
    cursor.execute("SELECT is_endorsed FROM discussion_replies WHERE id = ?", (reply_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Reply not found")

    new_endorsed = 0 if row[0] else 1
    cursor.execute(
        "UPDATE discussion_replies SET is_endorsed = ? WHERE id = ?",
        (new_endorsed, reply_id)
    )
    conn.commit()
    return {"message": "Reply endorsed" if new_endorsed else "Endorsement removed", "is_endorsed": bool(new_endorsed)}


# -------------------------------
# DELETE /discussion/thread/{thread_id}
# Author or instructor deletes a thread
# -------------------------------
@router.delete("/thread/{thread_id}")
def delete_thread(thread_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    role = user.get("role")

    cursor = conn.cursor()
    cursor.execute("SELECT author_id FROM discussion_threads WHERE id = ?", (thread_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Thread not found")

    if row[0] != user_id and role != "instructor":
        raise HTTPException(status_code=403, detail="Not authorized to delete this thread")

    # Cascade delete replies first
    cursor.execute("DELETE FROM discussion_replies WHERE thread_id = ?", (thread_id,))
    cursor.execute("DELETE FROM discussion_threads WHERE id = ?", (thread_id,))
    conn.commit()
    return {"message": "Thread deleted"}


# -------------------------------
# DELETE /discussion/reply/{reply_id}
# Author or instructor deletes a reply
# -------------------------------
@router.delete("/reply/{reply_id}")
def delete_reply(reply_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    role = user.get("role")

    cursor = conn.cursor()
    cursor.execute("SELECT author_id FROM discussion_replies WHERE id = ?", (reply_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Reply not found")

    if row[0] != user_id and role != "instructor":
        raise HTTPException(status_code=403, detail="Not authorized to delete this reply")

    cursor.execute("DELETE FROM discussion_replies WHERE id = ?", (reply_id,))
    conn.commit()
    return {"message": "Reply deleted"}
