import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.models import CourseQuizCreate, CourseQuizSubmission
from app.auth import get_current_user
from app.llm import generate_quiz

router = APIRouter(prefix="/course-quiz", tags=["Course Quiz"])


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
# POST /course-quiz/create
# Instructor creates a quiz assigned to a course
# -------------------------------
@router.post("/create")
def create_course_quiz(data: CourseQuizCreate, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can create course quizzes")

    instructor_id = user.get("id") or user.get("user_id")

    # Verify the instructor owns or is enrolled in the course
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM courses WHERE id = ?", (data.course_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Course not found")

    # Generate questions via LLM (same as routes/quiz.py)
    questions = generate_quiz(data.topic, data.num_questions, data.difficulty)
    questions_json = json.dumps(questions)

    cursor.execute(
        """
        INSERT INTO course_quizzes (course_id, created_by, title, topic, difficulty, questions, due_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (data.course_id, instructor_id, data.title, data.topic,
         data.difficulty, questions_json, data.due_date)
    )
    conn.commit()
    return {"message": "Course quiz created successfully", "quiz_id": cursor.lastrowid}


# -------------------------------
# GET /course-quiz/list/{course_id}
# List all quizzes for a course (enrolled users)
# -------------------------------
@router.get("/list/{course_id}")
def list_course_quizzes(course_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    _assert_enrolled(user_id, course_id)

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT cq.id, cq.title, cq.topic, cq.difficulty, cq.due_date, cq.created_at,
               u.name as instructor_name,
               cqs.submitted_at, cqs.percentage
        FROM course_quizzes cq
        JOIN users u ON cq.created_by = u.id
        LEFT JOIN course_quiz_submissions cqs
               ON cq.id = cqs.quiz_id AND cqs.student_id = ?
        WHERE cq.course_id = ?
        ORDER BY cq.created_at DESC
        """,
        (user_id, course_id)
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "title": r[1],
            "topic": r[2],
            "difficulty": r[3],
            "due_date": r[4],
            "created_at": r[5],
            "instructor_name": r[6],
            "attempted": r[7] is not None,
            "percentage": r[8]
        }
        for r in rows
    ]


# -------------------------------
# GET /course-quiz/{quiz_id}
# Fetch quiz questions (answers stripped) for a student
# -------------------------------
@router.get("/{quiz_id}")
def get_course_quiz(quiz_id: int, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM course_quizzes WHERE id = ?", (quiz_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course_id = row[1]
    _assert_enrolled(user_id, course_id)

    questions = json.loads(row[6])  # parse JSON blob

    # Strip correct_answer from each question for students
    if user.get("role") == "student":
        for q in questions:
            q.pop("correct_answer", None)
            q.pop("explanation", None)

    return {
        "id": row[0],
        "course_id": row[1],
        "title": row[3],
        "topic": row[4],
        "difficulty": row[5],
        "due_date": row[7],
        "questions": questions
    }


# -------------------------------
# POST /course-quiz/{quiz_id}/submit
# Student submits answers; scores written to multiple tables
# -------------------------------
@router.post("/{quiz_id}/submit")
def submit_course_quiz(quiz_id: int, data: CourseQuizSubmission, user=Depends(get_current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit quizzes")

    student_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()

    # Fetch quiz metadata
    cursor.execute("SELECT course_id, topic, questions FROM course_quizzes WHERE id = ?", (quiz_id,))
    quiz_row = cursor.fetchone()
    if not quiz_row:
        raise HTTPException(status_code=404, detail="Quiz not found")

    course_id, topic, questions_json = quiz_row
    _assert_enrolled(student_id, course_id)

    # Check already submitted
    cursor.execute(
        "SELECT id FROM course_quiz_submissions WHERE quiz_id = ? AND student_id = ?",
        (quiz_id, student_id)
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Already submitted this quiz")

    # Score
    answers = data.answers
    correct_answers = data.correct_answers
    correct = sum(1 for a, c in zip(answers, correct_answers) if str(a).strip().lower() == str(c).strip().lower())
    wrong = len(answers) - correct
    total = len(answers)
    percentage = round((correct / total) * 100, 2) if total else 0
    score_str = f"{correct}/{total}"

    today = str(date.today())

    # 1. Insert course_quiz_submissions
    cursor.execute(
        """
        INSERT INTO course_quiz_submissions (quiz_id, student_id, score, percentage, correct, wrong)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (quiz_id, student_id, score_str, percentage, correct, wrong)
    )

    # 2. Insert quiz_history (keeps global analytics working)
    cursor.execute(
        """
        INSERT INTO quiz_history (student_id, course_id, topic, score, percentage, correct, wrong)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (student_id, course_id, topic, score_str, percentage, correct, wrong)
    )

    # 3. Update performance table (weak-topic tracking)
    cursor.execute(
        "SELECT id FROM performance WHERE student_id = ? AND topic = ?",
        (student_id, topic)
    )
    existing = cursor.fetchone()
    if existing:
        cursor.execute(
            "UPDATE performance SET correct = correct + ?, wrong = wrong + ? WHERE student_id = ? AND topic = ?",
            (correct, wrong, student_id, topic)
        )
    else:
        cursor.execute(
            "INSERT INTO performance (student_id, topic, correct, wrong) VALUES (?, ?, ?, ?)",
            (student_id, topic, correct, wrong)
        )

    # 4. Award XP and update streak (gamification)
    xp_earned = correct * 10
    cursor.execute("SELECT xp, streak, last_active FROM gamification WHERE student_id = ?", (student_id,))
    game = cursor.fetchone()

    if game:
        new_xp = game[0] + xp_earned
        last_active = game[2]
        new_streak = game[1] + 1 if last_active != today else game[1]
        cursor.execute(
            "UPDATE gamification SET xp = ?, streak = ?, last_active = ? WHERE student_id = ?",
            (new_xp, new_streak, today, student_id)
        )
    else:
        cursor.execute(
            "INSERT INTO gamification (student_id, xp, streak, last_active) VALUES (?, ?, 1, ?)",
            (student_id, xp_earned, today)
        )

    # 5. Update daily_progress
    cursor.execute(
        "SELECT xp_earned FROM daily_progress WHERE student_id = ? AND date = ?",
        (student_id, today)
    )
    dp = cursor.fetchone()
    if dp:
        cursor.execute(
            "UPDATE daily_progress SET xp_earned = xp_earned + ? WHERE student_id = ? AND date = ?",
            (xp_earned, student_id, today)
        )
    else:
        cursor.execute(
            "INSERT INTO daily_progress (student_id, date, xp_earned) VALUES (?, ?, ?)",
            (student_id, today, xp_earned)
        )

    conn.commit()

    return {
        "score": score_str,
        "correct": correct,
        "wrong": wrong,
        "percentage": percentage,
        "xp_earned": xp_earned
    }


# -------------------------------
# GET /course-quiz/{quiz_id}/results
# Instructor sees all student submissions for a quiz
# -------------------------------
@router.get("/{quiz_id}/results")
def quiz_results(quiz_id: int, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can view results")

    cursor = conn.cursor()
    cursor.execute("SELECT id FROM course_quizzes WHERE id = ?", (quiz_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Quiz not found")

    cursor.execute(
        """
        SELECT u.name, cqs.score, cqs.percentage, cqs.correct, cqs.wrong, cqs.submitted_at
        FROM course_quiz_submissions cqs
        JOIN users u ON cqs.student_id = u.id
        WHERE cqs.quiz_id = ?
        ORDER BY cqs.percentage DESC
        """,
        (quiz_id,)
    )
    rows = cursor.fetchall()

    return {
        "quiz_id": quiz_id,
        "submissions": [
            {
                "student_name": r[0],
                "score": r[1],
                "percentage": r[2],
                "correct": r[3],
                "wrong": r[4],
                "submitted_at": r[5]
            }
            for r in rows
        ]
    }
