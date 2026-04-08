import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Users, BookOpen, FileText, BarChart2,
  HelpCircle, ClipboardList, TrendingUp, AlertCircle
} from "lucide-react";

export default function InstructorDashboard({ setActiveTab }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derive instructor name from JWT
  let instructorName = "Professor";
  try {
    const payload = JSON.parse(atob(localStorage.getItem("access_token").split(".")[1]));
    if (payload.name) instructorName = payload.name;
  } catch (_) {}

  useEffect(() => {
    api.getCourses()
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  const myCourses = courses.filter(c => c.instructor_id !== null);
  const totalEnrolled = myCourses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0);

  const quickActions = [
    {
      label: "My Courses",
      desc: `${myCourses.length} active course${myCourses.length !== 1 ? "s" : ""}`,
      icon: BookOpen,
      color: "indigo",
      tab: "courses",
    },
    {
      label: "Classroom",
      desc: "Topics & assignments",
      icon: ClipboardList,
      color: "teal",
      tab: "classroom",
    },
    {
      label: "Quiz Manager",
      desc: "Create & grade quizzes",
      icon: HelpCircle,
      color: "purple",
      tab: "quiz-manager",
    },
    {
      label: "Submissions",
      desc: "Review student work",
      icon: FileText,
      color: "orange",
      tab: "submissions",
    },
    {
      label: "Class Analytics",
      desc: "Performance insights",
      icon: BarChart2,
      color: "pink",
      tab: "class-analytics",
    },
    {
      label: "Students",
      desc: "Manage & monitor",
      icon: Users,
      color: "cyan",
      tab: "students",
    },
  ];

  const colorMap = {
    indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
    teal:   { bg: "bg-teal-500/20",   text: "text-teal-400",   border: "border-teal-500/30" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    pink:   { bg: "bg-pink-500/20",   text: "text-pink-400",   border: "border-pink-500/30" },
    cyan:   { bg: "bg-cyan-500/20",   text: "text-cyan-400",   border: "border-cyan-500/30" },
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instructor Overview</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Welcome back, <span style={{ color: "#9ca3af", fontWeight: 500 }}>{instructorName}</span></p>
        </div>
        <div
          className="flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(45,212,191,0.1), rgba(255,255,255,0.02))",
            border: "1px solid rgba(45,212,191,0.15)",
            borderRadius: 9999,
            padding: "0.45rem 1rem",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 16px rgba(45,212,191,0.08)",
          }}
        >
          <span className="font-semibold text-sm text-teal-400">Instructor Portal</span>
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
        </div>
      </div>

      {/* HERO CARD */}
      <div
        className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #111827 0%, #0d0d1a 60%, #080810 100%)",
          border: "1px solid rgba(99,102,241,0.15)",
          boxShadow: "0 0 60px rgba(99,102,241,0.08), 0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome, {instructorName}! 🎓</h2>
          <p className="max-w-2xl mb-8 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
            Manage your courses, create assignments and quizzes, review student submissions, and track class-wide performance — all in one place.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const c = colorMap[action.color];
              return (
                <button
                  key={action.tab}
                  onClick={() => setActiveTab(action.tab)}
                  className={`flex items-center gap-3 p-4 text-left transition-all ${c.border}`}
                  style={{
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                    border: `1px solid`,
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.35), 0 0 20px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(255,255,255,0.04) 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)";
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
                  }}
                >
                  <div className={`w-10 h-10 rounded-lg ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{action.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{action.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* STAT STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Courses", value: loading ? "…" : myCourses.length, icon: BookOpen, color: "indigo" },
          { label: "Enrolled Students", value: loading ? "…" : totalEnrolled, icon: Users, color: "teal" },
          { label: "Assignments", value: "—", icon: ClipboardList, color: "purple" },
          { label: "Active Quizzes", value: "—", icon: HelpCircle, color: "orange" },
        ].map((s) => {
          const Icon = s.icon;
          const c = colorMap[s.color];
          return (
            <div
              key={s.label}
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "1.25rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center`}>
                  <Icon size={15} />
                </div>
                <span style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</span>
              </div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* MY COURSES LIST */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">My Courses</h3>
        <button
          onClick={() => setActiveTab("courses")}
          className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
        >
          Manage All →
        </button>
      </div>

      {loading ? (
        <div className="glass-panel p-8 flex items-center justify-center">
          <div className="animate-pulse text-gray-500 text-sm">Loading courses…</div>
        </div>
      ) : myCourses.length === 0 ? (
        <div className="glass-panel p-8 text-center border-dashed border-2 border-white/5">
          <BookOpen size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">No courses yet</p>
          <p className="text-gray-600 text-sm mb-4">Create your first course to get started.</p>
          <button
            onClick={() => setActiveTab("courses")}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-colors"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCourses.slice(0, 4).map((course) => (
            <div
              key={course.id}
              onClick={() => setActiveTab("courses")}
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20,
                padding: "1.25rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px) scale(1.01)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.45), 0 0 24px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-white">{course.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{course.code}</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-3">{course.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {course.enrolled_count || 0} students
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={11} />
                  View analytics
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
