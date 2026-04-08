from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    student, doubt, quiz, auth, analytics,
    course, classroom, course_quiz, discussion, reminders, engagement,
    ai_enhance,
)

app = FastAPI(
    title="EduMentor AI",
    description="An AI-powered learning mentor for students",
    version="1.0.0"
)

# -------------------------------
# CONFIGURE CORS
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# ROUTES
# -------------------------------
# Core
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(doubt.router)
app.include_router(quiz.router)
app.include_router(analytics.router)

# Classroom Interaction System
app.include_router(course.router)
app.include_router(classroom.router)
app.include_router(course_quiz.router)
app.include_router(discussion.router)
app.include_router(reminders.router)

# Engagement Enforcement System
app.include_router(engagement.router)

# AI Enhancement Layer (optional — classroom AI hooks)
app.include_router(ai_enhance.router)


@app.get("/")
def home():
    return {"message": "EduMentor AI Backend is running 🚀"}
