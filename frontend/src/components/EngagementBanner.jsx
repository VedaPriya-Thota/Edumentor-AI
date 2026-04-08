/**
 * EngagementBanner
 * ─────────────────
 * Shows contextual banners based on the student's engagement level:
 *   active     → nothing shown (no banner)
 *   at_risk    → soft warning: "streak at risk today"
 *   warning    → moderate: "you've been away N days, streak reduced"
 *   critical   → urgent: "N days inactive, tasks overdue"
 *
 * Also shows a separate "overdue work" bar when there are critical tasks.
 *
 * Props
 * ─────
 *   engagement  { level, days_inactive, streak, xp_today, daily_goal, daily_goal_met }
 *   summary     { overdue_items, pending_assignments, pending_quizzes }
 *   setActiveTab  fn — for navigation CTAs
 */

import { Flame, AlertTriangle, Clock, ChevronRight, XCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

const LEVELS = {
  at_risk: {
    bg: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.08))",
    border: "rgba(249,115,22,0.3)",
    icon: Flame,
    iconColor: "#fb923c",
    label: "Streak at risk",
  },
  warning: {
    bg: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))",
    border: "rgba(251,191,36,0.3)",
    icon: AlertTriangle,
    iconColor: "#fbbf24",
    label: "Low engagement",
  },
  critical: {
    bg: "linear-gradient(135deg, rgba(239,68,68,0.14), rgba(220,38,38,0.09))",
    border: "rgba(239,68,68,0.35)",
    icon: AlertTriangle,
    iconColor: "#f87171",
    label: "Inactive",
  },
};

function StreakBar({ streak, level }) {
  const maxVisible = 7;
  const dots = Array.from({ length: maxVisible }, (_, i) => i < streak);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {dots.map((filled, i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: filled
              ? (level === "critical" ? "#f87171" : level === "warning" ? "#fbbf24" : "#fb923c")
              : "rgba(255,255,255,0.1)",
            transition: "background 0.3s",
          }}
        />
      ))}
      {streak > maxVisible && (
        <span style={{ fontSize: "0.68rem", color: "#6b7280" }}>+{streak - maxVisible}</span>
      )}
    </div>
  );
}

export default function EngagementBanner({ engagement, summary, setActiveTab }) {
  const [dismissed, setDismissed] = useState(false);

  if (!engagement || engagement.level === "active" || dismissed) {
    // Still show a "tasks overdue" micro-bar even when active
    if (summary?.overdue_items > 0 && !dismissed) {
      return (
        <div
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", alignItems: "center", gap: 10,
            marginBottom: "1rem",
          }}
        >
          <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
          <p style={{ fontSize: "0.78rem", color: "#fca5a5", flex: 1 }}>
            <strong>{summary.overdue_items}</strong> item{summary.overdue_items > 1 ? "s are" : " is"} overdue.
          </p>
          <button
            onClick={() => setActiveTab("assignments")}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: "0.74rem", fontWeight: 600,
              background: "rgba(239,68,68,0.2)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Review <ChevronRight size={11} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 2 }}
          >
            <XCircle size={13} />
          </button>
        </div>
      );
    }
    return null;
  }

  const level = engagement.level;
  const meta = LEVELS[level] || LEVELS.warning;
  const Icon = meta.icon;
  const days = engagement.days_inactive;
  const streak = engagement.streak;

  const message =
    level === "at_risk"
      ? `Your ${streak}-day streak is at risk! Take a quiz or submit an assignment today to keep it alive.`
      : level === "warning"
      ? `You've been away for ${days} day${days > 1 ? "s" : ""}. Your streak has been reduced to ${streak}. Get back on track!`
      : `You've been inactive for ${days} days. Your streak is now ${streak} and you have overdue work. Your instructor has been notified.`;

  const cta =
    level === "at_risk"
      ? { label: "Take Quiz", tab: "quiz" }
      : level === "warning"
      ? { label: "View Assignments", tab: "assignments" }
      : { label: "Catch Up Now", tab: "assignments" };

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: 12,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.875rem",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: `${meta.iconColor}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={16} style={{ color: meta.iconColor }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
              padding: "2px 7px", borderRadius: 10,
              background: `${meta.iconColor}18`, color: meta.iconColor,
              textTransform: "uppercase",
            }}
          >
            {meta.label}
          </span>
          <StreakBar streak={streak} level={level} />
        </div>

        <p style={{ fontSize: "0.82rem", color: "#e5e7eb", lineHeight: 1.5 }}>{message}</p>

        {/* Quick stats row */}
        {(summary?.overdue_items > 0 || summary?.pending_assignments > 0) && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {summary.overdue_items > 0 && (
              <span style={{ fontSize: "0.72rem", color: "#f87171", display: "flex", alignItems: "center", gap: 3 }}>
                <AlertTriangle size={10} /> {summary.overdue_items} overdue
              </span>
            )}
            {summary.pending_assignments > 0 && (
              <span style={{ fontSize: "0.72rem", color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
                <Clock size={10} /> {summary.pending_assignments} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab(cta.tab)}
          style={{
            padding: "6px 14px", borderRadius: 8, fontSize: "0.76rem", fontWeight: 700,
            background: meta.iconColor,
            color: level === "warning" ? "#000" : "#fff",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          {cta.label} <ChevronRight size={11} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: "4px 8px", borderRadius: 6, fontSize: "0.7rem",
            background: "rgba(255,255,255,0.05)", color: "#6b7280",
            border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
            textAlign: "center",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
