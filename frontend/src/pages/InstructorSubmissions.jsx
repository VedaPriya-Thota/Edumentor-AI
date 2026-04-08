import { useEffect, useState } from "react";
import { api } from "../services/api";
import { aiApi } from "../services/aiApi";
import { FileText, CheckCircle, Clock, X, Star, ChevronDown, ChevronUp, AlertCircle, Sparkles, Loader } from "lucide-react";

// ─── SHARED ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
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

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
        <CheckCircle size={10} /> Submitted
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
      <Clock size={10} /> Pending
    </span>
  );
}

// ─── GRADE MODAL ──────────────────────────────────────────────────────────────
function GradeModal({ submission, onClose, onSave, aiSuggestion }) {
  const [marks, setMarks] = useState(submission.marks ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setMarks(aiSuggestion.suggested_marks ?? marks);
    setFeedback(aiSuggestion.feedback ?? feedback);
    setSuggestionApplied(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(marks);
    if (isNaN(val) || val < 0 || val > 100) { setError("Marks must be 0–100"); return; }
    setSaving(true);
    const res = await api.gradeSubmission(submission.submission_id, { marks: val, feedback });
    setSaving(false);
    if (res.detail || res.error) { setError(res.detail || res.error); return; }
    onSave({ ...submission, marks: val, feedback });
    onClose();
  };

  return (
    <Modal title={`Grade — ${submission.student_name}`} onClose={onClose}>
      <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-gray-500 mb-0.5">Assignment</p>
        <p className="text-sm font-semibold text-white">{submission.assignment_title}</p>
        {submission.file_path && (
          <p className="text-xs text-teal-400 mt-1 truncate">
            Submission: {submission.file_path.length > 80
              ? submission.file_path.slice(0, 80) + "…"
              : submission.file_path}
          </p>
        )}
      </div>

      {/* AI Suggestion Panel */}
      {aiSuggestion && aiSuggestion.ai_available !== false && (
        <div
          className="mb-4 p-3 rounded-xl"
          style={{
            background: suggestionApplied ? "rgba(16,185,129,0.08)" : "rgba(139,92,246,0.08)",
            border: suggestionApplied ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(139,92,246,0.25)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: suggestionApplied ? "#34d399" : "#a78bfa" }} />
              <span className="text-xs font-semibold" style={{ color: suggestionApplied ? "#34d399" : "#a78bfa" }}>
                AI Evaluation Suggestion
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: aiSuggestion.confidence === "high" ? "rgba(16,185,129,0.15)" : aiSuggestion.confidence === "medium" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)",
                  color: aiSuggestion.confidence === "high" ? "#34d399" : aiSuggestion.confidence === "medium" ? "#fbbf24" : "#f87171",
                }}
              >
                {aiSuggestion.confidence} confidence
              </span>
            </div>
            {!suggestionApplied && (
              <button
                type="button"
                onClick={applyAiSuggestion}
                className="text-xs px-2 py-1 rounded-lg font-semibold"
                style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}
              >
                Apply
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Suggested: <span className="text-white font-bold">{aiSuggestion.suggested_marks}/100</span></span>
            {aiSuggestion.strengths?.length > 0 && (
              <span className="text-emerald-400">✓ {aiSuggestion.strengths[0]}</span>
            )}
          </div>
          {aiSuggestion.improvements?.length > 0 && (
            <p className="text-[11px] text-orange-400 mt-1">⚠ {aiSuggestion.improvements[0]}</p>
          )}
          {suggestionApplied && (
            <p className="text-[11px] text-emerald-400 mt-1 font-semibold">✓ Values applied — review and save</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field label="Marks (out of 100)">
          <input className={inputCls} type="number" min="0" max="100" placeholder="e.g. 85"
            value={marks} onChange={e => setMarks(e.target.value)} required />
        </Field>
        <Field label="Feedback (optional)">
          <textarea className={inputCls + " resize-none"} rows={4}
            placeholder="Great work! Here's what you can improve…"
            value={feedback} onChange={e => setFeedback(e.target.value)} />
        </Field>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", color: "#fff", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.45)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}>
            {saving ? "Saving…" : "Save Grade"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InstructorSubmissions() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState(null);          // submission being graded
  const [aiSuggestions, setAiSuggestions] = useState({}); // submissionId → suggestion
  const [evaluating, setEvaluating] = useState(null);    // submissionId being evaluated
  const [filter, setFilter] = useState("all");           // all | pending | submitted | graded
  const [expandedGroup, setExpandedGroup] = useState(null);

  const handleAiEvaluate = async (submission) => {
    setEvaluating(submission.submission_id);
    const res = await aiApi.evaluateSubmission(submission.submission_id);
    setAiSuggestions(prev => ({ ...prev, [submission.submission_id]: res }));
    setEvaluating(null);
    // Open grade modal immediately with suggestion loaded
    setGrading(submission);
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
    api.getAllSubmissions(selectedCourse.id)
      .then(data => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  // Group by assignment title
  const grouped = submissions.reduce((acc, s) => {
    const key = s.assignment_title;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  // Apply filter within groups
  const filteredGrouped = Object.fromEntries(
    Object.entries(grouped).map(([title, subs]) => {
      const filtered = subs.filter(s => {
        if (filter === "pending") return s.status !== "completed";
        if (filter === "submitted") return s.status === "completed";
        if (filter === "graded") return s.marks !== null && s.marks !== undefined;
        return true;
      });
      return [title, filtered];
    }).filter(([, subs]) => subs.length > 0)
  );

  const totalCount = submissions.length;
  const submittedCount = submissions.filter(s => s.status === "completed").length;
  const gradedCount = submissions.filter(s => s.marks !== null && s.marks !== undefined).length;
  const pendingCount = totalCount - submittedCount;

  const handleSaved = (updated) => {
    setSubmissions(prev =>
      prev.map(s => s.submission_id === updated.submission_id ? updated : s)
    );
  };

  const filters = [
    { key: "all", label: "All", count: totalCount },
    { key: "submitted", label: "Submitted", count: submittedCount },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "graded", label: "Graded", count: gradedCount },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
          <p className="page-subtitle">Review and grade student assignment submissions</p>
        </div>
        {/* STAT PILLS */}
        <div className="flex gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {submittedCount} Submitted
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            {pendingCount} Pending
          </span>
        </div>
      </div>

      {/* COURSE SELECTOR */}
      {courses.length > 0 ? (
        <CourseSelector courses={courses} selected={selectedCourse} onSelect={(c) => { setSelectedCourse(c); setExpandedGroup(null); }} />
      ) : (
        <div className="glass-panel p-6 text-center text-gray-500 text-sm mb-8">No courses found.</div>
      )}

      {selectedCourse && (
        <>
          {/* FILTER TABS */}
          <div
            className="flex gap-1.5 mb-6 flex-wrap p-1.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 14,
              width: "fit-content",
            }}
          >
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="flex items-center gap-1.5 text-xs font-semibold transition-all duration-300"
                style={{
                  padding: "0.4rem 0.875rem",
                  borderRadius: 10,
                  background: filter === f.key
                    ? "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))"
                    : "transparent",
                  border: filter === f.key ? "1px solid rgba(139,92,246,0.35)" : "1px solid transparent",
                  color: filter === f.key ? "#e9d5ff" : "#6b7280",
                  boxShadow: filter === f.key ? "0 2px 12px rgba(139,92,246,0.15)" : "none",
                }}
                onMouseEnter={e => { if (filter !== f.key) { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#d1d5db"; } }}
                onMouseLeave={e => { if (filter !== f.key) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#6b7280"; } }}
              >
                {f.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: filter === f.key ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)",
                    color: filter === f.key ? "#c084fc" : "#4b5563",
                  }}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="glass-panel p-5 h-24 animate-pulse" />)}
            </div>
          ) : Object.keys(filteredGrouped).length === 0 ? (
            <div
              className="p-14 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                backdropFilter: "blur(24px)",
                border: "1.5px dashed rgba(20,184,166,0.2)",
                borderRadius: 20,
              }}
            >
              <div
                className="mx-auto mb-4 flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(20,184,166,0.1)", boxShadow: "0 0 28px rgba(20,184,166,0.15)" }}
              >
                <FileText size={26} style={{ color: "#2dd4bf" }} />
              </div>
              <p className="font-semibold text-white mb-1.5" style={{ fontSize: "1rem" }}>No submissions found</p>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                {filter === "all" ? "No students have submitted anything yet." : `No ${filter} submissions.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(filteredGrouped).map(([title, subs]) => {
                const isOpen = expandedGroup === title;
                const submitted = subs.filter(s => s.status === "completed").length;
                const graded = subs.filter(s => s.marks !== null && s.marks !== undefined).length;
                const avgMarks = graded
                  ? Math.round(subs.filter(s => s.marks !== null).reduce((sum, s) => sum + s.marks, 0) / graded)
                  : null;

                return (
                  <div key={title} className="glass-panel overflow-hidden">
                    {/* GROUP HEADER */}
                    <button
                      onClick={() => setExpandedGroup(isOpen ? null : title)}
                      className="w-full p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white mb-1">{title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="text-emerald-400">{submitted} submitted</span>
                          <span>·</span>
                          <span>{subs.length - submitted} pending</span>
                          <span>·</span>
                          <span>{graded} graded</span>
                          {avgMarks !== null && (
                            <><span>·</span><span className="text-purple-400">Avg: {avgMarks}/100</span></>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-gray-500">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* EXPANDED: STUDENT ROWS */}
                    {isOpen && (
                      <div className="border-t border-white/5 bg-white/[0.02]">
                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider border-b border-white/5">
                          <span className="col-span-3">Student</span>
                          <span className="col-span-2 text-center">Status</span>
                          <span className="col-span-2 text-center">Submitted</span>
                          <span className="col-span-2 text-center">Marks</span>
                          <span className="col-span-3 text-right">Action</span>
                        </div>

                        {subs.map((s) => (
                          <div key={s.submission_id} className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <div className="col-span-3">
                              <p className="text-sm font-semibold text-white truncate">{s.student_name}</p>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <StatusBadge status={s.status} />
                            </div>
                            <div className="col-span-2 text-center text-xs text-gray-500">
                              {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                            </div>
                            <div className="col-span-2 text-center">
                              {s.marks !== null && s.marks !== undefined ? (
                                <span className={`text-sm font-bold ${s.marks >= 75 ? "text-emerald-400" : s.marks >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                  {s.marks}<span className="text-gray-600 text-xs font-normal">/100</span>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-600">—</span>
                              )}
                            </div>
                            <div className="col-span-3 flex justify-end gap-1.5">
                              {s.status === "completed" ? (
                                <>
                                  <button
                                    onClick={() => handleAiEvaluate(s)}
                                    disabled={evaluating === s.submission_id}
                                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-semibold"
                                    style={{
                                      background: "rgba(139,92,246,0.1)",
                                      border: "1px solid rgba(139,92,246,0.2)",
                                      color: "#a78bfa",
                                      cursor: evaluating === s.submission_id ? "wait" : "pointer",
                                    }}
                                    title="AI auto-evaluate this submission"
                                  >
                                    {evaluating === s.submission_id
                                      ? <Loader size={10} className="animate-spin" />
                                      : <Sparkles size={10} />}
                                    {evaluating === s.submission_id ? "…" : "AI"}
                                  </button>
                                  <button
                                    onClick={() => setGrading(s)}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-300"
                                    style={{
                                      background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))",
                                      border: "1px solid rgba(139,92,246,0.35)",
                                      color: "#e9d5ff",
                                      boxShadow: "0 2px 10px rgba(139,92,246,0.15)",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(99,102,241,0.25))"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(99,102,241,0.15))"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(139,92,246,0.15)"; }}
                                  >
                                    <Star size={11} />
                                    {s.marks !== null ? "Re-grade" : "Grade"}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-gray-600 pr-2">Awaiting submission</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* GRADE MODAL */}
      {grading && (
        <GradeModal
          submission={grading}
          onClose={() => setGrading(null)}
          onSave={handleSaved}
          aiSuggestion={aiSuggestions[grading.submission_id] || null}
        />
      )}
    </div>
  );
}
