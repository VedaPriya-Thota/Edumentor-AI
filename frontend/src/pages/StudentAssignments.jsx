import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  ClipboardList, Calendar, AlertCircle, CheckCircle2,
  Upload, ChevronDown, ChevronUp, BookOpen, Filter, RefreshCw,
} from "lucide-react";

function isOverdue(dueDate) {
  return dueDate && new Date(dueDate) < new Date();
}

function daysUntil(dueDate) {
  if (!dueDate) return null;
  const diff = new Date(dueDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DueBadge({ dueDate, submitted }) {
  if (submitted) return null;
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0) return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
      Overdue
    </span>
  );
  if (days === 0) return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
      Due Today
    </span>
  );
  if (days <= 3) return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
      Due in {days}d
    </span>
  );
  return (
    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
      {days}d left
    </span>
  );
}

function AssignmentCard({ assignment, submission, courseName, courseCode, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const overdue = isOverdue(assignment.due_date) && !submission;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(assignment.id, { text });
    setText("");
    setSubmitting(false);
    setOpen(false);
  };

  const statusInfo = submission
    ? submission.status === "graded"
      ? { bg: "rgba(139,92,246,0.12)", color: "#a78bfa", label: "Graded" }
      : { bg: "rgba(16,185,129,0.1)", color: "#34d399", label: "Submitted" }
    : overdue
      ? { bg: "rgba(239,68,68,0.1)", color: "#f87171", label: "Overdue" }
      : { bg: "rgba(255,255,255,0.05)", color: "#9ca3af", label: "Pending" };

  return (
    <div
      style={{
        borderRadius: 14, overflow: "hidden",
        border: `1px solid ${overdue ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.07)"}`,
        background: "rgba(14,14,22,0.8)",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", padding: "1rem 1.25rem",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "flex-start", gap: "0.875rem",
        }}
      >
        {/* Left icon */}
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0, marginTop: 2,
            background: overdue ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {overdue
            ? <AlertCircle size={16} style={{ color: "#f87171" }} />
            : submission
              ? <CheckCircle2 size={16} style={{ color: "#34d399" }} />
              : <ClipboardList size={16} style={{ color: "#60a5fa" }} />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <p style={{ fontWeight: 700, color: "#f3f4f6", fontSize: "0.9rem" }}>{assignment.title}</p>
            <DueBadge dueDate={assignment.due_date} submitted={!!submission} />
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <BookOpen size={11} style={{ color: "#6b7280" }} />
              <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{courseCode} · {courseName}</span>
            </div>
            {assignment.due_date && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} style={{ color: "#6b7280" }} />
                <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                  Due {new Date(assignment.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
              background: statusInfo.bg, color: statusInfo.color,
            }}
          >
            {statusInfo.label}
          </span>
          {open ? <ChevronUp size={14} style={{ color: "#4b5563" }} /> : <ChevronDown size={14} style={{ color: "#4b5563" }} />}
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem" }}>
          {assignment.content && (
            <div
              style={{
                marginBottom: "1rem", padding: "0.875rem", borderRadius: 8,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                fontSize: "0.85rem", color: "#d1d5db", lineHeight: 1.65,
              }}
            >
              {assignment.content}
            </div>
          )}

          {submission?.status === "graded" && (
            <div
              style={{
                marginBottom: "1rem", padding: "0.875rem", borderRadius: 8,
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <p style={{ fontSize: "0.85rem", color: "#a78bfa", fontWeight: 700, marginBottom: 4 }}>
                Grade: {submission.grade ?? "—"} / 100
              </p>
              {submission.feedback && (
                <p style={{ fontSize: "0.8rem", color: "#c4b5fd", lineHeight: 1.5 }}>{submission.feedback}</p>
              )}
            </div>
          )}

          {!submission ? (
            <div>
              <label className="form-label">Your Submission</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Write your answer or submission here…"
                className="form-control"
                style={{ resize: "vertical", fontSize: "0.85rem" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", gap: 8 }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                    background: "rgba(255,255,255,0.05)", color: "#9ca3af",
                    border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                  style={{
                    padding: "8px 20px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                    background: submitting || !text.trim() ? "#1f2937" : "linear-gradient(90deg, #7c3aed, #4f46e5)",
                    color: "#fff", border: "none",
                    cursor: submitting || !text.trim() ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Upload size={13} />
                  {submitting ? "Submitting…" : "Submit Assignment"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "0.75rem 1rem", borderRadius: 8,
                background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.15)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <CheckCircle2 size={14} style={{ color: "#34d399" }} />
              <span style={{ fontSize: "0.82rem", color: "#6ee7b7" }}>
                Submitted on {submission.submitted_at
                  ? new Date(submission.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentAssignments({ setActiveTab, setSelectedCourse }) {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending"); // "all" | "pending" | "submitted" | "overdue"
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const enrolledRes = await api.getEnrolledCourses();
        const courses = enrolledRes.courses || enrolledRes || [];
        setEnrolledCourses(courses);

        const assignmentResults = await Promise.all(
          courses.map((c) =>
            api.getAssignments(c.id)
              .then((r) => {
                const list = r.assignments || r || [];
                return list.map((a) => ({ ...a, courseId: c.id, courseName: c.name, courseCode: c.code }));
              })
              .catch(() => [])
          )
        );
        const flatAssignments = assignmentResults.flat();
        // Sort by due date ascending
        flatAssignments.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        setAllAssignments(flatAssignments);

        const submissionResults = await Promise.all(
          courses.map((c) =>
            api.getMySubmissions(c.id)
              .then((r) => r.submissions || r || [])
              .catch(() => [])
          )
        );
        const subsMap = {};
        submissionResults.flat().forEach((s) => { subsMap[s.assignment_id] = s; });
        setSubmissions(subsMap);
      } catch (err) {
        console.error("Failed to load assignments:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const handleSubmit = async (assignment_id, data) => {
    const res = await api.submitAssignment(assignment_id, data);
    if (res.error || res.detail) {
      showToast(res.detail || res.error || "Submission failed", "error");
    } else {
      showToast("Assignment submitted!");
      setSubmissions((prev) => ({
        ...prev,
        [assignment_id]: { ...res, status: "submitted", submitted_at: new Date().toISOString() },
      }));
    }
  };

  const filtered = allAssignments.filter((a) => {
    const sub = submissions[a.id];
    if (filter === "pending") return !sub;
    if (filter === "submitted") return !!sub;
    if (filter === "overdue") return isOverdue(a.due_date) && !sub;
    return true;
  });

  const pendingCount = allAssignments.filter((a) => !submissions[a.id]).length;
  const overdueCount = allAssignments.filter((a) => isOverdue(a.due_date) && !submissions[a.id]).length;
  const submittedCount = allAssignments.filter((a) => !!submissions[a.id]).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7280" }}>
          <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "0.85rem" }}>Loading assignments…</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {toast && (
        <div
          style={{
            position: "fixed", top: 24, right: 24, zIndex: 9999,
            padding: "12px 20px", borderRadius: 10,
            background: toast.type === "error" ? "#7f1d1d" : "#064e3b",
            border: `1px solid ${toast.type === "error" ? "#f87171" : "#34d399"}33`,
            color: toast.type === "error" ? "#fca5a5" : "#6ee7b7",
            fontSize: "0.85rem", fontWeight: 600,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-gray-400 text-sm mt-1">All tasks across your enrolled courses</p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { label: "Total", value: allAssignments.length, color: "#9ca3af", bg: "rgba(255,255,255,0.04)" },
          { label: "Pending", value: pendingCount, color: "#60a5fa", bg: "rgba(59,130,246,0.08)" },
          { label: "Overdue", value: overdueCount, color: "#f87171", bg: "rgba(239,68,68,0.08)" },
          { label: "Submitted", value: submittedCount, color: "#34d399", bg: "rgba(16,185,129,0.08)" },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            style={{
              padding: "0.875rem 1rem", borderRadius: 12,
              background: bg, border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <Filter size={14} style={{ color: "#4b5563", alignSelf: "center", marginRight: 4 }} />
        {["all", "pending", "submitted", "overdue"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
              background: filter === f ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#a78bfa" : "#6b7280",
              border: filter === f ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "4rem 2rem",
            border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 14,
          }}
        >
          <ClipboardList size={36} style={{ color: "#374151", margin: "0 auto 0.75rem" }} />
          <p className="text-gray-400 font-semibold">
            {filter === "pending" ? "No pending assignments. Great work! 🎉" :
             filter === "overdue" ? "No overdue assignments." :
             filter === "submitted" ? "No submitted assignments yet." :
             "No assignments found."}
          </p>
          {enrolledCourses.length === 0 && (
            <button
              onClick={() => setActiveTab("courses")}
              style={{
                marginTop: "0.75rem", fontSize: "0.8rem", fontWeight: 600,
                color: "#a78bfa", background: "none", border: "none", cursor: "pointer",
              }}
            >
              Enroll in courses first →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((a) => (
            <AssignmentCard
              key={`${a.courseId}-${a.id}`}
              assignment={a}
              submission={submissions[a.id]}
              courseName={a.courseName}
              courseCode={a.courseCode}
              onSubmit={handleSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
