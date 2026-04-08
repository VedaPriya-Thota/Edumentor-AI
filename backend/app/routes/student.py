from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.auth import get_current_user

router = APIRouter(prefix="/student", tags=["Student"])

@router.get("/profile")
def get_profile(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")

    if not student_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    cursor = conn.cursor()
    cursor.execute("SELECT name, email, role FROM users WHERE id = ?", (student_id,))
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "name": row[0],
        "email": row[1],
        "role": row[2]
    }
