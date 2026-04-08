/**
 * AI Enhancement API Client
 * =========================
 * Thin wrapper for the /ai/* endpoints.
 * Kept separate from api.js to make the AI layer easy to locate,
 * mock in tests, or disable entirely.
 *
 * Every call returns the raw JSON from the backend.
 * Callers should check `result.ai_available === false` and degrade
 * gracefully — never crash because AI is unavailable.
 */

const BASE_URL = "http://127.0.0.1:8000";

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

/**
 * Wrap every fetch so network errors return the same
 * { ai_available: false, reason: string } sentinel.
 */
async function safePost(path, body = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ai_available: false, reason: data.detail || "Request failed" };
    return data;
  } catch (err) {
    return { ai_available: false, reason: err.message };
  }
}

async function safeGet(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) return { ai_available: false, reason: data.detail || "Request failed" };
    return data;
  } catch (err) {
    return { ai_available: false, reason: err.message };
  }
}

export const aiApi = {
  /**
   * Get AI-generated hints for a specific assignment.
   * @param {number} assignmentId
   * @param {string|null} studentQuestion  Optional question the student wants to ask
   * @returns {{ ai_available: bool, hints: string }}
   */
  getAssignmentHint: (assignmentId, studentQuestion = null) =>
    safePost(`/ai/assignment/${assignmentId}/hint`, {
      student_question: studentQuestion || undefined,
    }),

  /**
   * Generate a quiz draft for instructor review.
   * Returns questions in the same format as the core quiz system.
   * @param {{ topic, num_questions, difficulty, course_context }} params
   * @returns {{ ai_available: bool, questions: Array, topic: string }}
   */
  draftQuiz: ({ topic, num_questions = 5, difficulty = "medium", course_context = null }) =>
    safePost("/ai/quiz/draft", { topic, num_questions, difficulty, course_context }),

  /**
   * Generate a personalised nudge message for an inactive student.
   * Instructor-only. Returns a draft message to review/send.
   * @param {number} studentId
   * @param {number|null} courseId
   * @returns {{ ai_available: bool, message: string, student_name: string }}
   */
  generateNudge: (studentId, courseId = null) =>
    safePost(`/ai/nudge/${studentId}`, { student_id: studentId, course_id: courseId }),

  /**
   * Get AI-powered personalised learning recommendations for the current student.
   * @returns {{ ai_available: bool, recommendations: Array }}
   */
  getRecommendations: () =>
    safeGet("/ai/recommendations"),

  /**
   * Ask AI to evaluate a student submission and suggest marks + feedback.
   * Returns a SUGGESTION only — call api.gradeSubmission() to persist.
   * Instructor-only.
   * @param {number} submissionId
   * @returns {{ ai_available: bool, suggested_marks, confidence, feedback, strengths, improvements }}
   */
  evaluateSubmission: (submissionId) =>
    safePost(`/ai/submission/${submissionId}/evaluate`),

  /**
   * Summarize the discussion thread attached to a topic.
   * @param {number} topicId
   * @returns {{ ai_available: bool, summary, key_points, common_questions, resolved, comment_count }}
   */
  summarizeTopic: (topicId) =>
    safePost(`/ai/topic/${topicId}/summarize`),
};
