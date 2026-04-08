import { useEffect, useState } from "react";
import { api } from "../services/api";
import { ClipboardList, BookOpen, Plus, X, FileText, Calendar, CheckCircle, Clock } from "lucide-react";

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
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

// ─── TOPIC CARD ───────────────────────────────────────────────────────────────
function TopicCard({ topic }) {
  return (
    <div className="glass-panel p-4 hover:bg-white/[0.06] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-white text-sm">{topic.title}</p>
        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{topic.date}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">{topic.content}</p>
    </div>
  );
}

// ─── ASSIGNMENT CARD ──────────────────────────────────────────────────────────
function AssignmentCard({ a }) {
  const isOverdue = a.due_date && new Date(a.due_date) < new Date();
  return (
    <div className="glass-panel p-4 hover:bg-white/[0.06] transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.type === "writing" ? "bg-teal-500/15 text-teal-400" : "bg-indigo-500/15 text-indigo-400"}`}>
          {a.type === "writing" ? <FileText size={16} /> : <BookOpen size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white text-sm truncate">{a.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
              a.type === "writing"
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}>
              {a.type}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{a.content}</p>
          <div className="flex items-center gap-1 text-xs">
            <Calendar size={11} className={isOverdue ? "text-red-400" : "text-gray-500"} />
            <span className={isOverdue ? "text-red-400" : "text-gray-500"}>
              Due: {a.due_date || "No deadline"}
              {isOverdue && " · Overdue"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InstructorClassroom() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeSection, setActiveSection] = useState("topics"); // topics | assignments
  const [topics, setTopics] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [topicForm, setTopicForm] = useState({ title: "", content: "", attachment_url: "" });
  const [assignForm, setAssignForm] = useState({ title: "", content: "", type: "reading", due_date: "" });

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
    Promise.all([
      api.getTopics(selectedCourse.id),
      api.getAssignments(selectedCourse.id),
    ]).then(([t, a]) => {
      setTopics(Array.isArray(t) ? t : []);
      setAssignments(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, [selectedCourse]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await api.createTopic({ ...topicForm, course_id: selectedCourse.id });
    setSaving(false);
    if (res.detail || res.error) { setError(res.detail || res.error); return; }
    setShowTopicModal(false);
    setTopicForm({ title: "", content: "", attachment_url: "" });
    const t = await api.getTopics(selectedCourse.id);
    setTopics(Array.isArray(t) ? t : []);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await api.createAssignment({ ...assignForm, course_id: selectedCourse.id });
    setSaving(false);
    if (res.detail || res.error) { setError(res.detail || res.error); return; }
    setShowAssignModal(false);
    setAssignForm({ title: "", content: "", type: "reading", due_date: "" });
    const a = await api.getAssignments(selectedCourse.id);
    setAssignments(Array.isArray(a) ? a : []);
  };

  const tabs = [
    { key: "topics", label: "Daily Topics", icon: BookOpen, count: topics.length },
    { key: "assignments", label: "Assignments", icon: ClipboardList, count: assignments.length },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classroom</h1>
          <p className="page-subtitle">Post topics and manage assignments</p>
        </div>
        <button
          onClick={() => activeSection === "topics" ? setShowTopicModal(true) : setShowAssignModal(true)}
          disabled={!selectedCourse}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
          onMouseEnter={e => { if (selectedCourse) { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
        >
          <Plus size={16} />
          {activeSection === "topics" ? "Post Topic" : "Add Assignment"}
        </button>
      </div>

      {/* COURSE SELECTOR */}
      {courses.length > 0 ? (
        <CourseSelector courses={courses} selected={selectedCourse} onSelect={setSelectedCourse} />
      ) : (
        <div className="glass-panel p-6 text-center text-gray-500 text-sm mb-8">
          No courses found. Create a course first.
        </div>
      )}

      {selectedCourse && (
        <>
          {/* SECTION TABS */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "5px", borderRadius: 14, width: "fit-content" }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.45rem 1rem",
                    borderRadius: 10,
                    fontSize: "0.83rem",
                    fontWeight: 600,
                    border: active ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                    background: active ? "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.16))" : "transparent",
                    color: active ? "#e9d5ff" : "#6b7280",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: active ? "0 2px 12px rgba(139,92,246,0.2)" : "none",
                  }}
                >
                  <Icon size={14} style={{ color: active ? "#c084fc" : "#6b7280" }} />
                  {tab.label}
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                    background: active ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)",
                    color: active ? "#c084fc" : "#4b5563",
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="glass-panel p-5 h-20 animate-pulse" />)}
            </div>
          ) : activeSection === "topics" ? (
            topics.length === 0 ? (
              <div
                className="p-12 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  backdropFilter: "blur(24px)",
                  border: "1.5px dashed rgba(139,92,246,0.2)",
                  borderRadius: 20,
                }}
              >
                <div
                  className="mx-auto mb-4 flex items-center justify-center"
                  style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(99,102,241,0.12)", boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}
                >
                  <BookOpen size={24} style={{ color: "#818cf8" }} />
                </div>
                <p className="font-semibold text-white mb-1.5">No topics posted yet</p>
                <p className="text-sm mb-5" style={{ color: "#6b7280" }}>Share today's topic with your students.</p>
                <button
                  onClick={() => setShowTopicModal(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
                >
                  Post First Topic
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map(t => <TopicCard key={t.id} topic={t} />)}
              </div>
            )
          ) : (
            assignments.length === 0 ? (
              <div
                className="p-12 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  backdropFilter: "blur(24px)",
                  border: "1.5px dashed rgba(99,102,241,0.2)",
                  borderRadius: 20,
                }}
              >
                <div
                  className="mx-auto mb-4 flex items-center justify-center"
                  style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(20,184,166,0.1)", boxShadow: "0 0 24px rgba(20,184,166,0.15)" }}
                >
                  <ClipboardList size={24} style={{ color: "#2dd4bf" }} />
                </div>
                <p className="font-semibold text-white mb-1.5">No assignments yet</p>
                <p className="text-sm mb-5" style={{ color: "#6b7280" }}>Create a reading or writing assignment.</p>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300"
                  style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", boxShadow: "0 4px 20px rgba(139,92,246,0.3)", color: "#fff" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(139,92,246,0.45)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(139,92,246,0.3)"; }}
                >
                  Create Assignment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => <AssignmentCard key={a.id} a={a} />)}
              </div>
            )
          )}
        </>
      )}

      {/* TOPIC MODAL */}
      {showTopicModal && (
        <Modal title="Post Daily Topic" onClose={() => { setShowTopicModal(false); setError(""); }}>
          <form onSubmit={handleCreateTopic}>
            <Field label="Title">
              <input className={inputCls} placeholder="e.g. Introduction to Neural Networks" value={topicForm.title}
                onChange={e => setTopicForm(f => ({ ...f, title: e.target.value }))} required />
            </Field>
            <Field label="Content / Notes">
              <textarea className={inputCls + " resize-none"} rows={4} placeholder="Describe the topic, share key concepts, links…"
                value={topicForm.content} onChange={e => setTopicForm(f => ({ ...f, content: e.target.value }))} required />
            </Field>
            <Field label="Resource URL (optional)">
              <input className={inputCls} placeholder="https://…" value={topicForm.attachment_url}
                onChange={e => setTopicForm(f => ({ ...f, attachment_url: e.target.value }))} />
            </Field>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowTopicModal(false); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", color: "#fff", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}>
                {saving ? "Posting…" : "Post Topic"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGNMENT MODAL */}
      {showAssignModal && (
        <Modal title="Create Assignment" onClose={() => { setShowAssignModal(false); setError(""); }}>
          <form onSubmit={handleCreateAssignment}>
            <Field label="Title">
              <input className={inputCls} placeholder="e.g. Read Chapter 3 & summarize" value={assignForm.title}
                onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} required />
            </Field>
            <Field label="Description / Instructions">
              <textarea className={inputCls + " resize-none"} rows={3} placeholder="Describe what students need to do…"
                value={assignForm.content} onChange={e => setAssignForm(f => ({ ...f, content: e.target.value }))} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className={selectCls} value={assignForm.type}
                  onChange={e => setAssignForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing (upload)</option>
                </select>
              </Field>
              <Field label="Due Date">
                <input type="date" className={inputCls} value={assignForm.due_date}
                  onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} />
              </Field>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowAssignModal(false); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #9333ea, #6366f1)", color: "#fff", boxShadow: "0 4px 16px rgba(139,92,246,0.3)" }}
                onMouseEnter={e => { if (!saving) { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(139,92,246,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(139,92,246,0.3)"; }}>
                {saving ? "Creating…" : "Create Assignment"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
