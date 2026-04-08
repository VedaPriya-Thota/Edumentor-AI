from pydantic import BaseModel
from typing import List, Optional

# -------------------------------
# AUTH MODELS
# -------------------------------
class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str


class UserLogin(BaseModel):
    email: str
    password: str


# -------------------------------
# COURSE MODELS
# -------------------------------
class CourseCreate(BaseModel):
    name: str
    code: str
    description: str

class CourseEnroll(BaseModel):
    course_id: int

# -------------------------------
# CLASSROOM MODELS
# -------------------------------
class TopicCreate(BaseModel):
    course_id: int
    title: str
    content: str

class AssignmentCreate(BaseModel):
    course_id: int
    title: str
    content: str
    type: str  # 'reading' or 'writing'
    due_date: str

class AssignmentStatusUpdate(BaseModel):
    status: str  # 'completed', 'pending'

# -------------------------------
# STUDENT MODEL
# -------------------------------
class Student(BaseModel):
    name: str


# -------------------------------
# DOUBT MODEL
# -------------------------------
class DoubtRequest(BaseModel):
    question: str
    course_id: int = None


# -------------------------------
# QUIZ MODELS
# -------------------------------
class QuizRequest(BaseModel):
    topic: str
    num_questions: int
    difficulty: str  # easy, medium, hard
    course_id: int = None


# -------------------------------
# QUIZ SUBMISSION MODEL
# -------------------------------
class QuizSubmission(BaseModel):
    topic: str
    answers: list
    correct_answers: list
    course_id: int = None


# -------------------------------
# COURSE QUIZ MODELS
# -------------------------------
class CourseQuizCreate(BaseModel):
    course_id: int
    title: str
    topic: str
    difficulty: str = "medium"       # 'easy' | 'medium' | 'hard'
    num_questions: int = 5
    due_date: Optional[str] = None


class CourseQuizSubmission(BaseModel):
    quiz_id: int
    answers: list
    correct_answers: list


# -------------------------------
# DISCUSSION MODELS
# -------------------------------
class ThreadCreate(BaseModel):
    course_id: int
    topic_id: Optional[int] = None   # None → course-level thread
    title: str
    body: str


class ReplyCreate(BaseModel):
    body: str


# -------------------------------
# ASSIGNMENT GRADING MODEL
# -------------------------------
class AssignmentGrade(BaseModel):
    marks: int
    feedback: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# ENGAGEMENT ENFORCEMENT MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class PersonalReminderCreate(BaseModel):
    """Student-created personal reminder."""
    title: str
    time: Optional[str] = None          # HH:MM format or None


class PersonalReminderUpdate(BaseModel):
    """Patch model — all fields optional."""
    title: Optional[str] = None
    time: Optional[str] = None
    completed: Optional[bool] = None


class AssignmentSubmit(BaseModel):
    """Student submitting an assignment (text answer)."""
    text: str


class TopicCommentCreate(BaseModel):
    """Student leaving a comment / doubt on a topic."""
    topic_id: int
    text: str
