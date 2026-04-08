import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { aiApi } from "../services/aiApi";
import {
  BookOpen, ClipboardList, HelpCircle, Trophy, BarChart2,
  ChevronLeft, ChevronDown, ChevronUp, MessageSquare, Send,
  Calendar, CheckCircle2, Clock, AlertCircle, Upload,
  Medal, TrendingUp, FileText, Zap, User, RefreshCw, Sparkles, Lightbulb,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "topics",      label: "Topics",      icon: BookOpen },
  { key: "assignments", label: "Assignments",  icon: ClipboardList },
  { key: "quizzes",     label: "Quizzes",      icon: HelpCircle },
  { key: "leaderboard", label: "Leaderboard",  icon: Trophy },
  { key: "progress",    label: "Progress",     icon: BarChart2 },
];

function statusColor(status) {
  if (!status) return { bg: "#1f2937", text: "#9ca3af", label: "Pending" };
  if (status === "submitted") return { bg: "rgba(16,185,129,0.12)", text: "#34d399", label: "Submitted" };
  if (status === "graded")    return { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", label: "Graded" };
  if (status === "late")      return { bg: "rgba(239,68,68,0.12)", text: "#f87171", label: "Late" };
  return { bg: "#1f2937", text: "#9ca3af", label: status };
}

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

// ─── Topic Row ────────────────────────────────────────────────────────────────

function TopicRow({ topic, courseId }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [posting, setPosting] = useState(false);
  const commentsEndRef = useRef(null);

  // AI: discussion summary
  const [aiSummary, setAiSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    const res = await aiApi.summarizeTopic(topic.id);
    setAiSummary(res);
    setSummarizing(false);
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api.getTopicComments(topic.id);
      setComments(res.comments || res || []);
    } catch { setComments([]); }
    finally { setLoadingComments(false); }
  };

  const handleExpand = () => {
    setOpen((v) => !v);
    if (!open) loadComments();
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await api.addTopicComment(topic.id, newComment.trim());
      if (!res.error) {
        setComments((prev) => [...prev, res.comment || { text: newComment, author: "You", created_at: new Date().toISOString() }]);
        setNewComment("");
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  let userName = "You";
  try {
    const payload = JSON.parse(atob(localStorage.getItem("access_token").split(".")[1]));
    if (payload.name) userName = payload.name;
  } catch (_) {}

  return (
    <div
      style={{
        borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(18,18,28,0.7)", overflow: "hidden", transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={handleExpand}
        style={{
          width: "100%", textAlign: "left", padding: "1rem 1.25rem",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <BookOpen size={14} style={{ color: "#a78bfa" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.88rem" }}>{topic.title}</p>
          <p style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>
            {topic.created_at ? new Date(topic.created_at).toLocaleDateString() : ""}
          </p>
        </div>
        {open ? <ChevronUp size={14} style={{ color: "#6b7280" }} /> : <ChevronDown size={14} style={{ color: "#6b7280" }} />}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem" }}>
          {/* Topic content */}
          {topic.content && (
            <div
              style={{
                marginBottom: "1.25rem", padding: "0.875rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                fontSize: "0.85rem", color: "#d1d5db", lineHeight: 1.65, whiteSpace: "pre-wrap",
              }}
            >
              {topic.content}
            </div>
          )}

          {/* Comments section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MessageSquare size={13} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9ca3af" }}>
                  Doubts & Discussion
                </span>
              </div>
              {comments.length >= 3 && (
                <button
                  onClick={handleSummarize}
                  disabled={summarizing}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
                    background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                    color: "#a78bfa", cursor: summarizing ? "wait" : "pointer",
                    opacity: summarizing ? 0.7 : 1,
                  }}
                >
                  <Sparkles size={11} />
                  {summarizing ? "Summarizing…" : "AI Summary"}
                </button>
              )}
            </div>

            {/* AI Summary Panel */}
            {aiSummary && (
              <div style={{
                marginBottom: "0.75rem", padding: "0.875rem 1rem", borderRadius: 10,
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
              }}>
                {aiSummary.ai_available === false ? (
                  <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                    AI summary unavailable: {aiSummary.reason}
                  </p>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: "0.5rem" }}>
                      <Sparkles size={11} style={{ color: "#a78bfa" }} />
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        AI Discussion Summary
                      </span>
                      <button onClick={() => setAiSummary(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem" }}>×</button>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#d1d5db", lineHeight: 1.55, marginBottom: aiSummary.key_points?.length ? "0.5rem" : 0 }}>
                      {aiSummary.summary}
                    </p>
                    {aiSummary.key_points?.length > 0 && (
                      <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1rem" }}>
                        {aiSummary.key_points.map((kp, i) => (
                          <li key={i} style={{ fontSize: "0.76rem", color: "#9ca3af", marginBottom: 2 }}>{kp}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}

            {loadingComments ? (
              <p style={{ fontSize: "0.78rem", color: "#6b7280", padding: "0.5rem 0" }}>Loading…</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {comments.length === 0 && (
                  <p style={{ fontSize: "0.78rem", color: "#4b5563", padding: "0.5rem 0" }}>
                    No comments yet. Be the first to ask a doubt!
                  </p>
                )}
                {comments.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.6rem 0.875rem", borderRadius: 8,
                      background: c.is_mine || c.author === userName
                        ? "rgba(139,92,246,0.1)"
                        : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                      <User size={11} style={{ color: "#6b7280", marginTop: 1 }} />
                      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#9ca3af" }}>
                        {c.author || c.student_name || "Student"}
                      </span>
                      {c.created_at && (
                        <span style={{ fontSize: "0.65rem", color: "#4b5563", marginLeft: "auto" }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#d1d5db" }}>{c.text || c.content || c.message}</p>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}

            {/* Comment input */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                placeholder="Ask a doubt or leave a comment…"
                className="form-control"
                style={{ flex: 1, fontSize: "0.8rem", height: 36, padding: "0 0.75rem" }}
              />
              <button
                onClick={handlePostComment}
                disabled={posting || !newComment.trim()}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: "none",
                  background: posting || !newComment.trim() ? "#1f2937" : "linear-gradient(135deg, #9333ea, #6366f1)",
                  color: "#fff", cursor: posting || !newComment.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: posting || !newComment.trim() ? "none" : "0 2px 10px rgba(139,92,246,0.35)",
                }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

function AssignmentRow({ assignment, submission, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AI: assignment hint
  const [hintPanel, setHintPanel] = useState(false);
  const [hintQuestion, setHintQuestion] = useState("");
  const [hint, setHint] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  const fetchHint = async () => {
    setLoadingHint(true);
    const res = await aiApi.getAssignmentHint(assignment.id, hintQuestion || null);
    setHint(res);
    setLoadingHint(false);
  };

  const overdue = isOverdue(assignment.due_date);
  const st = statusColor(submission?.status);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(assignment.id, { text });
    setText("");
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <div
      style={{
        borderRadius: 12, border: `1px solid ${overdue && !submission ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
        background: "rgba(18,18,28,0.7)", overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", padding: "1rem 1.25rem",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: overdue && !submission ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {overdue && !submission
            ? <AlertCircle size={14} style={{ color: "#f87171" }} />
            : <FileText size={14} style={{ color: "#60a5fa" }} />}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.88rem" }}>{assignment.title}</p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: 3 }}>
            {assignment.due_date && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem", color: overdue && !submission ? "#f87171" : "#6b7280" }}>
                <Calendar size={10} />
                <span>Due {new Date(assignment.due_date).toLocaleDateString()}</span>
              </div>
            )}
            {assignment.type && (
              <span style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "capitalize" }}>{assignment.type}</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
              background: st.bg, color: st.text,
            }}
          >
            {st.label}
          </span>
          {open ? <ChevronUp size={14} style={{ color: "#6b7280" }} /> : <ChevronDown size={14} style={{ color: "#6b7280" }} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem" }}>
          {assignment.content && (
            <div
              style={{
                marginBottom: "1rem", padding: "0.875rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", fontSize: "0.85rem",
                color: "#d1d5db", lineHeight: 1.65,
              }}
            >
              {assignment.content}
            </div>
          )}

          {/* AI Hint Panel */}
          {(!submission || submission.status === "pending") && (
            <div style={{ marginBottom: "1rem" }}>
              <button
                onClick={() => { setHintPanel(v => !v); setHint(null); setHintQuestion(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
                  background: hintPanel ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                  border: hintPanel ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  color: hintPanel ? "#fbbf24" : "#9ca3af", cursor: "pointer",
                }}
              >
                <Lightbulb size={11} />
                {hintPanel ? "Hide AI Hints" : "Get AI Hint"}
              </button>

              {hintPanel && (
                <div style={{
                  marginTop: "0.6rem", padding: "0.875rem", borderRadius: 10,
                  background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)",
                }}>
                  <p style={{ fontSize: "0.72rem", color: "#d97706", fontWeight: 600, marginBottom: "0.5rem" }}>
                    AI Hints — Socratic guidance without the answer
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      value={hintQuestion}
                      onChange={e => setHintQuestion(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") fetchHint(); }}
                      placeholder="Optional: what are you stuck on?"
                      style={{
                        flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: "0.78rem",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "#f3f4f6", outline: "none",
                      }}
                    />
                    <button
                      onClick={fetchHint}
                      disabled={loadingHint}
                      style={{
                        padding: "6px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
                        background: loadingHint ? "#1f2937" : "linear-gradient(135deg, #d97706, #b45309)",
                        color: "#fde68a", border: "none", cursor: loadingHint ? "wait" : "pointer",
                        boxShadow: loadingHint ? "none" : "0 2px 10px rgba(217,119,6,0.3)",
                      }}
                    >
                      {loadingHint ? "…" : "Get Hints"}
                    </button>
                  </div>
                  {hint && (
                    hint.ai_available === false ? (
                      <p style={{ fontSize: "0.78rem", color: "#9ca3af" }}>AI unavailable: {hint.reason}</p>
                    ) : (
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.6 }}>
                        {hint.hints}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* If graded, show grade */}
          {submission?.status === "graded" && (
            <div
              style={{
                marginBottom: "1rem", padding: "0.875rem", borderRadius: 8,
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <p style={{ fontSize: "0.82rem", color: "#a78bfa", fontWeight: 600, marginBottom: 4 }}>
                Grade: {submission.grade ?? "—"} / 100
              </p>
              {submission.feedback && (
                <p style={{ fontSize: "0.8rem", color: "#c4b5fd" }}>{submission.feedback}</p>
              )}
            </div>
          )}

          {/* Submission form */}
          {!submission || submission.status === "pending" ? (
            <div>
              <label className="form-label">Your Answer / Submission</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Write your answer here…"
                className="form-control"
                style={{ resize: "vertical", fontSize: "0.85rem" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                    background: submitting || !text.trim() ? "#1f2937" : "linear-gradient(135deg, #9333ea, #6366f1)",
                    boxShadow: submitting || !text.trim() ? "none" : "0 4px 16px rgba(139,92,246,0.4)",
                    color: "#fff", border: "none",
                    cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Upload size={13} />
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "0.75rem", borderRadius: 8,
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <CheckCircle2 size={14} style={{ color: "#34d399" }} />
              <p style={{ fontSize: "0.82rem", color: "#6ee7b7" }}>
                Submitted on {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : "—"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quiz Attempt Modal ────────────────────────────────────────────────────────

function QuizAttemptModal({ quiz, onClose, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getCourseQuizQuestions(quiz.id)
      .then((r) => {
        const qs = r.questions || r || [];
        setQuestions(qs);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitCourseQuizAttempt(quiz.id, {
        answers: Object.values(answers),
        correct_answers: questions.map((q) => q.correct_answer),
        quiz_id: quiz.id,
      });
      setResult(res);
      setSubmitted(true);
      onComplete && onComplete(res);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
    >
      <div
        className="glass-panel"
        style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{quiz.title}</h3>
            {!submitted && questions.length > 0 && (
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
                Question {current + 1} of {questions.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1.25rem" }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {loading && <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>Loading questions…</p>}

          {!loading && questions.length === 0 && (
            <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
              Quiz questions are not available yet. Try again later.
            </p>
          )}

          {/* Result screen */}
          {submitted && result && (
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div
                style={{
                  width: 80, height: 80, borderRadius: "50%", margin: "0 auto 1rem",
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Trophy size={32} style={{ color: "#fff" }} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>
                Quiz Complete!
              </h3>
              <p style={{ fontSize: "2rem", fontWeight: 800, color: "#a78bfa", marginBottom: "0.25rem" }}>
                {result.score ?? result.percentage ?? "—"}%
              </p>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                {result.correct ?? "—"} / {questions.length} correct
              </p>
              {result.xp_earned > 0 && (
                <div
                  style={{
                    marginTop: "1rem", padding: "0.75rem 1.25rem", borderRadius: 10,
                    background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Zap size={14} style={{ color: "#fbbf24" }} />
                  <span style={{ fontSize: "0.85rem", color: "#fbbf24", fontWeight: 600 }}>
                    +{result.xp_earned} XP earned!
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  marginTop: "1.5rem", display: "block", width: "100%",
                  padding: "10px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600,
                  background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                  color: "#fff", border: "none", cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* Question screen */}
          {!submitted && !loading && questions.length > 0 && (
            <div>
              {/* Progress bar */}
              <div style={{ height: 4, background: "#1f2937", borderRadius: 4, marginBottom: "1.5rem", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%", borderRadius: 4, transition: "width 0.3s",
                    background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                    width: `${((current + 1) / questions.length) * 100}%`,
                  }}
                />
              </div>

              {(() => {
                const q = questions[current];
                return (
                  <div>
                    <p style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                      {q.question}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {(q.options || []).map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => setAnswers((a) => ({ ...a, [current]: opt }))}
                          style={{
                            textAlign: "left", padding: "0.75rem 1rem", borderRadius: 10,
                            border: `1px solid ${answers[current] === opt ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.07)"}`,
                            background: answers[current] === opt ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                            color: answers[current] === opt ? "#c084fc" : "#d1d5db",
                            cursor: "pointer", fontSize: "0.85rem", transition: "all 0.15s",
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {/* Navigation */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
                      <button
                        onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                        disabled={current === 0}
                        style={{
                          padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                          background: current === 0 ? "#111" : "rgba(255,255,255,0.07)",
                          color: current === 0 ? "#4b5563" : "#9ca3af",
                          border: "1px solid rgba(255,255,255,0.07)", cursor: current === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        ← Prev
                      </button>

                      {current < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                          disabled={answers[current] === undefined}
                          style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                            background: answers[current] !== undefined ? "rgba(139,92,246,0.2)" : "#111",
                            color: answers[current] !== undefined ? "#a78bfa" : "#4b5563",
                            border: "1px solid rgba(139,92,246,0.25)", cursor: answers[current] !== undefined ? "pointer" : "not-allowed",
                          }}
                        >
                          Next →
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={!allAnswered || submitting}
                          style={{
                            padding: "8px 20px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                            background: allAnswered && !submitting ? "linear-gradient(90deg, #7c3aed, #4f46e5)" : "#1f2937",
                            color: "#fff", border: "none",
                            cursor: allAnswered && !submitting ? "pointer" : "not-allowed",
                          }}
                        >
                          {submitting ? "Submitting…" : "Submit Quiz"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentClassroom({ course, onBack }) {
  const [activeTab, setActiveTab] = useState("topics");
  const [topics, setTopics] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [quizzes, setQuizzes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (!course?.id) return;
    setLoading(true);

    const loadAll = async () => {
      try {
        const [topicsRes, assignmentsRes, quizzesRes] = await Promise.all([
          api.getTopics(course.id),
          api.getAssignments(course.id),
          api.listCourseQuizzes(course.id),
        ]);
        setTopics(topicsRes.topics || topicsRes || []);
        setAssignments(assignmentsRes.assignments || assignmentsRes || []);
        setQuizzes(quizzesRes.quizzes || quizzesRes || []);

        // Load my submissions
        const subsRes = await api.getMySubmissions(course.id).catch(() => ({ submissions: [] }));
        const subsMap = {};
        (subsRes.submissions || subsRes || []).forEach((s) => {
          subsMap[s.assignment_id] = s;
        });
        setSubmissions(subsMap);
      } catch (err) {
        console.error("Classroom load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [course?.id]);

  useEffect(() => {
    if (activeTab === "leaderboard" && leaderboard.length === 0) {
      api.getCourseLeaderboard(course.id)
        .then((r) => setLeaderboard(r.leaderboard || r || []))
        .catch(() => setLeaderboard([]));
    }
    if (activeTab === "progress" && !progress) {
      api.getCourseProgress(course.id)
        .then((r) => setProgress(r))
        .catch(() => setProgress({}));
    }
  }, [activeTab, course?.id]);

  const handleSubmitAssignment = async (assignment_id, data) => {
    const res = await api.submitAssignment(assignment_id, data);
    if (res.error || res.detail) {
      showToast(res.detail || res.error || "Submission failed", "error");
    } else {
      showToast("Assignment submitted successfully!");
      setSubmissions((prev) => ({
        ...prev,
        [assignment_id]: { ...res, status: "submitted", submitted_at: new Date().toISOString() },
      }));
    }
  };

  if (!course) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <p className="text-gray-400">No course selected.</p>
      </div>
    );
  }

  const pendingCount = assignments.filter((a) => !submissions[a.id]).length;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", top: 24, right: 24, zIndex: 9999,
            padding: "12px 20px", borderRadius: 10,
            background: toast.type === "error" ? "#7f1d1d" : "#064e3b",
            border: `1px solid ${toast.type === "error" ? "#f87171" : "#34d399"}33`,
            color: toast.type === "error" ? "#fca5a5" : "#6ee7b7",
            fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Quiz attempt modal */}
      {activeQuiz && (
        <QuizAttemptModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onComplete={() => { /* could refresh leaderboard */ }}
        />
      )}

      {/* Back + Header */}
      <div className="pt-4 mb-6">
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            color: "#6b7280", fontSize: "0.82rem", marginBottom: "0.75rem",
            padding: 0,
          }}
        >
          <ChevronLeft size={14} /> Back to Courses
        </button>

        <div
          style={{
            padding: "1.25rem 1.5rem", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.15))",
            border: "1px solid rgba(139,92,246,0.2)",
            display: "flex", alignItems: "center", gap: "1.25rem",
          }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <BookOpen size={22} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>{course.name}</h1>
            <p style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: 2 }}>
              {course.code} · {topics.length} topics · {assignments.length} assignments
              {pendingCount > 0 && (
                <span style={{ marginLeft: 8, color: "#f87171", fontWeight: 600 }}>
                  · {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
              background: activeTab === key ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
              color: activeTab === key ? "#a78bfa" : "#6b7280",
              border: activeTab === key ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}
          >
            <Icon size={13} />
            {label}
            {key === "assignments" && pendingCount > 0 && (
              <span
                style={{
                  padding: "1px 6px", borderRadius: 10, fontSize: "0.65rem",
                  background: "#f87171", color: "#fff", fontWeight: 700,
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: "30vh" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280" }}>
            <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.85rem" }}>Loading…</span>
          </div>
        </div>
      ) : (
        <>
          {/* TOPICS TAB */}
          {activeTab === "topics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {topics.length === 0 ? (
                <div
                  style={{
                    textAlign: "center", padding: "3rem",
                    border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 14,
                  }}
                >
                  <BookOpen size={32} style={{ color: "#374151", margin: "0 auto 0.75rem" }} />
                  <p className="text-gray-400">No topics published yet.</p>
                </div>
              ) : (
                topics.map((t) => <TopicRow key={t.id} topic={t} courseId={course.id} />)
              )}
            </div>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === "assignments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {assignments.length === 0 ? (
                <div
                  style={{
                    textAlign: "center", padding: "3rem",
                    border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 14,
                  }}
                >
                  <ClipboardList size={32} style={{ color: "#374151", margin: "0 auto 0.75rem" }} />
                  <p className="text-gray-400">No assignments posted yet.</p>
                </div>
              ) : (
                assignments.map((a) => (
                  <AssignmentRow
                    key={a.id}
                    assignment={a}
                    submission={submissions[a.id]}
                    onSubmit={handleSubmitAssignment}
                  />
                ))
              )}
            </div>
          )}

          {/* QUIZZES TAB */}
          {activeTab === "quizzes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {quizzes.length === 0 ? (
                <div
                  style={{
                    textAlign: "center", padding: "3rem",
                    border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 14,
                  }}
                >
                  <HelpCircle size={32} style={{ color: "#374151", margin: "0 auto 0.75rem" }} />
                  <p className="text-gray-400">No quizzes posted yet.</p>
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    style={{
                      padding: "1rem 1.25rem", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(18,18,28,0.7)",
                      display: "flex", alignItems: "center", gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                        background: "rgba(20,184,166,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <HelpCircle size={16} style={{ color: "#2dd4bf" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.88rem" }}>{quiz.title}</p>
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: 3 }}>
                        {quiz.due_date && (
                          <span style={{ fontSize: "0.7rem", color: "#6b7280", display: "flex", alignItems: "center", gap: 3 }}>
                            <Calendar size={10} /> Due {new Date(quiz.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {quiz.difficulty && (
                          <span style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "capitalize" }}>
                            {quiz.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveQuiz(quiz)}
                      style={{
                        padding: "7px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                        background: "linear-gradient(90deg, #0891b2, #0e7490)",
                        color: "#fff", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      <Zap size={12} /> Attempt
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LEADERBOARD TAB */}
          {activeTab === "leaderboard" && (
            <div>
              <h3 style={{ fontWeight: 700, color: "#fff", marginBottom: "1rem", fontSize: "0.95rem" }}>
                Course Leaderboard — {course.name}
              </h3>
              {leaderboard.length === 0 ? (
                <div
                  style={{
                    textAlign: "center", padding: "3rem",
                    border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 14,
                  }}
                >
                  <Trophy size={32} style={{ color: "#374151", margin: "0 auto 0.75rem" }} />
                  <p className="text-gray-400">No leaderboard data yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {leaderboard.map((student, i) => {
                    const medal = i === 0 ? "#eab308" : i === 1 ? "#94a3b8" : i === 2 ? "#c2410c" : null;
                    return (
                      <div
                        key={i}
                        style={{
                          padding: "0.875rem 1.25rem", borderRadius: 12,
                          background: "rgba(18,18,28,0.7)",
                          border: `1px solid ${medal ? `${medal}30` : "rgba(255,255,255,0.07)"}`,
                          display: "flex", alignItems: "center", gap: "0.875rem",
                        }}
                      >
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: medal ? `${medal}20` : "rgba(255,255,255,0.05)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: medal || "#6b7280", fontWeight: 700, fontSize: "0.82rem", flexShrink: 0,
                          }}
                        >
                          {i < 3 ? <Medal size={16} /> : i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: "#f3f4f6", fontSize: "0.88rem" }}>{student.name}</p>
                          <p style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                            {student.quizzes ?? 0} quizzes · {student.streak ?? 0} day streak
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontWeight: 700, color: medal || "#9ca3af", fontSize: "0.95rem" }}>
                            {student.score?.toLocaleString() ?? student.accuracy ?? "—"}
                          </p>
                          <p style={{ fontSize: "0.68rem", color: "#4b5563" }}>points</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PROGRESS TAB */}
          {activeTab === "progress" && (
            <div>
              <h3 style={{ fontWeight: 700, color: "#fff", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
                Your Progress — {course.name}
              </h3>

              {!progress ? (
                <div className="flex items-center justify-center" style={{ height: "20vh" }}>
                  <p className="text-gray-400 text-sm">Loading progress…</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                    {[
                      { label: "Topics Done", value: progress.topics_completed ?? topics.length, icon: <BookOpen size={14} style={{ color: "#a78bfa" }} />, color: "#a78bfa" },
                      { label: "Assignments", value: `${Object.values(submissions).filter(s => s).length} / ${assignments.length}`, icon: <ClipboardList size={14} style={{ color: "#60a5fa" }} />, color: "#60a5fa" },
                      { label: "Avg Score", value: `${progress.avg_score ?? "—"}%`, icon: <TrendingUp size={14} style={{ color: "#34d399" }} />, color: "#34d399" },
                      { label: "Quizzes", value: progress.quizzes_taken ?? 0, icon: <HelpCircle size={14} style={{ color: "#f9a8d4" }} />, color: "#f9a8d4" },
                    ].map(({ label, value, icon, color }) => (
                      <div
                        key={label}
                        style={{
                          padding: "1rem", borderRadius: 12,
                          background: "rgba(18,18,28,0.7)", border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.5rem" }}>{icon}<span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{label}</span></div>
                        <p style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  {progress.history?.length > 0 && (
                    <div
                      className="glass-panel"
                      style={{ padding: "1.25rem" }}
                    >
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "1rem" }}>
                        Score Trend
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={progress.history}>
                          <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
                            labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Assignment completion */}
                  {assignments.length > 0 && (
                    <div className="glass-panel" style={{ padding: "1.25rem" }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.5rem" }}>
                        Assignment Completion
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, height: 8, background: "#1f2937", borderRadius: 4, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%", borderRadius: 4,
                              background: "linear-gradient(90deg, #059669, #34d399)",
                              width: `${(Object.values(submissions).filter(Boolean).length / assignments.length) * 100}%`,
                              transition: "width 0.8s ease-out",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.78rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {Object.values(submissions).filter(Boolean).length} / {assignments.length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
