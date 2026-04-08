import { useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import { Bell, BellOff, Check, CheckCheck, Flame, AlertTriangle, Clock, BookOpen, HelpCircle, ClipboardList, Award } from "lucide-react";

// Map notification type → icon + colour
const TYPE_META = {
  streak_warning:      { icon: Flame,         color: "#fb923c", bg: "rgba(249,115,22,0.12)" },
  streak_lost:         { icon: Flame,         color: "#f87171", bg: "rgba(239,68,68,0.12)"  },
  inactivity_reminder: { icon: AlertTriangle,  color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  overdue_assignment:  { icon: ClipboardList,  color: "#f87171", bg: "rgba(239,68,68,0.1)"  },
  pending_quiz:        { icon: HelpCircle,     color: "#38bdf8", bg: "rgba(56,189,248,0.1)"  },
  missed_topic:        { icon: BookOpen,       color: "#a78bfa", bg: "rgba(139,92,246,0.1)"  },
  instructor_feedback: { icon: Award,          color: "#34d399", bg: "rgba(16,185,129,0.1)"  },
};

function NotificationItem({ notif, onRead }) {
  const meta = TYPE_META[notif.type] || { icon: Bell, color: "#9ca3af", bg: "rgba(255,255,255,0.05)" };
  const Icon = meta.icon;

  return (
    <div
      onClick={() => !notif.is_read && onRead(notif.id)}
      style={{
        padding: "0.75rem 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: notif.is_read ? "transparent" : meta.bg,
        cursor: notif.is_read ? "default" : "pointer",
        transition: "background 0.2s",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: `${meta.color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Icon size={14} style={{ color: meta.color }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p
            style={{
              fontSize: "0.82rem", fontWeight: notif.is_read ? 500 : 700,
              color: notif.is_read ? "#6b7280" : "#f3f4f6",
              lineHeight: 1.3,
            }}
          >
            {notif.title}
          </p>
          {!notif.is_read && (
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
          )}
        </div>
        <p
          style={{
            fontSize: "0.74rem", color: notif.is_read ? "#4b5563" : "#9ca3af",
            marginTop: 2, lineHeight: 1.45,
          }}
        >
          {notif.message}
        </p>
        <p style={{ fontSize: "0.65rem", color: "#374151", marginTop: 4 }}>
          {notif.created_at ? new Date(notif.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
        </p>
      </div>
    </div>
  );
}

export default function NotificationBell({ unreadCount: externalUnread = 0 }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(externalUnread);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Sync with external unread count from heartbeat
  useEffect(() => { setUnread(externalUnread); }, [externalUnread]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadNotifications = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnread(res.unread_count || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadNotifications();
  };

  const handleReadOne = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnread((c) => Math.max(0, c - 1));
    await api.markNotificationRead(id).catch(() => {});
  };

  const handleReadAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    await api.markAllNotificationsRead().catch(() => {});
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
          width: 38, height: 38, borderRadius: 10,
          background: open ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
          border: open ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s",
          color: open ? "#a78bfa" : "#6b7280",
        }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <div
            style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 17, height: 17, borderRadius: 10,
              background: "#ef4444", color: "#fff",
              fontSize: "0.6rem", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 3px",
              border: "2px solid #050510",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            borderRadius: 14,
            background: "rgba(10,10,18,0.97)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.875rem 1rem",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={14} style={{ color: "#a78bfa" }} />
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f3f4f6" }}>
                Notifications
              </span>
              {unread > 0 && (
                <span
                  style={{
                    padding: "1px 7px", borderRadius: 10, fontSize: "0.68rem",
                    fontWeight: 700, background: "rgba(139,92,246,0.2)", color: "#a78bfa",
                  }}
                >
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.72rem", color: "#6b7280",
                  display: "flex", alignItems: "center", gap: 4,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>Loading…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                <BellOff size={28} style={{ color: "#374151", margin: "0 auto 0.5rem" }} />
                <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notif={n} onRead={handleReadOne} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
