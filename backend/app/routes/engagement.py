"""
Engagement Enforcement System — routes/engagement.py
=====================================================

Core concepts
-------------
1.  HEARTBEAT   — called on every page-load / login to update `last_active`
                  and run all engagement checks in one atomic pass.

2.  INACTIVITY  — measured in days since `gamification.last_active`.
                  Thresholds:
                      0 days  → active today          (no action)
                      1 day   → streak at risk          (warning notification)
                      2 days  → streak reduced by 1    (loss notification)
                      3+ days → streak reduced -1/day  + instructor alerted
                      7+ days → severity escalates to critical

3.  STREAK      — extends the existing quiz.py / course_quiz.py streak logic.
                  Heartbeat *reduces* streak on inactivity; quizzes *build* it.
                  Min streak = 0. Never negative.

4.  NOTIFICATIONS — generated once per day per type to avoid spam.
                  Stored in `student_notifications`.

5.  INSTRUCTOR ALERTS — generated for each enrolled course when a student
                  is inactive 3+ days. De-duplicated by day.

6.  PRIORITISED TASKS — `/engagement/status` returns pending work sorted by:
                  overdue (critical) → due today (high) → upcoming (normal)

Endpoints
---------
  POST /engagement/heartbeat                    student only
  GET  /engagement/status                       student only
  GET  /engagement/notifications                student only
  PATCH /engagement/notifications/{id}/read     student only
  POST /engagement/notifications/read-all       student only
  GET  /engagement/instructor-alerts            instructor only
  PATCH /engagement/instructor-alerts/{id}/resolve  instructor only
"""

from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException
from app.database import conn
from app.auth import get_current_user

router = APIRouter(prefix="/engagement", tags=["Engagement"])


# ─────────────────────────────────────────────────────────────────────────────
# PRIVATE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _days_inactive(last_active_str) -> int:
    """Return calendar days since last_active. None / empty → 999 (treat as very inactive)."""
    if not last_active_str:
        return 999
    try:
        la = date.fromisoformat(str(last_active_str))
        return (date.today() - la).days
    except ValueError:
        return 999


def _notification_exists_today(cursor, student_id: int, notif_type: str, ref_id=None) -> bool:
    """True if a notification of this type (and optional ref_id) was already created today."""
    today_str = str(date.today())
    if ref_id is not None:
        cursor.execute(
            """
            SELECT id FROM student_notifications
            WHERE student_id = ? AND type = ? AND ref_id = ?
              AND date(created_at) = ?
            """,
            (student_id, notif_type, ref_id, today_str),
        )
    else:
        cursor.execute(
            """
            SELECT id FROM student_notifications
            WHERE student_id = ? AND type = ?
              AND date(created_at) = ?
            """,
            (student_id, notif_type, today_str),
        )
    return cursor.fetchone() is not None


def _add_notification(cursor, student_id: int, notif_type: str, title: str,
                      message: str, ref_id=None, course_id=None, priority: int = 0):
    """Insert a notification unless a duplicate already exists today."""
    if _notification_exists_today(cursor, student_id, notif_type, ref_id):
        return
    cursor.execute(
        """
        INSERT INTO student_notifications
            (student_id, type, title, message, ref_id, course_id, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (student_id, notif_type, title, message, ref_id, course_id, priority),
    )


def _log_event(cursor, student_id: int, event_type: str, course_id=None, ref_id=None):
    cursor.execute(
        "INSERT INTO engagement_events (student_id, event_type, course_id, ref_id) VALUES (?,?,?,?)",
        (student_id, event_type, course_id, ref_id),
    )


def _process_streak_decay(cursor, student_id: int, days_inactive: int, current_streak: int) -> int:
    """
    Reduce streak based on inactivity. Called from heartbeat.

    Rules
    -----
    - days_inactive == 0  → no change  (already active today)
    - days_inactive == 1  → no reduction, just a warning
    - days_inactive >= 2  → reduce by (days_inactive - 1), capped so min = 0
      Each day beyond the first costs 1 streak point.
      e.g. 3 days inactive → lose 2 streak; 5 days → lose 4 streak.

    Returns the new streak value.
    """
    if days_inactive <= 1:
        return current_streak

    reduction = days_inactive - 1
    new_streak = max(0, current_streak - reduction)
    return new_streak


def _generate_inactivity_notifications(cursor, student_id: int, days_inactive: int, streak: int):
    """Create streak/inactivity notifications based on inactivity level."""
    if days_inactive == 1:
        _add_notification(
            cursor, student_id,
            "streak_warning",
            "⚠️ Streak at Risk!",
            f"You haven't been active today. Your {streak}-day streak will reduce tomorrow. Complete a quiz or assignment to keep it!",
            priority=1,
        )

    elif days_inactive == 2:
        loss = 1
        new_s = max(0, streak - loss)
        _add_notification(
            cursor, student_id,
            "streak_lost",
            "🔥 Streak Reduced",
            f"You missed a day. Your streak dropped from {streak + loss} → {new_s}. Come back today to stop the damage!",
            priority=2,
        )

    elif days_inactive >= 3:
        loss = days_inactive - 1
        new_s = max(0, streak)  # already updated by heartbeat before this runs
        _add_notification(
            cursor, student_id,
            "inactivity_reminder",
            f"😴 You've Been Away {days_inactive} Days",
            f"Your streak is now {new_s}. You have pending work waiting. Log back in to get back on track!",
            priority=2,
        )


def _generate_overdue_notifications(cursor, student_id: int, course_ids: list):
    """Notify student of overdue assignments (one notification per assignment per day)."""
    if not course_ids:
        return
    today_str = str(date.today())
    placeholders = ",".join("?" * len(course_ids))

    cursor.execute(
        f"""
        SELECT a.id, a.title, a.due_date, c.name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_submissions s
               ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.course_id IN ({placeholders})
          AND (s.status IS NULL OR s.status != 'completed')
          AND a.due_date IS NOT NULL AND a.due_date < ?
        """,
        [student_id] + course_ids + [today_str],
    )
    for row in cursor.fetchall():
        a_id, title, due_date, course_name = row
        days_overdue = (date.today() - date.fromisoformat(due_date)).days
        _add_notification(
            cursor, student_id,
            "overdue_assignment",
            f"📋 Overdue: {title}",
            f"This assignment in {course_name} was due {days_overdue} day(s) ago. Submit it as soon as possible!",
            ref_id=a_id,
            priority=2,
        )


def _generate_pending_quiz_notifications(cursor, student_id: int, course_ids: list):
    """Notify student of quizzes due within 24 hours that are not yet attempted."""
    if not course_ids:
        return
    tomorrow_str = str(date.today() + timedelta(days=1))
    today_str = str(date.today())
    placeholders = ",".join("?" * len(course_ids))

    cursor.execute(
        f"""
        SELECT cq.id, cq.title, cq.due_date, c.name
        FROM course_quizzes cq
        JOIN courses c ON cq.course_id = c.id
        LEFT JOIN course_quiz_submissions cqs
               ON cq.id = cqs.quiz_id AND cqs.student_id = ?
        WHERE cq.course_id IN ({placeholders})
          AND cqs.id IS NULL
          AND cq.due_date IS NOT NULL
          AND cq.due_date BETWEEN ? AND ?
        """,
        [student_id] + course_ids + [today_str, tomorrow_str],
    )
    for row in cursor.fetchall():
        q_id, title, due_date, course_name = row
        _add_notification(
            cursor, student_id,
            "pending_quiz",
            f"⏰ Quiz Due Soon: {title}",
            f"The quiz '{title}' in {course_name} is due by {due_date}. Attempt it now!",
            ref_id=q_id,
            priority=1,
        )


def _generate_instructor_alerts(cursor, student_id: int, student_name: str,
                                  days_inactive: int, course_ids: list):
    """Create instructor alerts for very inactive students (3+ days)."""
    if days_inactive < 3 or not course_ids:
        return

    severity = "critical" if days_inactive >= 7 else "warning"
    alert_type = "inactivity"
    message = (
        f"{student_name} has been inactive for {days_inactive} day(s). "
        f"Consider reaching out or reviewing their pending assignments."
    )

    placeholders = ",".join("?" * len(course_ids))
    # Get instructors for enrolled courses
    cursor.execute(
        f"""
        SELECT DISTINCT c.instructor_id, e.course_id
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND e.course_id IN ({placeholders})
          AND c.instructor_id IS NOT NULL
        """,
        [student_id] + course_ids,
    )
    pairs = cursor.fetchall()

    for instructor_id, course_id in pairs:
        # De-duplicate: one alert per (instructor, student, course, type) per day
        today_str = str(date.today())
        cursor.execute(
            """
            SELECT id FROM instructor_alerts
            WHERE instructor_id=? AND student_id=? AND course_id=?
              AND alert_type=? AND date(created_at)=?
            """,
            (instructor_id, student_id, course_id, alert_type, today_str),
        )
        if cursor.fetchone():
            continue

        cursor.execute(
            """
            INSERT INTO instructor_alerts
                (instructor_id, student_id, course_id, student_name,
                 alert_type, message, days_inactive, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (instructor_id, student_id, course_id, student_name,
             alert_type, message, days_inactive, severity),
        )


def _generate_overdue_assignment_instructor_alerts(cursor, student_id: int,
                                                    student_name: str, course_ids: list):
    """Alert instructors when a student has overdue assignments."""
    if not course_ids:
        return
    today_str = str(date.today())
    placeholders = ",".join("?" * len(course_ids))

    cursor.execute(
        f"""
        SELECT a.id, a.course_id, a.title, c.instructor_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_submissions s
               ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.course_id IN ({placeholders})
          AND (s.status IS NULL OR s.status != 'completed')
          AND a.due_date IS NOT NULL AND a.due_date < ?
          AND c.instructor_id IS NOT NULL
        """,
        [student_id] + course_ids + [today_str],
    )
    for row in cursor.fetchall():
        a_id, course_id, a_title, instructor_id = row
        cursor.execute(
            """
            SELECT id FROM instructor_alerts
            WHERE instructor_id=? AND student_id=? AND course_id=?
              AND alert_type='overdue_assignment' AND ref_id=? AND date(created_at)=?
            """,
            (instructor_id, student_id, course_id, a_id, today_str),
        )
        if cursor.fetchone():
            continue
        cursor.execute(
            """
            INSERT INTO instructor_alerts
                (instructor_id, student_id, course_id, student_name,
                 alert_type, message, days_inactive, severity, ref_id)
            VALUES (?, ?, ?, ?, 'overdue_assignment', ?, 0, 'warning', ?)
            """,
            (
                instructor_id, student_id, course_id, student_name,
                f"{student_name} has not submitted '{a_title}' (overdue).",
                a_id,
            ),
        )


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/heartbeat")
def heartbeat(user=Depends(get_current_user)):
    """
    Called on every page-load.  Does the following in one transaction:
      1. Updates gamification.last_active to today
      2. Applies streak decay for days of inactivity
      3. Generates notifications (streak warning, overdue, pending quiz)
      4. Generates instructor alerts if student is 3+ days inactive
      5. Logs an engagement event
    Returns the student's current engagement snapshot.
    """
    student_id = user.get("id") or user.get("user_id")
    student_name = user.get("name", "Student")
    today = date.today()
    today_str = str(today)

    cursor = conn.cursor()

    # ── 1. Fetch current gamification row ──────────────────────────────────
    cursor.execute(
        "SELECT xp, streak, last_active FROM gamification WHERE student_id = ?",
        (student_id,),
    )
    row = cursor.fetchone()

    if row:
        xp, streak, last_active_str = row[0], row[1], row[2]
    else:
        xp, streak, last_active_str = 0, 0, None
        cursor.execute(
            "INSERT INTO gamification (student_id, xp, streak, last_active) VALUES (?,?,?,?)",
            (student_id, 0, 0, today_str),
        )

    days_inactive = _days_inactive(last_active_str)

    # ── 2. Streak decay (only if last_active was NOT today already) ─────────
    new_streak = streak
    streak_changed = False

    if days_inactive > 0:
        new_streak = _process_streak_decay(cursor, student_id, days_inactive, streak)
        if new_streak != streak:
            streak_changed = True
        # Update last_active to today; streak updated below
        cursor.execute(
            "UPDATE gamification SET last_active = ?, streak = ? WHERE student_id = ?",
            (today_str, new_streak, student_id),
        )
    # If already active today → nothing to update for streak

    # ── 3. Enrolled courses ────────────────────────────────────────────────
    cursor.execute(
        "SELECT course_id FROM enrollments WHERE user_id = ? AND role = 'student'",
        (student_id,),
    )
    course_ids = [r[0] for r in cursor.fetchall()]

    # ── 4. Generate notifications ──────────────────────────────────────────
    _generate_inactivity_notifications(cursor, student_id, days_inactive, new_streak)
    _generate_overdue_notifications(cursor, student_id, course_ids)
    _generate_pending_quiz_notifications(cursor, student_id, course_ids)

    # ── 5. Instructor alerts ───────────────────────────────────────────────
    _generate_instructor_alerts(cursor, student_id, student_name, days_inactive, course_ids)
    _generate_overdue_assignment_instructor_alerts(cursor, student_id, student_name, course_ids)

    # ── 6. Log the event ───────────────────────────────────────────────────
    _log_event(cursor, student_id, "login")

    conn.commit()

    # ── 7. Return snapshot ─────────────────────────────────────────────────
    cursor.execute(
        "SELECT COUNT(*) FROM student_notifications WHERE student_id = ? AND is_read = 0",
        (student_id,),
    )
    unread_count = cursor.fetchone()[0] or 0

    return {
        "days_inactive": days_inactive,
        "streak": new_streak,
        "streak_changed": streak_changed,
        "xp": xp,
        "unread_notifications": unread_count,
        "engagement_level": (
            "active" if days_inactive == 0 else
            "at_risk" if days_inactive == 1 else
            "warning" if days_inactive <= 3 else
            "critical"
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────

@router.get("/status")
def engagement_status(user=Depends(get_current_user)):
    """
    Full engagement status for the current student.
    Returns:
      - Inactivity level + days
      - Streak health
      - Priority-sorted pending work (overdue → due today → upcoming)
      - Unread notification count
    """
    student_id = user.get("id") or user.get("user_id")
    today_str = str(date.today())
    tomorrow_str = str(date.today() + timedelta(days=1))
    week_str = str(date.today() + timedelta(days=7))

    cursor = conn.cursor()

    # Gamification
    cursor.execute(
        "SELECT xp, streak, last_active FROM gamification WHERE student_id = ?",
        (student_id,),
    )
    gam = cursor.fetchone()
    xp = gam[0] if gam else 0
    streak = gam[1] if gam else 0
    last_active = gam[2] if gam else None
    days_inactive = _days_inactive(last_active)

    # Enrolled courses
    cursor.execute(
        "SELECT course_id FROM enrollments WHERE user_id = ? AND role = 'student'",
        (student_id,),
    )
    course_ids = [r[0] for r in cursor.fetchall()]

    pending_assignments = []
    pending_quizzes = []

    if course_ids:
        placeholders = ",".join("?" * len(course_ids))

        # All pending/overdue assignments sorted by urgency
        cursor.execute(
            f"""
            SELECT a.id, a.title, a.due_date, a.course_id, c.name,
                   COALESCE(s.status,'pending') AS status
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            LEFT JOIN assignment_submissions s
                   ON a.id = s.assignment_id AND s.student_id = ?
            WHERE a.course_id IN ({placeholders})
              AND (s.status IS NULL OR s.status NOT IN ('completed'))
              AND (a.due_date IS NULL OR a.due_date >= date('now','-30 days'))
            ORDER BY
              CASE
                WHEN a.due_date IS NULL THEN 2
                WHEN a.due_date < ? THEN 0
                WHEN a.due_date = ? THEN 1
                ELSE 2
              END,
              a.due_date ASC
            """,
            [student_id] + course_ids + [today_str, today_str],
        )
        for r in cursor.fetchall():
            due = r[2]
            priority = "critical" if due and due < today_str else (
                "high" if due == today_str else "normal"
            )
            pending_assignments.append({
                "id": r[0], "title": r[1], "due_date": due,
                "course_id": r[3], "course_name": r[4],
                "status": r[5], "priority": priority,
            })

        # Pending quizzes (not attempted)
        cursor.execute(
            f"""
            SELECT cq.id, cq.title, cq.due_date, cq.course_id, c.name, cq.difficulty
            FROM course_quizzes cq
            JOIN courses c ON cq.course_id = c.id
            LEFT JOIN course_quiz_submissions cqs
                   ON cq.id = cqs.quiz_id AND cqs.student_id = ?
            WHERE cq.course_id IN ({placeholders})
              AND cqs.id IS NULL
              AND (cq.due_date IS NULL OR cq.due_date >= date('now','-7 days'))
            ORDER BY
              CASE
                WHEN cq.due_date IS NULL THEN 2
                WHEN cq.due_date < ? THEN 0
                WHEN cq.due_date = ? THEN 1
                ELSE 2
              END,
              cq.due_date ASC
            """,
            [student_id] + course_ids + [today_str, today_str],
        )
        for r in cursor.fetchall():
            due = r[2]
            priority = "critical" if due and due < today_str else (
                "high" if due == today_str else "normal"
            )
            pending_quizzes.append({
                "id": r[0], "title": r[1], "due_date": due,
                "course_id": r[3], "course_name": r[4],
                "difficulty": r[5], "priority": priority,
            })

    # Unread notifications
    cursor.execute(
        "SELECT COUNT(*) FROM student_notifications WHERE student_id = ? AND is_read = 0",
        (student_id,),
    )
    unread = cursor.fetchone()[0] or 0

    # Daily goal
    cursor.execute(
        "SELECT xp_earned FROM daily_progress WHERE student_id = ? AND date = ?",
        (student_id, today_str),
    )
    dp = cursor.fetchone()
    xp_today = dp[0] if dp else 0
    goal = 50
    daily_goal_met = xp_today >= goal

    overdue_count = (
        sum(1 for a in pending_assignments if a["priority"] == "critical") +
        sum(1 for q in pending_quizzes if q["priority"] == "critical")
    )

    return {
        "engagement": {
            "days_inactive": days_inactive,
            "level": (
                "active" if days_inactive == 0 else
                "at_risk" if days_inactive == 1 else
                "warning" if days_inactive <= 3 else "critical"
            ),
            "streak": streak,
            "xp": xp,
            "xp_today": xp_today,
            "daily_goal": goal,
            "daily_goal_met": daily_goal_met,
        },
        "summary": {
            "overdue_items": overdue_count,
            "pending_assignments": len(pending_assignments),
            "pending_quizzes": len(pending_quizzes),
            "unread_notifications": unread,
        },
        "pending_assignments": pending_assignments,
        "pending_quizzes": pending_quizzes,
    }


# ─────────────────────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(user=Depends(get_current_user), limit: int = 30):
    """Return the student's notification inbox, newest first."""
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, type, title, message, ref_id, course_id, priority, is_read, created_at
        FROM student_notifications
        WHERE student_id = ?
        ORDER BY is_read ASC, priority DESC, created_at DESC
        LIMIT ?
        """,
        (student_id, limit),
    )
    rows = cursor.fetchall()

    cursor.execute(
        "SELECT COUNT(*) FROM student_notifications WHERE student_id = ? AND is_read = 0",
        (student_id,),
    )
    unread_count = cursor.fetchone()[0] or 0

    return {
        "unread_count": unread_count,
        "notifications": [
            {
                "id": r[0], "type": r[1], "title": r[2], "message": r[3],
                "ref_id": r[4], "course_id": r[5], "priority": r[6],
                "is_read": bool(r[7]), "created_at": r[8],
            }
            for r in rows
        ],
    }


@router.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_notifications SET is_read = 1 WHERE id = ? AND student_id = ?",
        (notif_id, student_id),
    )
    conn.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(user=Depends(get_current_user)):
    student_id = user.get("id") or user.get("user_id")
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE student_notifications SET is_read = 1 WHERE student_id = ? AND is_read = 0",
        (student_id,),
    )
    conn.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────

@router.get("/instructor-alerts")
def instructor_alerts(user=Depends(get_current_user)):
    """
    Returns engagement alerts for the calling instructor's students.
    Filtered to courses where the instructor is the owner.
    """
    instructor_id = user.get("id") or user.get("user_id")
    role = user.get("role", "student")
    if role != "instructor":
        raise HTTPException(status_code=403, detail="Instructor access only")

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT ia.id, ia.student_id, ia.student_name, ia.course_id,
               c.name AS course_name, ia.alert_type, ia.message,
               ia.days_inactive, ia.severity, ia.is_resolved, ia.created_at
        FROM instructor_alerts ia
        JOIN courses c ON ia.course_id = c.id
        WHERE ia.instructor_id = ? AND ia.is_resolved = 0
        ORDER BY
          CASE ia.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
          ia.days_inactive DESC,
          ia.created_at DESC
        """,
        (instructor_id,),
    )
    rows = cursor.fetchall()

    # Summary counts
    by_type = {}
    for r in rows:
        by_type[r[5]] = by_type.get(r[5], 0) + 1

    return {
        "summary": {
            "total_alerts": len(rows),
            "by_type": by_type,
            "critical": sum(1 for r in rows if r[8] == "critical"),
        },
        "alerts": [
            {
                "id": r[0], "student_id": r[1], "student_name": r[2],
                "course_id": r[3], "course_name": r[4],
                "alert_type": r[5], "message": r[6],
                "days_inactive": r[7], "severity": r[8],
                "is_resolved": bool(r[9]), "created_at": r[10],
            }
            for r in rows
        ],
    }


@router.patch("/instructor-alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, user=Depends(get_current_user)):
    """Mark an instructor alert as resolved."""
    instructor_id = user.get("id") or user.get("user_id")
    role = user.get("role", "student")
    if role != "instructor":
        raise HTTPException(status_code=403, detail="Instructor access only")

    cursor = conn.cursor()
    cursor.execute(
        "UPDATE instructor_alerts SET is_resolved = 1 WHERE id = ? AND instructor_id = ?",
        (alert_id, instructor_id),
    )
    conn.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY: log an engagement event from other routes
# ─────────────────────────────────────────────────────────────────────────────

def record_event(student_id: int, event_type: str, course_id=None, ref_id=None):
    """
    Callable from other route modules (quiz.py, classroom.py, etc.) to
    append an engagement event without triggering full heartbeat logic.
    """
    cursor = conn.cursor()
    _log_event(cursor, student_id, event_type, course_id, ref_id)
    conn.commit()
