from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.models import UserRegister, UserLogin
from app.auth import get_current_user, hash_password, verify_password, create_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserRegister):
    hashed_password = hash_password(user.password)

    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            (user.name, user.email, hashed_password, user.role)
        )
        conn.commit()
        return {"message": "User registered successfully"}
    except:
        raise HTTPException(status_code=400, detail="User already exists")


@router.post("/login")
def login(user: UserLogin):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    db_user = cursor.fetchone()

    print("DB USER:", db_user)

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(user.password, db_user[3]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token_data = {
    "id": db_user[0],   # NOT user_id
    "email": db_user[2],
    "role": db_user[4]
} 
    print("TOKEN DATA:", token_data)

    token = create_token(token_data)

    return {"access_token": token}


@router.get("/me")
def me(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")

    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email FROM users WHERE id = ?", (student_id,))
    row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": row[0],
        "name": row[1],
        "email": row[2]
    }