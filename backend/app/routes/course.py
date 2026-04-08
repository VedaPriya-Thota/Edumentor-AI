from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.models import CourseCreate, CourseEnroll
from app.auth import get_current_user

router = APIRouter(prefix="/course", tags=["Course"])

@router.get("/list")
def list_courses(user=Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM courses")
    rows = cursor.fetchall()
    
    # Check enrollment status for each course
    student_id = user.get("id") or user.get("user_id")
    cursor.execute("SELECT course_id FROM enrollments WHERE user_id = ?", (student_id,))
    enrolled_ids = [r[0] for r in cursor.fetchall()]

    courses = []
    for r in rows:
        courses.append({
            "id": r[0],
            "name": r[1],
            "code": r[2],
            "description": r[3],
            "instructor_id": r[4],
            "is_enrolled": r[0] in enrolled_ids
        })
    return courses

@router.post("/create")
def create_course(data: CourseCreate, user=Depends(get_current_user)):
    if user.get("role") != "instructor":
        raise HTTPException(status_code=403, detail="Only instructors can create courses")
    
    instructor_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO courses (name, code, description, instructor_id) VALUES (?, ?, ?, ?)",
            (data.name, data.code, data.description, instructor_id)
        )
        conn.commit()
        return {"message": "Course created successfully", "id": cursor.lastrowid}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Course already exists or invalid data")

@router.post("/enroll")
def enroll_course(data: CourseEnroll, user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    
    # Check if course exists
    cursor.execute("SELECT id FROM courses WHERE id = ?", (data.course_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        cursor.execute(
            "INSERT INTO enrollments (user_id, course_id, role) VALUES (?, ?, ?)",
            (user_id, data.course_id, user.get("role"))
        )
        conn.commit()
        return {"message": "Enrolled successfully"}
    except:
        raise HTTPException(status_code=400, detail="Already enrolled")

@router.get("/enrolled")
def get_enrolled_courses(user=Depends(get_current_user)):
    user_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.id, c.name, c.code, c.description, e.role 
        FROM courses c 
        JOIN enrollments e ON c.id = e.course_id 
        WHERE e.user_id = ?
    """, (user_id,))
    rows = cursor.fetchall()
    
    courses = []
    for r in rows:
        courses.append({
            "id": r[0],
            "name": r[1],
            "code": r[2],
            "description": r[3],
            "role": r[4]
        })
    return courses
