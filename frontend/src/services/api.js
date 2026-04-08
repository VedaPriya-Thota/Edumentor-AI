const BASE_URL = "http://127.0.0.1:8000";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export const api = {
  // ─── STUDENT: AI & QUIZ ────────────────────────────────────────────────────
  askDoubt: async (question, course_id = null) => {
    const res = await fetch(`${BASE_URL}/doubt/ask`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ question, ...(course_id ? { course_id } : {}) }),
    });
    return res.json();
  },

  generateQuiz: async (topic, difficulty = "easy", num_questions = 5) => {
    const res = await fetch(`${BASE_URL}/quiz/generate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ topic, difficulty, num_questions }),
    });
    return res.json();
  },

  submitQuiz: async (payload) => {
    const res = await fetch(`${BASE_URL}/quiz/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ─── STUDENT: ANALYTICS ────────────────────────────────────────────────────
  getAnalytics: async () => {
    const res = await fetch(`${BASE_URL}/analytics/progress`, { headers: getHeaders() });
    return res.json();
  },
  getGamification: async () => {
    const res = await fetch(`${BASE_URL}/analytics/gamification`, { headers: getHeaders() });
    return res.json();
  },
  getDailyGoal: async () => {
    const res = await fetch(`${BASE_URL}/analytics/daily-goal`, { headers: getHeaders() });
    return res.json();
  },
  getRecommendations: async () => {
    const res = await fetch(`${BASE_URL}/analytics/recommendations`, { headers: getHeaders() });
    return res.json();
  },
  getQuizHistory: async () => {
    const res = await fetch(`${BASE_URL}/analytics/quiz-history`, { headers: getHeaders() });
    return res.json();
  },
  getDoubtHistory: async () => {
    const res = await fetch(`${BASE_URL}/analytics/doubt-history`, { headers: getHeaders() });
    return res.json();
  },
  getPerformance: async () => {
    const res = await fetch(`${BASE_URL}/analytics/performance`, { headers: getHeaders() });
    return res.json();
  },
  getLeaderboard: async () => {
    const res = await fetch(`${BASE_URL}/analytics/leaderboard`, { headers: getHeaders() });
    return res.json();
  },
  getBadges: async () => {
    const res = await fetch(`${BASE_URL}/analytics/badges`, { headers: getHeaders() });
    return res.json();
  },
  getActivityHeatmap: async () => {
    const res = await fetch(`${BASE_URL}/analytics/heatmap`, { headers: getHeaders() });
    return res.json();
  },
  getStudentOverview: async () => {
    const res = await fetch(`${BASE_URL}/analytics/student-overview`, { headers: getHeaders() });
    return res.json();
  },
  getClassroomOverview: async (course_id) => {
    const res = await fetch(`${BASE_URL}/analytics/classroom-overview/${course_id}`, { headers: getHeaders() });
    return res.json();
  },
  getInactiveStudents: async (course_id, threshold_days = 3) => {
    const res = await fetch(`${BASE_URL}/analytics/inactive-students/${course_id}?threshold_days=${threshold_days}`, { headers: getHeaders() });
    return res.json();
  },

  // ─── COURSES ───────────────────────────────────────────────────────────────
  getCourses: async () => {
    const res = await fetch(`${BASE_URL}/course/list`, { headers: getHeaders() });
    return res.json();
  },
  getEnrolledCourses: async () => {
    const res = await fetch(`${BASE_URL}/course/enrolled`, { headers: getHeaders() });
    return res.json();
  },
  createCourse: async (data) => {
    const res = await fetch(`${BASE_URL}/course/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  enrollCourse: async (course_id) => {
    const res = await fetch(`${BASE_URL}/course/enroll`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ course_id }),
    });
    return res.json();
  },

  // ─── CLASSROOM: TOPICS ─────────────────────────────────────────────────────
  getTopics: async (course_id) => {
    const res = await fetch(`${BASE_URL}/classroom/topics/${course_id}`, { headers: getHeaders() });
    return res.json();
  },
  createTopic: async (data) => {
    const res = await fetch(`${BASE_URL}/classroom/topics`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ─── CLASSROOM: TOPIC COMMENTS ─────────────────────────────────────────────
  getTopicComments: async (topic_id) => {
    const res = await fetch(`${BASE_URL}/classroom/topic/${topic_id}/comments`, { headers: getHeaders() });
    return res.json();
  },
  addTopicComment: async (topic_id, text) => {
    const res = await fetch(`${BASE_URL}/classroom/topic/${topic_id}/comment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ topic_id, text }),
    });
    return res.json();
  },

  // ─── CLASSROOM: ASSIGNMENTS ────────────────────────────────────────────────
  getAssignments: async (course_id) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments/${course_id}`, { headers: getHeaders() });
    return res.json();
  },
  createAssignment: async (data) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  submitAssignment: async (assignment_id, data) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments/${assignment_id}/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getMySubmissions: async (course_id) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments/${course_id}/my-submissions`, {
      headers: getHeaders(),
    });
    return res.json();
  },
  getAllSubmissions: async (course_id) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments/${course_id}/submissions`, { headers: getHeaders() });
    return res.json();
  },
  gradeSubmission: async (submission_id, data) => {
    const res = await fetch(`${BASE_URL}/classroom/assignments/${submission_id}/grade`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ─── COURSE QUIZZES ────────────────────────────────────────────────────────
  createCourseQuiz: async (data) => {
    const res = await fetch(`${BASE_URL}/course-quiz/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  listCourseQuizzes: async (course_id) => {
    const res = await fetch(`${BASE_URL}/course-quiz/list/${course_id}`, { headers: getHeaders() });
    return res.json();
  },
  getCourseQuizResults: async (quiz_id) => {
    const res = await fetch(`${BASE_URL}/course-quiz/${quiz_id}/results`, { headers: getHeaders() });
    return res.json();
  },
  getCourseQuizQuestions: async (quiz_id) => {
    const res = await fetch(`${BASE_URL}/course-quiz/${quiz_id}`, { headers: getHeaders() });
    return res.json();
  },
  submitCourseQuizAttempt: async (quiz_id, data) => {
    const res = await fetch(`${BASE_URL}/course-quiz/${quiz_id}/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ─── COURSE ANALYTICS ──────────────────────────────────────────────────────
  getCourseLeaderboard: async (course_id) => {
    const res = await fetch(`${BASE_URL}/analytics/course-leaderboard/${course_id}`, { headers: getHeaders() });
    return res.json();
  },
  getCourseProgress: async (course_id) => {
    const res = await fetch(`${BASE_URL}/analytics/course-progress/${course_id}`, { headers: getHeaders() });
    return res.json();
  },

  // ─── PERSONAL REMINDERS ────────────────────────────────────────────────────
  getReminders: async () => {
    const res = await fetch(`${BASE_URL}/reminders/`, { headers: getHeaders() });
    return res.json();
  },
  createReminder: async (data) => {
    const res = await fetch(`${BASE_URL}/reminders/`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  updateReminder: async (id, data) => {
    const res = await fetch(`${BASE_URL}/reminders/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteReminder: async (id) => {
    const res = await fetch(`${BASE_URL}/reminders/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },
  getPendingTasks: async () => {
    const res = await fetch(`${BASE_URL}/reminders/pending`, { headers: getHeaders() });
    return res.json();
  },

  // ─── ENGAGEMENT ENFORCEMENT ────────────────────────────────────────────────
  heartbeat: async () => {
    try {
      const res = await fetch(`${BASE_URL}/engagement/heartbeat`, {
        method: "POST",
        headers: getHeaders(),
      });
      return res.json();
    } catch {
      return null; // heartbeat failures should never crash the UI
    }
  },
  getEngagementStatus: async () => {
    const res = await fetch(`${BASE_URL}/engagement/status`, { headers: getHeaders() });
    return res.json();
  },
  getNotifications: async (limit = 30) => {
    const res = await fetch(`${BASE_URL}/engagement/notifications?limit=${limit}`, { headers: getHeaders() });
    return res.json();
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`${BASE_URL}/engagement/notifications/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.json();
  },
  markAllNotificationsRead: async () => {
    const res = await fetch(`${BASE_URL}/engagement/notifications/read-all`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },
  getInstructorAlerts: async () => {
    const res = await fetch(`${BASE_URL}/engagement/instructor-alerts`, { headers: getHeaders() });
    return res.json();
  },
  resolveInstructorAlert: async (id) => {
    const res = await fetch(`${BASE_URL}/engagement/instructor-alerts/${id}/resolve`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.json();
  },

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  login: async (credentials) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Server error");
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },
  register: async (userData) => {
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Registration error");
      return data;
    } catch (err) {
      return { error: err.message };
    }
  },
};
