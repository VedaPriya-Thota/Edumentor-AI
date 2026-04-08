import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, Cell
} from "recharts";
import { BarChart2, Users, AlertCircle, Trophy, Zap, TrendingUp, TrendingDown, Activity } from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }) {
  const colorMap = {
    indigo:  { hex: "#6366f1", glow: "rgba(99,102,241,0.18)"  },
    teal:    { hex: "#2dd4bf", glow: "rgba(45,212,191,0.18)"  },
    purple:  { hex: "#a855f7", glow: "rgba(168,85,247,0.18)"  },
    orange:  { hex: "#fb923c", glow: "rgba(251,146,60,0.18)"  },
    red:     { hex: "#f87171", glow: "rgba(248,113,113,0.18)" },
    emerald: { hex: "#34d399", glow: "rgba(52,211,153,0.18)"  },
  };
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.065) 0%, rgba(255,255,255,0.025) 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 18,
        padding: "1.25rem",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.hex}40`; e.currentTarget.style.boxShadow = `0 8px 28px rgba(0,0,0,0.45), 0 0 20px ${c.glow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.75rem" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.hex}18`, border: `1px solid ${c.hex}30`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 12px ${c.glow}` }}>
          <Icon size={16} style={{ color: c.hex }} />
        </div>
        <span style={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      </div>
      <p style={{ fontSize: "2rem", fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.04em", marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.72rem", color: "#4b5563" }}>{sub}</p>}
    </div>
  );
}

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

// Custom tooltip for charts
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}{p.name === "Accuracy" ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function InstructorAnalytics() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

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
    api.getCourseLeaderboard(selectedCourse.id)
      .then(data => setLeaderboard(data.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  // Derived stats
  const enrolled = leaderboard.length;
  const avgAccuracy = enrolled
    ? Math.round(leaderboard.reduce((s, st) => s + st.accuracy, 0) / enrolled)
    : 0;
  const avgXP = enrolled
    ? Math.round(leaderboard.reduce((s, st) => s + st.xp, 0) / enrolled)
    : 0;
  const totalQuizzes = leaderboard.reduce((s, st) => s + st.quizzes, 0);

  // Inactive: 0 quizzes in this course
  const inactive = leaderboard.filter(s => s.quizzes === 0);
  const active = leaderboard.filter(s => s.quizzes > 0);

  // Accuracy distribution for bar chart
  const accuracyBands = [
    { label: "0–25%",   count: leaderboard.filter(s => s.accuracy < 25).length,             color: "#ef4444" },
    { label: "25–50%",  count: leaderboard.filter(s => s.accuracy >= 25 && s.accuracy < 50).length, color: "#f97316" },
    { label: "50–75%",  count: leaderboard.filter(s => s.accuracy >= 50 && s.accuracy < 75).length, color: "#eab308" },
    { label: "75–100%", count: leaderboard.filter(s => s.accuracy >= 75).length,             color: "#22c55e" },
  ];

  // Per-student chart data
  const studentChartData = active.map(s => ({
    name: s.name.split(" ")[0],
    Accuracy: s.accuracy,
    XP: s.xp,
    Quizzes: s.quizzes,
  }));

  const rankColor = (rank) => {
    if (rank === 1) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (rank === 2) return "text-slate-300 bg-slate-400/10 border-slate-400/20";
    if (rank === 3) return "text-orange-500 bg-orange-600/10 border-orange-600/20";
    return "text-gray-600 bg-white/5 border-white/5";
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Analytics</h1>
          <p className="page-subtitle">Monitor performance, track engagement, identify inactive students</p>
        </div>
        <div
          className="flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(45,212,191,0.1), rgba(255,255,255,0.03))",
            border: "1px solid rgba(45,212,191,0.2)",
            padding: "0.4rem 1rem", borderRadius: 999,
            boxShadow: "0 0 16px rgba(45,212,191,0.08)",
          }}
        >
          <Activity size={14} className="text-teal-400" />
          <span className="text-sm font-semibold text-teal-400">Live Data</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf", animation: "pulse 2s infinite" }} />
        </div>
      </div>

      {/* COURSE SELECTOR */}
      {courses.length > 0 ? (
        <CourseSelector courses={courses} selected={selectedCourse} onSelect={(c) => { setSelectedCourse(c); }} />
      ) : (
        <div className="glass-panel p-6 text-center text-gray-500 text-sm mb-8">No courses found.</div>
      )}

      {selectedCourse && (
        loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="glass-panel p-5 h-28 animate-pulse" />)}
            </div>
          </div>
        ) : (
          <>
            {/* STAT STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Enrolled" value={enrolled} sub="total students" icon={Users} color="indigo" />
              <StatCard label="Avg Accuracy" value={`${avgAccuracy}%`} sub="across all quizzes" icon={TrendingUp} color="teal" />
              <StatCard label="Avg XP" value={avgXP} sub="per student" icon={Zap} color="purple" />
              <StatCard label="Total Quizzes" value={totalQuizzes} sub="course-wide attempts" icon={BarChart2} color="orange" />
            </div>

            {/* INACTIVE STUDENTS ALERT */}
            {inactive.length > 0 && (
              <div className="glass-panel p-5 border border-orange-500/20 bg-orange-500/5 mb-8">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-300 mb-1">
                      {inactive.length} student{inactive.length !== 1 ? "s" : ""} need attention
                    </p>
                    <p className="text-xs text-orange-400/70 mb-3">
                      These students have not attempted any quizzes in this course yet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inactive.map(s => (
                        <span key={s.student_id} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs font-semibold">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {enrolled === 0 ? (
              <div className="glass-panel p-12 text-center border-2 border-dashed border-white/5">
                <Users size={40} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No students enrolled yet</p>
                <p className="text-gray-600 text-sm mt-1">Analytics will appear once students join this course.</p>
              </div>
            ) : (
              <>
                {/* CHARTS ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                  {/* ACCURACY DISTRIBUTION */}
                  <div className="glass-panel p-6">
                    <h3 className="font-bold text-gray-200 mb-5 flex items-center gap-2">
                      <BarChart2 size={16} className="text-purple-400" />
                      Accuracy Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={accuracyBands} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 11 }} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                          {accuracyBands.map((entry, i) => (
                            <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PER-STUDENT ACCURACY */}
                  <div className="glass-panel p-6">
                    <h3 className="font-bold text-gray-200 mb-5 flex items-center gap-2">
                      <TrendingUp size={16} className="text-teal-400" />
                      Student Accuracy (active only)
                    </h3>
                    {studentChartData.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
                        No active students yet
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={studentChartData} barSize={28}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                          <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                          <Bar dataKey="Accuracy" fill="#a855f7" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>

                {/* FULL LEADERBOARD TABLE */}
                <div className="glass-panel overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                      <Trophy size={16} className="text-yellow-400" />
                      Course Leaderboard
                    </h3>
                    <span className="text-xs text-gray-600">{enrolled} student{enrolled !== 1 ? "s" : ""}</span>
                  </div>

                  {/* TABLE */}
                  <div className="divide-y divide-white/5">
                    {/* Header */}
                    <div className="grid grid-cols-8 gap-2 px-6 py-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                      <span className="col-span-1">Rank</span>
                      <span className="col-span-2">Student</span>
                      <span className="text-center">Accuracy</span>
                      <span className="text-center">Quizzes</span>
                      <span className="text-center flex items-center justify-center gap-1"><Zap size={9} />XP</span>
                      <span className="text-center">Streak</span>
                      <span className="text-center">Status</span>
                    </div>

                    {leaderboard.map((s) => (
                      <div key={s.student_id} className="grid grid-cols-8 gap-2 items-center px-6 py-3 hover:bg-white/5 transition-colors">
                        <div className="col-span-1">
                          <span className={`inline-flex w-7 h-7 rounded-lg border text-xs font-bold items-center justify-center ${rankColor(s.rank)}`}>
                            {s.rank}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                        </div>
                        <div className="text-center">
                          <span className={`text-sm font-bold ${s.accuracy >= 75 ? "text-emerald-400" : s.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                            {s.accuracy}%
                          </span>
                        </div>
                        <div className="text-center text-sm text-gray-300">{s.quizzes}</div>
                        <div className="text-center text-sm text-purple-400 font-semibold">{s.xp}</div>
                        <div className="text-center text-sm text-gray-400">{s.streak}d</div>
                        <div className="text-center">
                          {s.quizzes === 0 ? (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">
                              Inactive
                            </span>
                          ) : s.accuracy >= 75 ? (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              Strong
                            </span>
                          ) : s.accuracy < 50 ? (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                              At Risk
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-semibold">
                              Average
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}
