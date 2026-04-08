import { useEffect, useState } from "react";
import { api } from "../services/api";
import EngagementBanner from "../components/EngagementBanner";
import {
  Flame, Star, Trophy, MessageSquare, HelpCircle, BarChart2,
  Star as Star2, AlertTriangle, Clock, ClipboardList, ChevronRight,
  BookOpen,
} from "lucide-react";

// ─── Priority Tasks Widget ───────────────────────────────────────────────────
function PriorityTasksWidget({ pendingAssignments, pendingQuizzes, setActiveTab }) {
  const all = [
    ...pendingAssignments.map((a) => ({ ...a, kind: "assignment" })),
    ...pendingQuizzes.map((q) => ({ ...q, kind: "quiz" })),
  ].sort((a, b) => {
    const order = { critical: 0, high: 1, normal: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  }).slice(0, 5);

  if (all.length === 0) return null;

  const priorityStyle = {
    critical: { color: "#f87171", bg: "rgba(239,68,68,0.1)", label: "Overdue" },
    high:     { color: "#fb923c", bg: "rgba(249,115,22,0.1)", label: "Today" },
    normal:   { color: "#9ca3af", bg: "rgba(255,255,255,0.05)", label: "Upcoming" },
  };

  return (
    <div className="glass-panel p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
          <AlertTriangle size={16} style={{ color: "#f87171" }} />
          Priority Tasks
        </h3>
        <button
          onClick={() => setActiveTab("assignments")}
          className="text-xs font-semibold text-purple-400"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          View All
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {all.map((item, i) => {
          const ps = priorityStyle[item.priority] || priorityStyle.normal;
          const Icon = item.kind === "quiz" ? HelpCircle : ClipboardList;
          return (
            <div
              key={i}
              onClick={() => setActiveTab(item.kind === "quiz" ? "classroom" : "assignments")}
              style={{
                padding: "0.75rem 0.875rem",
                borderRadius: 10,
                background: ps.bg,
                border: `1px solid ${ps.color}25`,
                display: "flex", alignItems: "center", gap: "0.75rem",
                cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Icon size={14} style={{ color: ps.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#e5e7eb", lineHeight: 1.2 }} className="truncate">
                  {item.title}
                </p>
                <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 2 }}>
                  {item.course_name} {item.due_date ? `· Due ${new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                </p>
              </div>
              <span
                style={{
                  padding: "2px 8px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700,
                  background: ps.bg, color: ps.color, flexShrink: 0,
                }}
              >
                {ps.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ setActiveTab, engagementData }) {
  const [game, setGame] = useState(null);
  const [daily, setDaily] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [doubtHistory, setDoubtHistory] = useState([]);
  const [performance, setPerformance] = useState({ weak_topics: [], strong_topics: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If heartbeat already fetched engagement status, use it for priority tasks
    if (engagementData) {
      setPendingAssignments(engagementData.pending_assignments || []);
      setPendingQuizzes(engagementData.pending_quizzes || []);
    } else {
      // Fallback: fetch engagement status independently
      api.getEngagementStatus()
        .then((r) => {
          if (r && !r.detail) {
            setPendingAssignments(r.pending_assignments || []);
            setPendingQuizzes(r.pending_quizzes || []);
          }
        })
        .catch(() => {});
    }

    Promise.all([
      api.getGamification(),
      api.getDailyGoal(),
      api.getQuizHistory(),
      api.getDoubtHistory(),
      api.getPerformance(),
      api.getLeaderboard(),
    ]).then(([gameData, dailyData, quizData, doubtData, perfData, leaderboardData]) => {
      setGame(gameData);
      setDaily(dailyData);
      setQuizHistory(quizData.history || []);
      setDoubtHistory(doubtData.history || []);
      setPerformance(perfData || { weak_topics: [], strong_topics: [] });
      setLeaderboard(leaderboardData.leaderboard?.slice(0, 3) || []);
    }).catch((err) => {
      console.error("Dashboard data load error:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, [engagementData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full mb-4"></div>
          <p className="text-gray-400">Loading your knowledge base...</p>
        </div>
      </div>
    );
  }

  const safeGame = game || { xp: 0, streak: 0 };
  const safeDaily = daily || { xp_today: 0, goal: 50, progress: 0 };
  const level = Math.floor(safeGame.xp / 100);
  const currentXP = safeGame.xp % 100;

  // Derive engagement snapshot from heartbeat data or gamification
  const engagement = engagementData?.engagement || null;
  const engagementSummary = engagementData?.summary || null;

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* HEADER ROW */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>

        <div
          className="flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 9999,
            padding: "0.45rem 1rem",
            backdropFilter: "blur(12px)",
            boxShadow: safeGame.streak > 0 ? "0 0 16px rgba(249,115,22,0.12)" : "none",
          }}
        >
          <span className="font-semibold text-sm">{safeGame.streak} Day Streak</span>
          {(safeGame.streak > 0)
            ? <Flame size={16} className="text-orange-500 animate-pulse" />
            : <Flame size={16} className="text-gray-500" />}
        </div>
      </div>

      {/* ENGAGEMENT BANNER — only shown for students with engagement issues */}
      {engagement && (
        <EngagementBanner
          engagement={engagement}
          summary={engagementSummary}
          setActiveTab={setActiveTab}
        />
      )}

      {/* PRIORITY TASKS — shown when there are overdue/high-priority items */}
      {(pendingAssignments.length > 0 || pendingQuizzes.length > 0) && (
        <PriorityTasksWidget
          pendingAssignments={pendingAssignments}
          pendingQuizzes={pendingQuizzes}
          setActiveTab={setActiveTab}
        />
      )}

      {/* MAIN WELCOME CARD */}
      <div
        className="rounded-2xl p-8 mb-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #130d24 0%, #0d0d1a 60%, #080810 100%)",
          border: "1px solid rgba(139,92,246,0.15)",
          boxShadow: "0 0 60px rgba(139,92,246,0.08), 0 20px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-3">Welcome back, Scholar! ✨</h2>
          <p className="text-gray-300 max-w-2xl mb-8">
            Your personalized intelligent learning environment awaits. Pick up where you
            left off or explore new concepts with your AI mentor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <button onClick={() => setActiveTab("courses")} className="quick-action-card">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.2)" }}>
                <BookOpen size={20} style={{ color: "#a78bfa" }} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">My Courses</h3>
                <p className="text-xs text-gray-400">Continue learning</p>
              </div>
            </button>

            <button onClick={() => setActiveTab("doubt")} className="quick-action-card">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Ask Doubts</h3>
                <p className="text-xs text-gray-400">Chat with AI Mentor</p>
              </div>
            </button>

            <button onClick={() => setActiveTab("quiz")} className="quick-action-card">
              <div className="w-12 h-12 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Take Quiz</h3>
                <p className="text-xs text-gray-400">Test your knowledge</p>
              </div>
            </button>

            <button onClick={() => setActiveTab("checklist")} className="quick-action-card">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Daily Tasks</h3>
                <p className="text-xs text-gray-400">Checklist & Reminders</p>
              </div>
            </button>

          </div>
        </div>
      </div>

      {/* STATS & PROGRESS */}
      <h3 className="text-xl font-bold mb-4 tracking-tight">Your Progress</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

        {/* LEVEL CARD */}
        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 font-medium mb-1">Current Level</p>
            <p className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="text-yellow-400" size={28} />
              {level}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400 font-medium mb-1">Total XP</p>
            <p className="text-xl font-semibold">{safeGame.xp}</p>
          </div>
        </div>

        {/* XP PROGRESS */}
        <div className="glass-panel p-6 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <p className="text-sm text-gray-400 font-medium">Progress to Level {level + 1}</p>
            <span className="text-xs font-bold text-purple-400">{currentXP} / 100 XP</span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-1000 ease-out"
              style={{
                width: `${currentXP}%`,
                background: "linear-gradient(90deg, #7c3aed, #a855f7)",
              }}
            ></div>
          </div>
        </div>

        {/* DAILY GOAL */}
        <div className="glass-panel p-6 flex items-center gap-6">
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-teal-400 transition-all duration-1000 ease-out"
                strokeDasharray={`${safeDaily.progress}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="text-teal-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 font-medium mb-1">Daily Goal</p>
            <p className="text-xl font-bold">
              {safeDaily.xp_today} <span className="text-sm text-gray-500 font-normal">/ {safeDaily.goal} XP</span>
            </p>
            <p className="text-xs text-teal-400 mt-1">
              {safeDaily.progress >= 100 ? "Goal met! 🎉" : `${safeDaily.progress}% complete`}
            </p>
          </div>
        </div>

      </div>

      {/* TOP PERFORMERS */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold tracking-tight">Top Performers</h3>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className="text-sm font-semibold text-purple-400"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            Full Leaderboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {leaderboard.map((student, i) => (
            <div
              key={i}
              className="flex items-center gap-4"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: `3px solid ${i === 0 ? "#eab308" : i === 1 ? "#94a3b8" : "#c2410c"}`,
                borderRadius: 20,
                padding: "1rem",
                boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 20px ${i === 0 ? "rgba(234,179,8,0.06)" : "rgba(0,0,0,0)"}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                  i === 1 ? "bg-slate-400/20 text-slate-400" :
                  "bg-orange-700/20 text-orange-600"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-white truncate">{student.name}</p>
                <p className="text-[10px] text-gray-500 font-medium">{student.score.toLocaleString()} Points</p>
              </div>
              <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-gray-400 border border-white/5">
                RANK #{student.rank}
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-gray-500 text-sm">Waiting for more data...</p>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <h3 className="text-xl font-bold mb-4 tracking-tight">Recent Activity</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* QUIZ HISTORY */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-gray-200 flex items-center gap-2">
              <HelpCircle size={18} className="text-teal-400" />
              Recent Quizzes
            </h4>
            <button
              onClick={() => setActiveTab("analytics")}
              className="text-xs text-purple-400 font-medium"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              View All
            </button>
          </div>

          {quizHistory.length > 0 ? (
            <div className="space-y-4" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {quizHistory.slice(0, 5).map((q, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div>
                    <p className="font-semibold text-sm capitalize">{q.topic}</p>
                    <p className="text-[10px] text-gray-500">{new Date(q.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-teal-400">{q.score}</p>
                    <p className="text-[10px] text-gray-500">{q.percentage}% Accuracy</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center" style={{ border: "2px dashed rgba(255,255,255,0.05)", borderRadius: 12 }}>
              <p className="text-sm text-gray-500">No quizzes taken yet.</p>
              <button
                onClick={() => setActiveTab("quiz")}
                className="mt-2 text-xs font-bold text-purple-400"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Start First Quiz
              </button>
            </div>
          )}
        </div>

        {/* DOUBT HISTORY */}
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-gray-200 flex items-center gap-2">
              <MessageSquare size={18} className="text-purple-400" />
              Recent Doubts
            </h4>
            <button
              onClick={() => setActiveTab("doubt")}
              className="text-xs text-purple-400 font-medium"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              New Doubt
            </button>
          </div>

          {doubtHistory.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {doubtHistory.slice(0, 5).map((d, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-sm font-medium text-gray-300" style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    "{d.question}"
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-gray-500">{new Date(d.date).toLocaleDateString()}</p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-purple-400"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
                    >
                      Answered
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="py-8 text-center" style={{ border: "2px dashed rgba(255,255,255,0.05)", borderRadius: 12 }}>
                <p className="text-sm text-gray-500">No doubts asked yet.</p>
                <button
                  onClick={() => setActiveTab("doubt")}
                  className="mt-2 text-xs font-bold text-purple-400"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  Ask Your First Question
                </button>
              </div>

              {/* PERFORMANCE ANALYSIS (nested inside doubts panel intentionally from original) */}
              <h3 className="text-xl font-bold mb-4 mt-12 tracking-tight">Performance Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

                <div className="glass-panel p-6 border-l-4 border-red-500/50">
                  <h4 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Topics to Improve
                  </h4>
                  {performance.weak_topics?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {performance.weak_topics.map((t, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-xs font-semibold capitalize text-red-400"
                          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No weak topics identified yet. Keep it up!</p>
                  )}
                </div>

                <div className="glass-panel p-6 border-l-4 border-emerald-500/50">
                  <h4 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Mastered Topics
                  </h4>
                  {performance.strong_topics?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {performance.strong_topics.map((t, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-full text-xs font-semibold capitalize text-emerald-400"
                          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Take more quizzes to identify your strengths!</p>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
