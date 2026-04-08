import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Trophy, Medal, Flame, Award, ChevronRight, Calendar, BookOpen } from "lucide-react";

export default function Leaderboard() {
  const [tab, setTab] = useState("global");
  const [leaderboard, setLeaderboard] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseBoard, setCourseBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseLoading, setCourseLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getLeaderboard(),
      api.getEnrolledCourses().catch(() => []),
    ]).then(([lb, enrolled]) => {
      setLeaderboard(lb.leaderboard || []);
      const courseList = Array.isArray(enrolled) ? enrolled : (enrolled.courses || []);
      setCourses(courseList);
      if (courseList.length > 0) setSelectedCourse(courseList[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setCourseLoading(true);
    api.getCourseLeaderboard(selectedCourse)
      .then(data => setCourseBoard(data.leaderboard || []))
      .catch(() => setCourseBoard([]))
      .finally(() => setCourseLoading(false));
  }, [selectedCourse]);

  const topThree = leaderboard.slice(0, 3);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: "rgba(255,255,255,0.4)" }}>Loading rankings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 px-4">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingTop: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
          <span style={{ color: "rgba(255,255,255,0.4)" }}>EduMentor</span>
          <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
          <span style={{ color: "#a78bfa", fontWeight: 700 }}>Leaderboard</span>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "0.4rem 0.9rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}>
          <Calendar size={13} />
          {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.25)",
          padding: "0.6rem 1.5rem",
          borderRadius: "1.5rem",
          marginBottom: "0.75rem",
        }}>
          <Trophy size={28} style={{ color: "#f59e0b" }} />
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff" }}>Leaderboard</h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>Track your class ranking and compete with peers</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "1.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "4px", borderRadius: 14, width: "fit-content" }}>
        {[{ key: "global", label: "Global Rankings" }, { key: "course", label: "By Course" }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.45rem 1.25rem",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: "0.83rem",
              cursor: "pointer",
              border: tab === t.key ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
              background: tab === t.key ? "linear-gradient(135deg, rgba(139,92,246,0.28), rgba(99,102,241,0.16))" : "transparent",
              color: tab === t.key ? "#e9d5ff" : "rgba(255,255,255,0.45)",
              transition: "all 0.2s",
              boxShadow: tab === t.key ? "0 2px 12px rgba(139,92,246,0.2)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GLOBAL TAB ── */}
      {tab === "global" && (
        <>
          {/* Top 3 Podium */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "1rem", marginBottom: "3rem", minHeight: "280px" }}>
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="glass-panel" style={{ padding: "2rem 1.5rem", flex: "0 0 210px", textAlign: "center", position: "relative", border: "1px solid rgba(148,163,184,0.3)" }}>
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(to bottom, #94a3b8, #64748b)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.75rem", color: "#fff" }}>2</div>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(148,163,184,0.15)", border: "3px solid rgba(148,163,184,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: "1.4rem", fontWeight: 900, color: "#94a3b8" }}>
                  {getInitials(topThree[1].name)}
                </div>
                <p style={{ fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>{topThree[1].name}</p>
                <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#94a3b8" }}>{topThree[1].score.toLocaleString()}</p>
                {topThree[1].badge_count > 0 && (
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem" }}>🏅 {topThree[1].badge_count} badges</p>
                )}
              </div>
            )}

            {/* Rank 1 */}
            {topThree[0] && (
              <div className="glass-panel" style={{ padding: "2.5rem 1.75rem", flex: "0 0 240px", textAlign: "center", position: "relative", border: "1px solid rgba(251,191,36,0.4)", transform: "scale(1.08)", zIndex: 2 }}>
                <div style={{ position: "absolute", top: "-20px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(to bottom, #fde68a, #d97706)", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={20} style={{ color: "#fff" }} />
                </div>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(251,191,36,0.12)", border: "4px solid rgba(251,191,36,0.5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: "2rem", fontWeight: 900, color: "#f59e0b" }}>
                  {getInitials(topThree[0].name)}
                </div>
                <p style={{ fontWeight: 800, color: "#fff", fontSize: "1.05rem", marginBottom: "0.25rem" }}>{topThree[0].name}</p>
                <p style={{ fontSize: "2rem", fontWeight: 900, color: "#f59e0b" }}>{topThree[0].score.toLocaleString()}</p>
                {topThree[0].badge_count > 0 && (
                  <p style={{ fontSize: "0.72rem", color: "rgba(251,191,36,0.7)", marginTop: "0.25rem" }}>🏅 {topThree[0].badge_count} badges</p>
                )}
                <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#f59e0b", fontWeight: 800, marginTop: "0.5rem" }}>Champion</p>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="glass-panel" style={{ padding: "2rem 1.5rem", flex: "0 0 210px", textAlign: "center", position: "relative", border: "1px solid rgba(180,83,9,0.3)" }}>
                <div style={{ position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(to bottom, #fb923c, #b45309)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.75rem", color: "#fff" }}>3</div>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(180,83,9,0.12)", border: "3px solid rgba(180,83,9,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: "1.4rem", fontWeight: 900, color: "#fb923c" }}>
                  {getInitials(topThree[2].name)}
                </div>
                <p style={{ fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>{topThree[2].name}</p>
                <p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fb923c" }}>{topThree[2].score.toLocaleString()}</p>
                {topThree[2].badge_count > 0 && (
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.25rem" }}>🏅 {topThree[2].badge_count} badges</p>
                )}
              </div>
            )}
          </div>

          {/* Full Table */}
          <RankTable rows={leaderboard} getInitials={getInitials} showBadges />
        </>
      )}

      {/* ── COURSE TAB ── */}
      {tab === "course" && (
        <>
          {/* Course selector */}
          {courses.length === 0 ? (
            <div className="glass-panel p-8" style={{ textAlign: "center", color: "rgba(255,255,255,0.45)" }}>
              <BookOpen size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
              <p>Enroll in a course to see its leaderboard.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {courses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourse(c.id)}
                    style={{
                      padding: "0.4rem 1rem",
                      borderRadius: "999px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selectedCourse === c.id ? "1px solid #8A2BE2" : "1px solid rgba(255,255,255,0.12)",
                      background: selectedCourse === c.id ? "rgba(138,43,226,0.22)" : "rgba(255,255,255,0.04)",
                      color: selectedCourse === c.id ? "#c084fc" : "rgba(255,255,255,0.55)",
                      transition: "all 0.2s",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {courseLoading ? (
                <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "2rem" }}>Loading...</p>
              ) : (
                <RankTable rows={courseBoard} getInitials={getInitials} showBadges={false} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function RankTable({ rows, getInitials, showBadges }) {
  return (
    <div className="glass-panel" style={{ overflow: "hidden" }}>
      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "rgba(138,43,226,0.3)", borderRadius: "0.65rem", padding: "0.5rem", display: "flex" }}>
            <Award size={20} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <p style={{ fontWeight: 800, color: "#fff" }}>Class Rankings</p>
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Live performance updates</p>
          </div>
        </div>
        <span style={{ background: "rgba(138,43,226,0.2)", border: "1px solid rgba(138,43,226,0.3)", color: "#a78bfa", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.75rem", borderRadius: "999px" }}>
          All Students
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>
              <th style={{ padding: "0.9rem 1.5rem", textAlign: "left" }}>Rank</th>
              <th style={{ padding: "0.9rem 1rem", textAlign: "left" }}>Student</th>
              <th style={{ padding: "0.9rem 1rem", textAlign: "left" }}>Score</th>
              <th style={{ padding: "0.9rem 1rem", textAlign: "left" }}>Quizzes</th>
              <th style={{ padding: "0.9rem 1rem", textAlign: "left" }}>Streak</th>
              {showBadges && <th style={{ padding: "0.9rem 1rem", textAlign: "left" }}>Badges</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((student, idx) => (
              <tr
                key={student.student_id || idx}
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s", cursor: "default" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "0.85rem 1.5rem" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    background: student.rank === 1 ? "#f59e0b" : student.rank === 2 ? "#64748b" : student.rank === 3 ? "#b45309" : "rgba(255,255,255,0.08)",
                    color: student.rank <= 3 ? "#fff" : "rgba(255,255,255,0.5)",
                  }}>
                    {student.rank}
                  </div>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(138,43,226,0.2)", border: "1px solid rgba(138,43,226,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.82rem", fontWeight: 800, color: "#a78bfa" }}>
                      {getInitials(student.name)}
                    </div>
                    <p style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{student.name}</p>
                  </div>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <span style={{ fontWeight: 800, color: "#a78bfa", fontSize: "1rem" }}>{student.score?.toLocaleString()}</span>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <span style={{ background: "rgba(255,255,255,0.07)", padding: "0.2rem 0.65rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                    {student.quizzes}
                  </span>
                </td>
                <td style={{ padding: "0.85rem 1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Flame size={16} style={{ color: student.streak > 0 ? "#f97316" : "rgba(255,255,255,0.2)" }} />
                    <span style={{ fontWeight: 800, color: student.streak > 0 ? "#f97316" : "rgba(255,255,255,0.3)" }}>{student.streak}</span>
                  </div>
                </td>
                {showBadges && (
                  <td style={{ padding: "0.85rem 1rem" }}>
                    {student.badge_count > 0 ? (
                      <span style={{ fontSize: "0.82rem", color: "#fbbf24", fontWeight: 700 }}>🏅 {student.badge_count}</span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }}>—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <Award size={32} style={{ margin: "0 auto 0.75rem", color: "rgba(255,255,255,0.15)" }} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>No ranking data available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
