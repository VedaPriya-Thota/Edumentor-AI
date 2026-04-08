import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Award, BookOpen, Target, Star, Lock,
  Zap, CheckCircle, Activity, BarChart2, ChevronDown,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────
const TIER_COLORS = {
  platinum: "#e2e8f0",
  gold: "#fbbf24",
  silver: "#94a3b8",
  bronze: "#b45309",
};
const TIER_BG = {
  platinum: "rgba(226,232,240,0.15)",
  gold: "rgba(251,191,36,0.15)",
  silver: "rgba(148,163,184,0.15)",
  bronze: "rgba(180,83,9,0.15)",
};

function StatCard({ icon: Icon, label, value, color = "#8A2BE2" }) {
  return (
    <div className="glass-panel p-5 flex items-center gap-4">
      <div
        style={{
          background: `${color}22`,
          border: `1px solid ${color}44`,
          borderRadius: "0.75rem",
          padding: "0.6rem",
          flexShrink: 0,
        }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </p>
        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ── Activity Heatmap ───────────────────────────────────────────────────────
function ActivityHeatmap({ data = [], stats = {} }) {
  // Build a map of date → count for the 84-day window
  const countMap = useMemo(() => {
    const m = {};
    data.forEach(({ date, count }) => { m[date] = count; });
    return m;
  }, [data]);

  // Build the 84-day grid (12 weeks × 7 days)
  const cells = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: countMap[key] || 0 });
    }
    return days;
  }, [countMap]);

  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return w;
  }, [cells]);

  const cellColor = (count) => {
    if (count === 0) return "rgba(255,255,255,0.06)";
    if (count === 1) return "#4c1d95";
    if (count <= 3) return "#7c3aed";
    if (count <= 6) return "#8B5CF6";
    return "#a78bfa";
  };

  return (
    <div className="glass-panel p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>Activity Heatmap (Last 12 Weeks)</h3>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {[
            { label: "Active Days", value: stats.active_days },
            { label: "Total Actions", value: stats.total_actions },
            { label: "Best Day", value: stats.max_day_count },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase" }}>{label}</p>
              <p style={{ fontWeight: 800, color: "#a78bfa" }}>{value ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto", paddingBottom: "0.5rem" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              {week.map(({ date, count }) => (
                <div
                  key={date}
                  title={`${date}: ${count} action${count !== 1 ? "s" : ""}`}
                  style={{
                    width: "13px",
                    height: "13px",
                    borderRadius: "3px",
                    background: cellColor(count),
                    cursor: "default",
                    transition: "opacity 0.15s",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "0.75rem", justifyContent: "flex-end" }}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>Less</span>
        {[0, 1, 3, 5, 7].map(n => (
          <div key={n} style={{ width: "12px", height: "12px", borderRadius: "3px", background: cellColor(n) }} />
        ))}
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>More</span>
      </div>
    </div>
  );
}

// ── Badge Grid ─────────────────────────────────────────────────────────────
function BadgeGrid({ badges = [] }) {
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "#fff" }}>Your Badges</h3>
        <span style={{
          background: "rgba(138,43,226,0.25)",
          color: "#a78bfa",
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "0.15rem 0.6rem",
          borderRadius: "999px",
          border: "1px solid rgba(138,43,226,0.35)",
        }}>
          {earned.length} / {badges.length} earned
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
        {[...earned, ...locked].map(badge => (
          <div
            key={badge.key}
            className="glass-panel"
            style={{
              padding: "1rem",
              textAlign: "center",
              opacity: badge.earned ? 1 : 0.45,
              border: badge.earned ? `1px solid ${TIER_COLORS[badge.tier] || "#8A2BE2"}55` : "1px solid rgba(255,255,255,0.06)",
              background: badge.earned ? TIER_BG[badge.tier] : "rgba(255,255,255,0.03)",
              position: "relative",
            }}
          >
            {!badge.earned && (
              <Lock size={12} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", color: "rgba(255,255,255,0.3)" }} />
            )}
            <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{badge.icon}</div>
            <p style={{ fontWeight: 700, fontSize: "0.78rem", color: "#fff", marginBottom: "0.2rem" }}>{badge.name}</p>
            <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>{badge.description}</p>
            {badge.earned && badge.earned_at && (
              <p style={{ fontSize: "0.62rem", color: TIER_COLORS[badge.tier] || "#a78bfa", marginTop: "0.4rem", fontWeight: 600 }}>
                {new Date(badge.earned_at).toLocaleDateString()}
              </p>
            )}
            <div style={{
              marginTop: "0.5rem",
              display: "inline-block",
              fontSize: "0.6rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: TIER_COLORS[badge.tier] || "#a78bfa",
            }}>
              {badge.tier}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Per-Course Tab ─────────────────────────────────────────────────────────
function CourseAnalyticsTab({ overview }) {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const courses = overview?.courses || [];

  const course = selectedCourse
    ? courses.find(c => c.course_id === selectedCourse)
    : courses[0];

  useEffect(() => {
    if (courses.length > 0 && !selectedCourse) setSelectedCourse(courses[0]?.course_id);
  }, [courses]);

  if (courses.length === 0) {
    return (
      <div className="glass-panel p-8" style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
        <BookOpen size={40} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
        <p>Enroll in courses to see per-course analytics.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
      {/* course selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "180px" }}>
        {courses.map(c => (
          <button
            key={c.course_id}
            onClick={() => setSelectedCourse(c.course_id)}
            style={{
              padding: "0.65rem 1rem",
              borderRadius: "0.75rem",
              border: c.course_id === (course?.course_id) ? "1px solid #8A2BE2" : "1px solid rgba(255,255,255,0.1)",
              background: c.course_id === (course?.course_id) ? "rgba(138,43,226,0.2)" : "rgba(255,255,255,0.04)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.82rem",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            {c.course_name}
          </button>
        ))}
      </div>

      {/* details */}
      {course && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {[
              { label: "Quizzes", value: course.quizzes_taken },
              { label: "Avg Score", value: `${course.avg_quiz_pct?.toFixed(1) ?? 0}%` },
              { label: "Assignments", value: `${course.assignments_submitted}/${course.assignments_total}` },
              { label: "Topics Viewed", value: course.topics_viewed },
            ].map(({ label, value }) => (
              <div key={label} className="glass-panel p-4" style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase" }}>{label}</p>
                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a78bfa" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Quiz score history */}
          {course.quiz_history && course.quiz_history.length > 0 && (
            <div className="glass-panel p-5">
              <h4 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.9rem" }}>Quiz Score History</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={course.quiz_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                  <Tooltip
                    contentStyle={{ background: "#1a0a2e", border: "1px solid #8A2BE2", borderRadius: "0.5rem" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Line type="monotone" dataKey="percentage" stroke="#8A2BE2" strokeWidth={2} dot={{ fill: "#a78bfa" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────
function OverviewTab({ analytics, overview }) {
  const global = overview?.global || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
        <StatCard icon={Target} label="Total Quizzes" value={analytics?.total_quizzes} color="#8A2BE2" />
        <StatCard icon={TrendingUp} label="Overall Accuracy" value={`${analytics?.accuracy ?? 0}%`} color="#06b6d4" />
        <StatCard icon={Zap} label="XP Earned" value={global.total_xp} color="#f59e0b" />
        <StatCard icon={Activity} label="Current Streak" value={`${global.current_streak ?? 0}d`} color="#10b981" />
        <StatCard icon={BookOpen} label="Courses Enrolled" value={global.courses_enrolled} color="#ec4899" />
        <StatCard icon={CheckCircle} label="Assignments Done" value={`${global.assignments_submitted ?? 0}/${global.assignments_total ?? 0}`} color="#f97316" />
      </div>

      {/* Performance Trend */}
      {analytics?.history?.length > 0 && (
        <div className="glass-panel p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>Performance Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={analytics.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="test" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
              <Tooltip
                contentStyle={{ background: "#1a0a2e", border: "1px solid #8A2BE2", borderRadius: "0.5rem" }}
                labelStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#8A2BE2" strokeWidth={2} dot={{ fill: "#a78bfa", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak Topics */}
      {analytics?.weak_topics?.length > 0 && (
        <div className="glass-panel p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "0.95rem" }}>Weak Topics</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.weak_topics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="topic" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
              <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
              <Tooltip
                contentStyle={{ background: "#1a0a2e", border: "1px solid #8A2BE2", borderRadius: "0.5rem" }}
              />
              <Bar dataKey="accuracy" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const TABS = ["Overview", "Per-Course", "Badges", "Heatmap"];

export default function Analytics() {
  const [tab, setTab] = useState("Overview");
  const [analytics, setAnalytics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [badges, setBadges] = useState([]);
  const [heatmap, setHeatmap] = useState({ data: [], stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAnalytics(),
      api.getStudentOverview().catch(() => null),
      api.getBadges().catch(() => ({ badges: [] })),
      api.getActivityHeatmap().catch(() => ({ data: [], stats: {} })),
    ]).then(([a, o, b, h]) => {
      setAnalytics(a);
      setOverview(o);
      setBadges(b?.badges || []);
      setHeatmap({ data: h?.data || [], stats: h?.stats || {} });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", paddingBottom: "3rem" }}>
      <div style={{ marginBottom: "1.75rem", paddingTop: "1rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: "0.3rem" }}>
          Analytics &amp; Progress
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Track your performance, badges, and learning activity</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "1.75rem", flexWrap: "wrap", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", padding: "5px", borderRadius: 14, width: "fit-content" }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "0.45rem 1.2rem",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: "0.83rem",
              cursor: "pointer",
              border: tab === t ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
              background: tab === t ? "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.16))" : "transparent",
              color: tab === t ? "#e9d5ff" : "rgba(255,255,255,0.45)",
              transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: tab === t ? "0 2px 12px rgba(139,92,246,0.2)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "Overview" && (
        <OverviewTab analytics={analytics} overview={overview} />
      )}

      {tab === "Per-Course" && (
        <CourseAnalyticsTab overview={overview} />
      )}

      {tab === "Badges" && (
        <div className="glass-panel p-6">
          <BadgeGrid badges={badges} />
        </div>
      )}

      {tab === "Heatmap" && (
        <ActivityHeatmap data={heatmap.data} stats={heatmap.stats} />
      )}
    </div>
  );
}
