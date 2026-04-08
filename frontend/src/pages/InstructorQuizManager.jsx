import { useEffect, useState } from "react";
import { api } from "../services/api";
import { aiApi } from "../services/aiApi";
import { HelpCircle, Plus, X, ChevronDown, ChevronUp, Trophy, Loader, CheckCircle, AlertCircle, Sparkles } from "lucide-react";

// ─── SHARED ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors";
const selectCls = inputCls + " cursor-pointer";

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── COURSE SELECTOR ──────────────────────────────────────────────────────────
function CourseSelector({ courses, selected, onSelect }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <label style={{ display: "block", fontSize: "0.65rem", fontWeight: 700, color: "rgba(139,92,246,0.6)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6rem" }}>Select Course</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {courses.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: 12,
              fontSize: "0.83rem",
              fontWeight: 600,
              border: selected?.id === c.id ? "1px solid rgba(139,92,246,0.45)" : "1px solid rgba(255,255,255,0.09)",
              background: selected?.id === c.id
                ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.12))"
                : "rgba(255,255,255,0.05)",
              color: selected?.id === c.id ? "#e9d5ff" : "#9ca3af",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: selected?.id === c.id ? "0 2px 12px rgba(139,92,246,0.2)" : "none",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DIFFICULTY BADGE ─────────────────────────────────────────────────────────
function DiffBadge({ d }) {
  const map = {
    easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    hard: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${map[d] || map.medium}`}>
      {d}
    </span>
  );
}

// ─── RESULTS PANEL ────────────────────────────────────────────────────────────
function ResultsPanel({ quizId, onClose }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCourseQuizResults(quizId)
      .then(data => setResults(data))
      .catch(() => setResults({ submissions: [] }))
      .finally(() => setLoading(false));
  }, [quizId]);

  const rankColor = (i) => {
    if (i === 0) return "text-yellow-400";
    if (i === 1) return "text-slate-300";
    if (i === 2) return "text-orange-500";
    return "text-gray-500";
  };

  return (
    <div className="border-t border-white/5 bg-white/[0.02] px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" /> Student Results
        </h4>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Collapse
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-500 text-sm gap-2">
          <Loader size={14} className="animate-spin" /> Loading results…
        </div>
      ) : results?.submissions?.length === 0 ? (
        <div className="text-center py-6 text-gray-600 text-sm border border-dashed border-white/5 rounded-xl">
          No submissions yet
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-1">
            <span className="col-span-2">Student</span>
            <span className="text-center">Score</span>
            <span className="text-center">Accuracy</span>
            <span className="text-center">Submitted</span>
          </div>
          {results.submissions.map((s, i) => (
            <div key={i} className="grid grid-cols-5 items-center px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
              <div className="col-span-2 flex items-center gap-2">
                <span className={`text-xs font-bold w-5 ${rankColor(i)}`}>#{i + 1}</span>
                <span className="text-sm text-white font-medium truncate">{s.student_name}</span>
              </div>
              <div className="text-center text-sm text-gray-300">{s.score}</div>
              <div className="text-center">
                <span className={`text-sm font-bold ${s.percentage >= 75 ? "text-emerald-400" : s.percentage >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {s.percentage}%
                </span>
              </div>
              <div className="text-center text-[10px] text-gray-600">
                {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
              </div>
            </div>
          ))}
          {/* Summary */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
            <span>Submitted: <span className="text-white font-semibold">{results.submissions.length}</span></span>
            <span>Avg: <span className="text-white font-semibold">
              {results.submissions.length
                ? Math.round(results.submissions.reduce((s, r) => s + r.percentage, 0) / results.submissions.length)
                : 0}%
            </span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InstructorQuizManager() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedResults, setExpandedResults] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", topic: "", difficulty: "medium", num_questions: 5, due_date: ""
  });

  // AI draft state
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftPreview, setAiDraftPreview] = useState(null);
  const [aiDraftError, setAiDraftError] = useState("");

  const handleAiDraft = async () => {
    if (!form.topic.trim()) { setAiDraftError("Enter a topic first."); return; }
    setAiDrafting(true);
    setAiDraftError("");
    setAiDraftPreview(null);
    const res = await aiApi.draftQuiz({
      topic: form.topic,
      num_questions: form.num_questions,
      difficulty: form.difficulty,
    });
    setAiDrafting(false);
    if (res.ai_available === false) {
      setAiDraftError(res.reason || "AI unavailable");
    } else {
      setAiDraftPreview(res.questions || []);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
    setAiDraftPreview(null);
    setAiDraftError("");
  };

  useEffect(() => {
    api.getCourses().then(data => {
      const list = Array.isArray(data) ? data : [];
      setCourses(list);
      if (list.length > 0) setSelectedCourse(list[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    api.listCourseQuizzes(selectedCourse.id)
      .then(data => setQuizzes(Array.isArray(data) ? data : []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await api.createCourseQuiz({ ...form, course_id: selectedCourse.id });
    setSaving(false);
    if (res.detail || res.error) { setError(res.detail || res.error); return; }
    closeModal();
    setForm({ title: "", topic: "", difficulty: "medium", num_questions: 5, due_date: "" });
    const updated = await api.listCourseQuizzes(selectedCourse.id);
    setQuizzes(Array.isArray(updated) ? updated : []);
  };

  const toggleResults = (quizId) => {
    setExpandedResults(prev => prev === quizId ? null : quizId);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quiz Manager</h1>
          <p className="page-subtitle">Create instructor-assigned quizzes and review student performance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!selectedCourse}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
          onMouseEnter={e => { if (selectedCourse) { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
        >
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      {/* COURSE SELECTOR */}
      {courses.length > 0 ? (
        <CourseSelector courses={courses} selected={selectedCourse} onSelect={(c) => { setSelectedCourse(c); setExpandedResults(null); }} />
      ) : (
        <div className="glass-panel p-6 text-center text-gray-500 text-sm mb-8">No courses found.</div>
      )}

      {/* QUIZ LIST */}
      {selectedCourse && (
        loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="glass-panel p-5 h-20 animate-pulse" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div
            className="p-14 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
              backdropFilter: "blur(24px)",
              border: "1.5px dashed rgba(139,92,246,0.2)",
              borderRadius: 20,
            }}
          >
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(139,92,246,0.12)", boxShadow: "0 0 28px rgba(139,92,246,0.22)" }}
            >
              <HelpCircle size={26} style={{ color: "#c084fc" }} />
            </div>
            <p className="font-semibold text-white mb-1.5" style={{ fontSize: "1rem" }}>No quizzes assigned yet</p>
            <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Create a quiz to test your students' understanding.</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
            >
              Create First Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map(q => {
              const isExpanded = expandedResults === q.id;
              const isOverdue = q.due_date && new Date(q.due_date) < new Date();
              return (
                <div key={q.id} className="glass-panel overflow-hidden">
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                      <HelpCircle size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-bold text-white">{q.title}</p>
                        <DiffBadge d={q.difficulty} />
                        {q.attempted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            RESULTS IN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span>Topic: <span className="text-gray-300">{q.topic}</span></span>
                        {q.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-gray-500"}`}>
                            Due: {q.due_date}
                            {isOverdue && " · Overdue"}
                          </span>
                        )}
                        <span>By: {q.instructor_name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleResults(q.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-300 font-semibold shrink-0"
                      style={{
                        background: isExpanded ? "rgba(234,179,8,0.12)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isExpanded ? "rgba(234,179,8,0.25)" : "rgba(255,255,255,0.08)"}`,
                        color: isExpanded ? "#fcd34d" : "#9ca3af",
                      }}
                      onMouseEnter={e => { if (!isExpanded) { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; } }}
                      onMouseLeave={e => { if (!isExpanded) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#9ca3af"; } }}
                    >
                      <Trophy size={13} />
                      Results
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <ResultsPanel quizId={q.id} onClose={() => setExpandedResults(null)} />
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CREATE QUIZ MODAL */}
      {showModal && (
        <Modal title="Create Course Quiz" onClose={closeModal}>
          <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <AlertCircle size={16} className="text-purple-400 mt-0.5 shrink-0" />
            <p className="text-xs text-purple-300 leading-relaxed">
              Questions are generated by AI based on the topic you enter. This may take a few seconds.
            </p>
          </div>
          <form onSubmit={handleCreate}>
            <Field label="Quiz Title">
              <input className={inputCls} placeholder="e.g. Week 3 Assessment" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </Field>
            <Field label="Topic for Question Generation">
              <input className={inputCls} placeholder="e.g. Gradient Descent, Backpropagation" value={form.topic}
                onChange={e => { setForm(f => ({ ...f, topic: e.target.value })); setAiDraftPreview(null); setAiDraftError(""); }} required />
            </Field>

            {/* ── AI DRAFT PREVIEW ─────────────────────────── */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleAiDraft}
                disabled={aiDrafting || !form.topic.trim()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: aiDrafting ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: aiDrafting ? "#6b7280" : "#a78bfa",
                  cursor: aiDrafting || !form.topic.trim() ? "not-allowed" : "pointer",
                }}
              >
                {aiDrafting ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {aiDrafting ? "Drafting preview…" : "Preview AI Questions"}
              </button>
              {aiDraftError && (
                <p className="text-xs text-red-400 mt-1">{aiDraftError}</p>
              )}
              {aiDraftPreview && aiDraftPreview.length > 0 && (
                <div
                  className="mt-2 p-3 rounded-xl overflow-y-auto"
                  style={{
                    maxHeight: 200, background: "rgba(139,92,246,0.06)",
                    border: "1px solid rgba(139,92,246,0.18)",
                  }}
                >
                  <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} /> AI Draft Preview — {aiDraftPreview.length} questions
                  </p>
                  {aiDraftPreview.map((q, i) => (
                    <div key={i} className="mb-2 pb-2 border-b border-white/5 last:border-0">
                      <p className="text-xs text-gray-300">{i + 1}. {q.question}</p>
                      {q.options?.length > 0 && (
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          Options: {q.options.join(" · ")}
                        </p>
                      )}
                      <p className="text-[10px] text-emerald-500 mt-0.5">✓ {q.correct_answer}</p>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-600 mt-1">
                    These questions will be auto-generated fresh when you click "Create Quiz".
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Difficulty">
                <select className={selectCls} value={form.difficulty}
                  onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
              <Field label="No. of Questions">
                <select className={selectCls} value={form.num_questions}
                  onChange={e => setForm(f => ({ ...f, num_questions: parseInt(e.target.value) }))}>
                  {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </Field>
            </div>
            <Field label="Due Date (optional)">
              <input type="date" className={inputCls} value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", color: "#fff", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}>
                {saving ? (<><Loader size={14} className="animate-spin" /> Generating…</>) : "Create Quiz"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
