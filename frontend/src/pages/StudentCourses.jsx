import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  BookOpen, Search, Users, CheckCircle, PlusCircle,
  ChevronRight, Layers, Clock, Zap, BookMarked
} from "lucide-react";

const COURSE_COLORS = [
  { from: "#7c3aed", to: "#4f46e5", accent: "#a78bfa" },
  { from: "#0891b2", to: "#0e7490", accent: "#22d3ee" },
  { from: "#059669", to: "#047857", accent: "#34d399" },
  { from: "#d97706", to: "#b45309", accent: "#fbbf24" },
  { from: "#dc2626", to: "#b91c1c", accent: "#f87171" },
  { from: "#7c3aed", to: "#6d28d9", accent: "#c084fc" },
];

function CourseCard({ course, enrolled, onEnroll, onOpen, colorIdx }) {
  const color = COURSE_COLORS[colorIdx % COURSE_COLORS.length];
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async (e) => {
    e.stopPropagation();
    setEnrolling(true);
    await onEnroll(course.id);
    setEnrolling(false);
  };

  return (
    <div
      onClick={enrolled ? () => onOpen(course) : undefined}
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)",
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 18,
        overflow: "hidden",
        cursor: enrolled ? "pointer" : "default",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
      onMouseEnter={(e) => {
        if (enrolled) {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.borderColor = `${color.from}40`;
          e.currentTarget.style.boxShadow = `0 16px 40px rgba(0,0,0,0.5), 0 0 24px ${color.from}20, inset 0 1px 0 rgba(255,255,255,0.1)`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)";
      }}
    >
      {/* Color strip */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
        }}
      />

      <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Icon + code */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div
            style={{
              width: 42, height: 42, borderRadius: 10,
              background: `linear-gradient(135deg, ${color.from}33, ${color.to}22)`,
              border: `1px solid ${color.accent}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <BookOpen size={18} style={{ color: color.accent }} />
          </div>
          <span
            style={{
              fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em",
              padding: "3px 8px", borderRadius: 20,
              background: `${color.from}22`, color: color.accent,
              border: `1px solid ${color.accent}30`,
            }}
          >
            {course.code}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "0.4rem", lineHeight: 1.3 }}>
          {course.name}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "#9ca3af", flex: 1, lineHeight: 1.5, marginBottom: "1rem" }}>
          {course.description || "No description provided."}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", fontSize: "0.75rem" }}>
            <Users size={12} />
            <span>{course.enrolled_count ?? 0} students</span>
          </div>

          {enrolled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#34d399", fontSize: "0.75rem" }}>
                <CheckCircle size={12} />
                <span>Enrolled</span>
              </div>
              <div
                style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
                  background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
                  color: "#fff", display: "flex", alignItems: "center", gap: 4,
                }}
              >
                Open <ChevronRight size={12} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              style={{
                padding: "5px 14px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
                background: enrolling ? "#374151" : `linear-gradient(90deg, ${color.from}, ${color.to})`,
                color: "#fff", border: "none", cursor: enrolling ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 4, transition: "opacity 0.2s",
              }}
            >
              <PlusCircle size={12} />
              {enrolling ? "Enrolling…" : "Enroll"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentCourses({ setActiveTab, setSelectedCourse }) {
  const [tab, setTab] = useState("enrolled"); // "enrolled" | "discover"
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [topicFeed, setTopicFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRes, enrolledRes] = await Promise.all([
        api.getCourses(),
        api.getEnrolledCourses(),
      ]);

      const enrolled = enrolledRes.courses || enrolledRes || [];
      const all = allRes.courses || allRes || [];

      setEnrolledCourses(enrolled);
      setAllCourses(all);

      const ids = new Set(enrolled.map((c) => c.id));
      setEnrolledIds(ids);

      // Build topic feed from enrolled courses
      const feedPromises = enrolled.slice(0, 4).map((c) =>
        api.getTopics(c.id).then((r) => {
          const topics = r.topics || r || [];
          return topics.slice(0, 2).map((t) => ({ ...t, courseName: c.name, courseCode: c.code, courseId: c.id }));
        }).catch(() => [])
      );
      const feeds = await Promise.all(feedPromises);
      setTopicFeed(feeds.flat());
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleEnroll = async (course_id) => {
    const res = await api.enrollCourse(course_id);
    if (res.error || res.detail) {
      showToast(res.detail || res.error || "Already enrolled", "error");
    } else {
      showToast("Successfully enrolled!");
      setEnrolledIds((prev) => new Set([...prev, course_id]));
      loadData();
    }
  };

  const handleOpen = (course) => {
    setSelectedCourse(course);
    setActiveTab("classroom");
  };

  const filteredCourses = (tab === "enrolled" ? enrolledCourses : allCourses).filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(139,92,246,0.15)", margin: "0 auto 1rem" }} />
          <p className="text-gray-400">Loading courses…</p>
        </div>
      </div>
    );
  }

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
            fontSize: "0.85rem", fontWeight: 600,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
          <p className="text-gray-400 text-sm mt-1">
            {enrolledCourses.length} course{enrolledCourses.length !== 1 ? "s" : ""} enrolled
          </p>
        </div>
      </div>

      {/* Daily Topic Feed */}
      {topicFeed.length > 0 && tab === "enrolled" && (
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: "#fbbf24" }} />
            <h2 className="font-bold text-white">Today's Topic Feed</h2>
            <span
              style={{
                fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px",
                borderRadius: 20, background: "rgba(251,191,36,0.15)",
                color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)",
              }}
            >
              NEW
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {topicFeed.map((topic, i) => (
              <div
                key={i}
                onClick={() => {
                  const course = enrolledCourses.find((c) => c.id === topic.courseId);
                  if (course) handleOpen(course);
                }}
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.4rem" }}>
                  <BookMarked size={12} style={{ color: "#a78bfa" }} />
                  <span style={{ fontSize: "0.65rem", color: "#7c3aed", fontWeight: 700 }}>
                    {topic.courseCode}
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e5e7eb", marginBottom: "0.25rem", lineHeight: 1.3 }}>
                  {topic.title}
                </p>
                <p style={{ fontSize: "0.72rem", color: "#6b7280" }}>{topic.courseName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "4px", borderRadius: 12 }}>
          {["enrolled", "discover"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 18px", borderRadius: 9, fontSize: "0.83rem", fontWeight: 600,
                background: tab === t ? "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.16))" : "transparent",
                color: tab === t ? "#e9d5ff" : "#6b7280",
                border: tab === t ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: tab === t ? "0 2px 12px rgba(139,92,246,0.2)" : "none",
              }}
            >
              {t === "enrolled" ? `My Courses (${enrolledCourses.length})` : "Discover"}
            </button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-control"
            style={{ paddingLeft: 32, width: 220, fontSize: "0.82rem", height: 38 }}
          />
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div
          style={{
            textAlign: "center", padding: "4rem 2rem",
            border: "2px dashed rgba(255,255,255,0.06)", borderRadius: 16,
          }}
        >
          <Layers size={36} style={{ color: "#374151", margin: "0 auto 1rem" }} />
          <p className="text-gray-400 font-semibold">
            {tab === "enrolled" ? "You haven't enrolled in any courses yet." : "No courses found."}
          </p>
          {tab === "enrolled" && (
            <button
              onClick={() => setTab("discover")}
              style={{
                marginTop: "0.75rem", fontSize: "0.8rem", fontWeight: 600,
                color: "#a78bfa", background: "none", border: "none", cursor: "pointer",
              }}
            >
              Discover courses →
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredCourses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              enrolled={enrolledIds.has(course.id)}
              onEnroll={handleEnroll}
              onOpen={handleOpen}
              colorIdx={i}
            />
          ))}
        </div>
      )}

      {/* Quick stats bar */}
      {tab === "enrolled" && enrolledCourses.length > 0 && (
        <div
          style={{
            marginTop: "2.5rem", padding: "1rem 1.5rem", borderRadius: 12,
            background: "rgba(18,18,28,0.6)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: "2rem", flexWrap: "wrap",
          }}
        >
          {[
            { label: "Enrolled Courses", value: enrolledCourses.length, icon: <BookOpen size={14} style={{ color: "#a78bfa" }} /> },
            { label: "Topics Today", value: topicFeed.length, icon: <Clock size={14} style={{ color: "#22d3ee" }} /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {icon}
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{label}:</span>
              <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e5e7eb" }}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
