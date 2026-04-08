from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
from app.database import conn

SECRET_KEY = "secret123"
ALGORITHM = "HS256"

security = HTTPBearer()

def hash_password(password: str):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain, hashed):
    try:
        if isinstance(hashed, str):
            hashed = hashed.encode('utf-8')
        return bcrypt.checkpw(plain.encode('utf-8'), hashed)
    except Exception as e:
        print("verify_password error:", e)
        return False


def create_token(data: dict):
    data_copy = data.copy()
    data_copy["exp"] = datetime.utcnow() + timedelta(hours=2)
    return jwt.encode(data_copy, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    print("RAW TOKEN:", token)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("DECODED PAYLOAD:", payload)   # 🔥 IMPORTANT
        return payload
    except JWTError as e:
        print("JWT ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid token")