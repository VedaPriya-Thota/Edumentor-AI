import { useEffect, useState } from "react";
import { api } from "../services/api";
import { BookOpen, Plus, Users, X, ChevronDown, ChevronUp, Trophy, TrendingUp, Zap } from "lucide-react";

// ─── MODAL WRAPPER ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── FORM INPUT ───────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors";

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InstructorCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  // Expanded course shows its leaderboard/enrolled students
  const [expanded, setExpanded] = useState(null);
  const [leaderboard, setLeaderboard] = useState({});
  const [loadingLB, setLoadingLB] = useState(false);

  const load = () => {
    setLoading(true);
    api.getCourses()
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await api.createCourse(form);
    setSaving(false);
    if (res.error || res.detail) {
      setError(res.detail || res.error || "Failed to create course");
    } else {
      setShowModal(false);
      setForm({ name: "", code: "", description: "" });
      load();
    }
  };

  const toggleExpand = async (courseId) => {
    if (expanded === courseId) {
      setExpanded(null);
      return;
    }
    setExpanded(courseId);
    if (!leaderboard[courseId]) {
      setLoadingLB(true);
      const data = await api.getCourseLeaderboard(courseId);
      setLeaderboard(prev => ({ ...prev, [courseId]: data.leaderboard || [] }));
      setLoadingLB(false);
    }
  };

  const rankColor = (rank) => {
    if (rank === 1) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (rank === 2) return "text-slate-300 bg-slate-400/10 border-slate-400/20";
    if (rank === 3) return "text-orange-500 bg-orange-600/10 border-orange-600/20";
    return "text-gray-500 bg-white/5 border-white/10";
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="page-subtitle">Create and manage your course catalog</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #9333ea, #6366f1)",
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
            color: "#fff",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
        >
          <Plus size={16} /> New Course
        </button>
      </div>

      {/* COURSE LIST */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-6 animate-pulse h-24" />
          ))}
        </div>
      ) : courses.length === 0 ? (
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
            style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(99,102,241,0.12)", boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}
          >
            <BookOpen size={26} style={{ color: "#818cf8" }} />
          </div>
          <p className="font-semibold text-white mb-1.5" style={{ fontSize: "1rem" }}>No courses yet</p>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Click "New Course" to create your first course.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course, idx) => {
            const isOpen = expanded === course.id;
            const lb = leaderboard[course.id] || [];
            const accentColors = [
              { from: "#7c3aed", to: "#6366f1", icon: "#a78bfa", bg: "rgba(124,58,237,0.12)" },
              { from: "#0891b2", to: "#0e7490", icon: "#22d3ee", bg: "rgba(8,145,178,0.12)" },
              { from: "#059669", to: "#047857", icon: "#34d399", bg: "rgba(5,150,105,0.12)" },
              { from: "#d97706", to: "#b45309", icon: "#fbbf24", bg: "rgba(217,119,6,0.12)" },
              { from: "#dc2626", to: "#b91c1c", icon: "#f87171", bg: "rgba(220,38,38,0.12)" },
            ];
            const col = accentColors[idx % accentColors.length];
            return (
              <div
                key={course.id}
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  overflow: "hidden",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: isOpen
                    ? `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${col.from}30`
                    : "0 4px 16px rgba(0,0,0,0.35)",
                }}
                onMouseEnter={e => {
                  if (!isOpen) {
                    e.currentTarget.style.borderColor = `${col.from}35`;
                    e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.45), 0 0 20px ${col.from}18`;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isOpen) {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
                    e.currentTarget.style.transform = "";
                  }
                }}
              >
                {/* colored left accent bar */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${col.from}, ${col.to})`, opacity: 0.85 }} />

                {/* COURSE HEADER ROW */}
                <div className="flex items-center gap-4" style={{ padding: "1.1rem 1.25rem" }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: col.bg,
                      border: `1px solid ${col.from}30`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <BookOpen size={18} style={{ color: col.icon }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-white truncate" style={{ fontSize: "0.95rem" }}>{course.name}</p>
                      <span
                        style={{
                          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.06em",
                          padding: "2px 8px", borderRadius: 6,
                          background: `${col.from}20`, color: col.icon, border: `1px solid ${col.from}35`,
                          flexShrink: 0,
                        }}
                      >
                        {course.code}
                      </span>
                      {course.instructor_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold shrink-0">
                          YOURS
                        </span>
                      )}
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: "#6b7280" }}>{course.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => toggleExpand(course.id)}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-300 font-semibold"
                      style={{
                        background: isOpen ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isOpen ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: isOpen ? "#c084fc" : "#9ca3af",
                      }}
                      onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "#fff"; } }}
                      onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#9ca3af"; } }}
                    >
                      <Users size={13} />
                      Students
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED: ENROLLED STUDENTS */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)", padding: "1.25rem 1.25rem 1.25rem" }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#e5e7eb" }}>
                        <Trophy size={14} style={{ color: "#fbbf24" }} />
                        Enrolled Students — Course Leaderboard
                      </h4>
                      <span
                        style={{
                          fontSize: "0.7rem", fontWeight: 700, padding: "2px 10px",
                          borderRadius: 999, background: "rgba(255,255,255,0.06)",
                          color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {lb.length} student{lb.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {loadingLB ? (
                      <div className="text-gray-600 text-sm text-center py-4 animate-pulse">Loading students…</div>
                    ) : lb.length === 0 ? (
                      <div className="text-gray-600 text-sm text-center py-6 border border-dashed border-white/5 rounded-xl">
                        No students enrolled yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* TABLE HEADER */}
                        <div className="grid grid-cols-6 gap-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 mb-1">
                          <span className="col-span-1">Rank</span>
                          <span className="col-span-2">Name</span>
                          <span className="text-center">Accuracy</span>
                          <span className="text-center">Quizzes</span>
                          <span className="text-center flex items-center justify-center gap-1"><Zap size={9} />XP</span>
                        </div>
                        {lb.map((s) => (
                          <div key={s.student_id} className="grid grid-cols-6 gap-2 items-center px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                            <div className={`col-span-1 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center ${rankColor(s.rank)}`}>
                              {s.rank}
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                              <p className="text-[10px] text-gray-600">streak: {s.streak}d</p>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${s.accuracy >= 75 ? "text-emerald-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                {s.accuracy}%
                              </span>
                            </div>
                            <div className="text-center text-sm text-gray-300">{s.quizzes}</div>
                            <div className="text-center text-sm text-purple-400 font-semibold">{s.xp}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      {showModal && (
        <Modal title="Create New Course" onClose={() => { setShowModal(false); setError(""); }}>
          <form onSubmit={handleCreate}>
            <Field label="Course Name">
              <input
                className={inputCls}
                placeholder="e.g. Machine Learning"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </Field>
            <Field label="Course Code">
              <input
                className={inputCls}
                placeholder="e.g. ML101"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                required
              />
            </Field>
            <Field label="Description">
              <textarea
                className={inputCls + " resize-none"}
                placeholder="Briefly describe what this course covers…"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </Field>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowModal(false); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", color: "#fff", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}
              >
                {saving ? "Creating…" : "Create Course"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
