from fastapi import APIRouter, Depends, HTTPException
from app.models import DoubtRequest
from app.llm import ask_doubt
from app.database import conn
from app.auth import get_current_user

router = APIRouter(prefix="/doubt", tags=["Doubt"])

@router.post("/ask")
def ask(data: DoubtRequest, user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")

    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    answer = ask_doubt(data.question)

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO doubts (student_id, question, answer) VALUES (?, ?, ?)",
        (student_id, data.question, answer)
    )
    conn.commit()

    return {
        "question": data.question,
        "answer": answer
    }