import sqlite3

# Connect to database
conn = sqlite3.connect("students.db", check_same_thread=False)
conn.row_factory = sqlite3.Row   # ✅ IMPORTANT (dictionary-like access)

# Create a temporary cursor for initialization
cursor = conn.cursor()

# -------------------------------
# USERS TABLE (AUTH)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
)
""")

# -------------------------------
# COURSES TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    instructor_id INTEGER
)
""")

# SEED INITIAL COURSES
cursor.execute("INSERT OR IGNORE INTO courses (name, code, description) VALUES ('Machine Learning', 'ML101', 'Introduction to ML algorithms and models.')")
cursor.execute("INSERT OR IGNORE INTO courses (name, code, description) VALUES ('Operating Systems', 'OS202', 'Core concepts of OS kernel and management.')")

# -------------------------------
# ENROLLMENTS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course_id INTEGER,
    role TEXT,
    UNIQUE(user_id, course_id)
)
""")

# -------------------------------
# DAILY TOPICS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS daily_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    date TEXT DEFAULT (DATE('now')),
    title TEXT,
    content TEXT
)
""")

# -------------------------------
# ASSIGNMENTS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    title TEXT,
    content TEXT,
    type TEXT, -- 'reading' or 'writing'
    due_date TEXT
)
""")

# -------------------------------
# ASSIGNMENT SUBMISSIONS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER,
    student_id INTEGER,
    file_path TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed'
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
)
""")

# -------------------------------
# DOUBTS TABLE (UPDATED)
# -------------------------------
cursor.execute("PRAGMA table_info(doubts)")
columns = [column[1] for column in cursor.fetchall()]

if "course_id" not in columns:
    cursor.execute("ALTER TABLE doubts RENAME TO doubts_old")
    cursor.execute("""
    CREATE TABLE doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        course_id INTEGER,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    if "created_at" in columns:
        cursor.execute("INSERT INTO doubts (id, student_id, question, answer, created_at) SELECT id, student_id, question, answer, created_at FROM doubts_old")
    else:
        cursor.execute("INSERT INTO doubts (id, student_id, question, answer) SELECT id, student_id, question, answer FROM doubts_old")
    cursor.execute("DROP TABLE doubts_old")
else:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doubts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        course_id INTEGER,
        question TEXT,
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

# -------------------------------
# QUIZ HISTORY TABLE (UPDATED)
# -------------------------------
cursor.execute("PRAGMA table_info(quiz_history)")
columns = [column[1] for column in cursor.fetchall()]

if "course_id" not in columns:
    cursor.execute("ALTER TABLE quiz_history RENAME TO quiz_history_old")
    cursor.execute("""
    CREATE TABLE quiz_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        course_id INTEGER,
        topic TEXT,
        score TEXT,
        percentage REAL,
        correct INTEGER,
        wrong INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("INSERT INTO quiz_history (id, student_id, topic, score, percentage, correct, wrong, created_at) SELECT id, student_id, topic, score, percentage, correct, wrong, created_at FROM quiz_history_old")
    cursor.execute("DROP TABLE quiz_history_old")
else:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        course_id INTEGER,
        topic TEXT,
        score TEXT,
        percentage REAL,
        correct INTEGER,
        wrong INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

# -------------------------------
# PERFORMANCE TABLE
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    topic TEXT,
    correct INTEGER,
    wrong INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# ADD COLUMN IF IT DOES NOT EXIST (FOR UPDATES)
cursor.execute("PRAGMA table_info(performance)")
columns = [column[1] for column in cursor.fetchall()]
if "created_at" not in columns:
    # SQLite recreation pattern
    cursor.execute("ALTER TABLE performance RENAME TO performance_old")
    cursor.execute("""
    CREATE TABLE performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        topic TEXT,
        correct INTEGER,
        wrong INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("INSERT INTO performance (id, student_id, topic, correct, wrong) SELECT id, student_id, topic, correct, wrong FROM performance_old")
    cursor.execute("DROP TABLE performance_old")

cursor.execute("""
CREATE TABLE IF NOT EXISTS gamification (
    student_id INTEGER PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_active DATE
)
""")
cursor.execute("""
CREATE TABLE IF NOT EXISTS daily_progress (
    student_id INTEGER,
    date TEXT,
    xp_earned INTEGER DEFAULT 0
)
""")

# -------------------------------
# COURSE QUIZZES TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS course_quizzes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id   INTEGER NOT NULL,
    created_by  INTEGER NOT NULL,
    title       TEXT NOT NULL,
    topic       TEXT NOT NULL,
    difficulty  TEXT DEFAULT 'medium',
    questions   TEXT NOT NULL,
    due_date    TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# -------------------------------
# COURSE QUIZ SUBMISSIONS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS course_quiz_submissions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id      INTEGER NOT NULL,
    student_id   INTEGER NOT NULL,
    score        TEXT,
    percentage   REAL,
    correct      INTEGER,
    wrong        INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, student_id)
)
""")

# -------------------------------
# DISCUSSION THREADS TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS discussion_threads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id  INTEGER NOT NULL,
    topic_id   INTEGER,
    author_id  INTEGER NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    is_pinned  INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# -------------------------------
# DISCUSSION REPLIES TABLE (NEW)
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS discussion_replies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id   INTEGER NOT NULL,
    author_id   INTEGER NOT NULL,
    body        TEXT NOT NULL,
    is_endorsed INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# -------------------------------
# SAFE COLUMN ADDITIONS (ALTER)
# -------------------------------

# daily_topics → attachment_url
cursor.execute("PRAGMA table_info(daily_topics)")
dt_cols = [c[1] for c in cursor.fetchall()]
if "attachment_url" not in dt_cols:
    cursor.execute("ALTER TABLE daily_topics ADD COLUMN attachment_url TEXT")

# assignments → max_marks, is_graded
cursor.execute("PRAGMA table_info(assignments)")
a_cols = [c[1] for c in cursor.fetchall()]
if "max_marks" not in a_cols:
    cursor.execute("ALTER TABLE assignments ADD COLUMN max_marks INTEGER DEFAULT 100")
if "is_graded" not in a_cols:
    cursor.execute("ALTER TABLE assignments ADD COLUMN is_graded INTEGER DEFAULT 0")

# assignment_submissions → marks, feedback
cursor.execute("PRAGMA table_info(assignment_submissions)")
as_cols = [c[1] for c in cursor.fetchall()]
if "marks" not in as_cols:
    cursor.execute("ALTER TABLE assignment_submissions ADD COLUMN marks INTEGER")
if "feedback" not in as_cols:
    cursor.execute("ALTER TABLE assignment_submissions ADD COLUMN feedback TEXT")

# ═══════════════════════════════════════════════════════════════════════════════
# ENGAGEMENT ENFORCEMENT SYSTEM — NEW TABLES
# ═══════════════════════════════════════════════════════════════════════════════

# -------------------------------
# ENGAGEMENT EVENTS TABLE
# Lightweight audit log: every meaningful student action is recorded here.
# Used to compute days_since_last_action (different from last quiz / last_active).
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS engagement_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL,
    event_type  TEXT NOT NULL,
    -- 'login' | 'quiz_submit' | 'assignment_submit' | 'topic_view'
    -- 'doubt_asked' | 'course_quiz_submit' | 'checklist_tick'
    course_id   INTEGER,
    ref_id      INTEGER,        -- assignment_id / quiz_id / topic_id
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# -------------------------------
# STUDENT NOTIFICATIONS TABLE
# Persisted, per-student notification inbox.
# Types:
#   streak_warning       – streak at risk (inactive 1 day)
#   streak_lost          – streak was reduced
#   streak_frozen        – streak froze (no reduction penalty) for 1 day
#   overdue_assignment   – past due date, no submission
#   pending_quiz         – quiz due ≤ 1 day, not attempted
#   inactivity_reminder  – generic nudge after 3+ days inactive
#   missed_topic         – new topic posted, student hasn't visited
#   instructor_feedback  – grade / feedback received
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS student_notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    ref_id      INTEGER,
    course_id   INTEGER,
    priority    INTEGER DEFAULT 0,   -- 0=normal, 1=high, 2=critical
    is_read     INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Index for fast unread count queries
cursor.execute("""
CREATE INDEX IF NOT EXISTS idx_notif_student_unread
ON student_notifications (student_id, is_read)
""")

# -------------------------------
# INSTRUCTOR ALERTS TABLE
# Generated when a student's engagement falls below thresholds.
# Instructors see these in their dashboard.
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS instructor_alerts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    instructor_id  INTEGER NOT NULL,
    student_id     INTEGER NOT NULL,
    course_id      INTEGER NOT NULL,
    student_name   TEXT,
    alert_type     TEXT NOT NULL,
    -- 'inactivity' | 'overdue_assignment' | 'no_quiz_activity' | 'streak_dropped'
    message        TEXT NOT NULL,
    days_inactive  INTEGER DEFAULT 0,
    severity       TEXT DEFAULT 'warning',   -- 'info' | 'warning' | 'critical'
    is_resolved    INTEGER DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

# Unique constraint: one alert per student/course/type per day
cursor.execute("""
CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_alert_dedup
ON instructor_alerts (instructor_id, student_id, course_id, alert_type, date(created_at))
""")

# -------------------------------
# PERSONAL REMINDERS TABLE
# Student-created reminders (title + optional time).
# Replaces the stub in the old reminders route.
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS personal_reminders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL,
    title       TEXT NOT NULL,
    time        TEXT,           -- HH:MM or NULL
    completed   INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ENHANCEMENT — BADGE & HEATMAP TABLES
# ═══════════════════════════════════════════════════════════════════════════════

# -------------------------------
# STUDENT BADGES TABLE
# Stores which badges a student has earned and when.
# Badge computation is done in analytics.py; this table caches results
# so the frontend doesn't need to recompute them on every request.
# -------------------------------
cursor.execute("""
CREATE TABLE IF NOT EXISTS student_badges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL,
    badge_key   TEXT NOT NULL,        -- e.g. 'quiz_master', 'perfect_score'
    earned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, badge_key)
)
""")

# Index for fast per-student badge lookups
cursor.execute("""
CREATE INDEX IF NOT EXISTS idx_badges_student
ON student_badges (student_id)
""")

conn.commit()

# Do NOT export a global cursor!
# Routes should use 'conn.cursor()' locally for thread safety.
