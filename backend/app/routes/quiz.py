from fastapi import APIRouter, Depends, HTTPException
from datetime import date
from app.models import QuizRequest, QuizSubmission
from app.llm import generate_quiz, generate_feedback
from app.database import conn
from app.auth import get_current_user

router = APIRouter(prefix="/quiz", tags=["Quiz"])


# -------------------------------
# GENERATE QUIZ
# -------------------------------
@router.post("/generate")
def create_quiz(data: QuizRequest, user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")

    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    quiz = generate_quiz(data.topic, data.num_questions, data.difficulty)

    return {
        "topic": data.topic,
        "quiz": quiz
    }


# -------------------------------
# SUBMIT QUIZ
# -------------------------------
@router.post("/submit")
def submit_quiz(data: QuizSubmission, user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")

    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    if len(data.answers) != len(data.correct_answers):
        raise HTTPException(status_code=400, detail="Mismatch in answers")

    correct = 0
    wrong = 0

    for user_ans, correct_ans in zip(data.answers, data.correct_answers):
        # Handle cases where user_ans might be None (null from frontend)
        u_ans = (user_ans or "").strip().lower()
        c_ans = (correct_ans or "").strip().lower()
        
        if u_ans == c_ans:
            correct += 1
        else:
            wrong += 1

    total = correct + wrong

    cursor = conn.cursor()

    # -------------------------------
    # STORE PERFORMANCE & HISTORY
    # -------------------------------
    cursor.execute(
        "INSERT INTO performance (student_id, topic, correct, wrong) VALUES (?, ?, ?, ?)",
        (student_id, data.topic, correct, wrong)
    )

    # Calculate percentage
    percentage = round((correct / total) * 100, 2) if total > 0 else 0

    # INSERT INTO quiz_history
    cursor.execute(
        "INSERT INTO quiz_history (student_id, topic, score, percentage, correct, wrong) VALUES (?, ?, ?, ?, ?, ?)",
        (student_id, data.topic, f"{correct}/{total}", percentage, correct, wrong)
    )
    conn.commit()

    # -------------------------------
    # GAMIFICATION
    # -------------------------------
    today = date.today()

    cursor.execute("SELECT xp, streak, last_active FROM gamification WHERE student_id = ?", (student_id,))
    row = cursor.fetchone()

    xp_gain = correct * 10

    if row:
        xp, streak, last_active = row

        if last_active and str(last_active) == str(today):
            new_streak = streak
        else:
            if last_active:
                diff = (today - date.fromisoformat(last_active)).days
                new_streak = streak + 1 if diff == 1 else 1
            else:
                new_streak = 1

        cursor.execute("""
            UPDATE gamification
            SET xp = ?, streak = ?, last_active = ?
            WHERE student_id = ?
        """, (xp + xp_gain, new_streak, today, student_id))

    else:
        cursor.execute("""
            INSERT INTO gamification (student_id, xp, streak, last_active)
            VALUES (?, ?, ?, ?)
        """, (student_id, xp_gain, 1, today))

    # -------------------------------
    # DAILY GOAL
    # -------------------------------
    today_str = str(today)

    cursor.execute("""
        SELECT xp_earned FROM daily_progress
        WHERE student_id = ? AND date = ?
    """, (student_id, today_str))

    row = cursor.fetchone()

    if row:
        cursor.execute("""
            UPDATE daily_progress
            SET xp_earned = xp_earned + ?
            WHERE student_id = ? AND date = ?
        """, (xp_gain, student_id, today_str))
    else:
        cursor.execute("""
            INSERT INTO daily_progress (student_id, date, xp_earned)
            VALUES (?, ?, ?)
        """, (student_id, today_str, xp_gain))

    conn.commit()

    feedback = generate_feedback(data.topic, correct, wrong)
    
    return {
        "student_id": student_id,
        "topic": data.topic,
        "total_questions": total,
        "correct": correct,
        "wrong": wrong,
        "score": f"{correct}/{total}",   # REQUIRED
        "percentage": round(percentage, 2),  # REQUIRED
        "feedback": feedback
    }