import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  CheckCircle2, Circle, Plus, Trash2, Bell, BellOff,
  Flame, Target, RefreshCw, Calendar, Clock, Star, Zap,
} from "lucide-react";

// Seed checklist from local storage so it persists between page navigations
const LS_KEY = "edumentor_checklist";

function loadLocalChecklist() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalChecklist(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const DEFAULT_CHECKLIST = [
  { id: "c1", text: "Review today's topics", done: false },
  { id: "c2", text: "Take at least one quiz", done: false },
  { id: "c3", text: "Ask a doubt if stuck", done: false },
  { id: "c4", text: "Check pending assignments", done: false },
  { id: "c5", text: "Review weak topics", done: false },
];

// Simple unique ID
let _id = Date.now();
const uid = () => `item_${++_id}`;

// ─── Reminder Card ─────────────────────────────────────────────────────────────
function ReminderCard({ reminder, onToggle, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(reminder.id);
    setDeleting(false);
  };

  const done = reminder.completed || reminder.is_done;
  const isExpired = reminder.time && new Date(`1970-01-01T${reminder.time}`) < new Date(`1970-01-01T${new Date().toTimeString().slice(0, 5)}`);

  return (
    <div
      style={{
        padding: "0.875rem 1rem", borderRadius: 10,
        background: done ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${done ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
        display: "flex", alignItems: "center", gap: "0.75rem",
        transition: "all 0.2s",
      }}
    >
      <button
        onClick={() => onToggle(reminder.id, !done)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
      >
        {done
          ? <CheckCircle2 size={18} style={{ color: "#34d399" }} />
          : <Circle size={18} style={{ color: "#4b5563" }} />
        }
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "0.85rem", fontWeight: 500,
            color: done ? "#6b7280" : "#e5e7eb",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {reminder.title || reminder.text || reminder.content}
        </p>
        {reminder.time && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Clock size={10} style={{ color: isExpired ? "#4b5563" : "#6b7280" }} />
            <span style={{ fontSize: "0.68rem", color: isExpired ? "#4b5563" : "#6b7280" }}>
              {reminder.time}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: "none", border: "none", cursor: deleting ? "not-allowed" : "pointer",
          padding: 4, flexShrink: 0, opacity: deleting ? 0.5 : 1, color: "#4b5563",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#4b5563"; }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ─── Checklist Item ────────────────────────────────────────────────────────────
function ChecklistItem({ item, onToggle, onDelete }) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem", borderRadius: 10,
        background: item.done ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${item.done ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)"}`,
        display: "flex", alignItems: "center", gap: "0.75rem",
        transition: "all 0.2s",
      }}
    >
      <button
        onClick={() => onToggle(item.id)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
      >
        {item.done
          ? <CheckCircle2 size={17} style={{ color: "#34d399" }} />
          : <Circle size={17} style={{ color: "#4b5563" }} />
        }
      </button>

      <p
        style={{
          flex: 1, fontSize: "0.85rem", fontWeight: 500,
          color: item.done ? "#6b7280" : "#e5e7eb",
          textDecoration: item.done ? "line-through" : "none",
        }}
      >
        {item.text}
      </p>

      <button
        onClick={() => onDelete(item.id)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: 4, flexShrink: 0, color: "#374151", transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#374151"; }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DailyChecklist({ setActiveTab }) {
  // Reminders state (from backend)
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);

  // Local checklist
  const [checklist, setChecklist] = useState(() => loadLocalChecklist() || DEFAULT_CHECKLIST);
  const [newTask, setNewTask] = useState("");

  // Gamification snapshot
  const [game, setGame] = useState(null);
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    // Load reminders from backend
    api.getReminders()
      .then((r) => setReminders(r.reminders || r || []))
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false));

    // Load gamification for the motivational streak display
    Promise.all([api.getGamification(), api.getDailyGoal()])
      .then(([g, d]) => { setGame(g); setDaily(d); })
      .catch(() => {});
  }, []);

  // Keep checklist synced to local storage
  useEffect(() => { saveLocalChecklist(checklist); }, [checklist]);

  // Reminder actions
  const handleAddReminder = async () => {
    if (!newReminderTitle.trim()) return;
    setAddingReminder(true);
    try {
      const res = await api.createReminder({
        title: newReminderTitle.trim(),
        time: newReminderTime || null,
      });
      const newR = res.reminder || { ...res, id: Date.now(), title: newReminderTitle.trim(), time: newReminderTime || null, completed: false };
      setReminders((prev) => [...prev, newR]);
      setNewReminderTitle("");
      setNewReminderTime("");
      setShowAddReminder(false);
    } catch { /* silent */ }
    finally { setAddingReminder(false); }
  };

  const handleToggleReminder = async (id, done) => {
    // Optimistic update
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, completed: done, is_done: done } : r));
    await api.updateReminder(id, { completed: done }).catch(() => {});
  };

  const handleDeleteReminder = async (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await api.deleteReminder(id).catch(() => {});
  };

  // Checklist actions
  const handleToggleChecklist = (id) => {
    setChecklist((prev) => prev.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  };

  const handleDeleteChecklist = (id) => {
    setChecklist((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setChecklist((prev) => [...prev, { id: uid(), text: newTask.trim(), done: false }]);
    setNewTask("");
  };

  const handleResetChecklist = () => {
    setChecklist(DEFAULT_CHECKLIST.map((i) => ({ ...i, done: false })));
  };

  const safeGame = game || { xp: 0, streak: 0 };
  const safeDaily = daily || { xp_today: 0, goal: 50, progress: 0 };
  const checklistDoneCount = checklist.filter((i) => i.done).length;
  const reminderDoneCount = reminders.filter((r) => r.completed || r.is_done).length;
  const checklistProgress = checklist.length > 0 ? Math.round((checklistDoneCount / checklist.length) * 100) : 0;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Checklist</h1>
          <p className="text-gray-400 text-sm mt-1">{today}</p>
        </div>

        {safeGame.streak > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)",
            }}
          >
            <Flame size={14} style={{ color: "#f97316" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fb923c" }}>
              {safeGame.streak} Day Streak
            </span>
          </div>
        )}
      </div>

      {/* Motivational progress cards */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem", marginBottom: "1.75rem",
        }}
      >
        {/* Daily goal */}
        <div
          style={{
            padding: "1rem 1.25rem", borderRadius: 12,
            background: "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(6,182,212,0.1))",
            border: "1px solid rgba(20,184,166,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Target size={14} style={{ color: "#2dd4bf" }} />
            <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>DAILY GOAL</span>
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#2dd4bf" }}>
            {safeDaily.xp_today}<span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}> / {safeDaily.goal} XP</span>
          </p>
          <div style={{ height: 4, background: "#1f2937", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #0d9488, #2dd4bf)", width: `${Math.min(safeDaily.progress, 100)}%`, transition: "width 0.8s ease-out" }} />
          </div>
        </div>

        {/* XP today */}
        <div
          style={{
            padding: "1rem 1.25rem", borderRadius: 12,
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(79,70,229,0.1))",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Zap size={14} style={{ color: "#a78bfa" }} />
            <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>TOTAL XP</span>
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#a78bfa" }}>{safeGame.xp.toLocaleString()}</p>
          <p style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4 }}>Level {Math.floor(safeGame.xp / 100)}</p>
        </div>

        {/* Checklist progress */}
        <div
          style={{
            padding: "1rem 1.25rem", borderRadius: 12,
            background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <CheckCircle2 size={14} style={{ color: "#34d399" }} />
            <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>TODAY'S TASKS</span>
          </div>
          <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#34d399" }}>
            {checklistDoneCount}<span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}> / {checklist.length}</span>
          </p>
          <div style={{ height: 4, background: "#1f2937", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #059669, #34d399)", width: `${checklistProgress}%`, transition: "width 0.5s ease-out" }} />
          </div>
        </div>
      </div>

      {/* All done banner */}
      {checklistProgress === 100 && checklist.length > 0 && (
        <div
          style={{
            padding: "0.875rem 1.25rem", borderRadius: 12, marginBottom: "1.5rem",
            background: "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))",
            border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <Star size={18} style={{ color: "#fbbf24" }} />
          <div>
            <p style={{ fontWeight: 700, color: "#34d399", fontSize: "0.9rem" }}>
              All tasks complete! Excellent work today 🎉
            </p>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>
              Keep your streak alive — come back tomorrow!
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

        {/* ── Daily Checklist ─── */}
        <div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "0.875rem",
            }}
          >
            <h2 style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
              Daily Tasks
            </h2>
            <button
              onClick={handleResetChecklist}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
                fontSize: "0.72rem", color: "#4b5563", padding: "4px 8px",
                borderRadius: 6, transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#9ca3af"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4b5563"; }}
            >
              <RefreshCw size={11} /> Reset
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.875rem" }}>
            {checklist.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggleChecklist}
                onDelete={handleDeleteChecklist}
              />
            ))}
            {checklist.length === 0 && (
              <p style={{ fontSize: "0.8rem", color: "#4b5563", textAlign: "center", padding: "1rem 0" }}>
                No tasks. Add one below!
              </p>
            )}
          </div>

          {/* Add task */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
              placeholder="Add a task…"
              className="form-control"
              style={{ flex: 1, fontSize: "0.8rem", height: 36, padding: "0 0.75rem" }}
            />
            <button
              onClick={handleAddTask}
              disabled={!newTask.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "none",
                background: newTask.trim() ? "linear-gradient(135deg, #9333ea, #6366f1)" : "#1f2937",
                color: "#fff", cursor: newTask.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: newTask.trim() ? "0 2px 12px rgba(139,92,246,0.4)" : "none",
                transition: "all 0.18s",
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Quick links */}
          <div style={{ marginTop: "1.25rem" }}>
            <p style={{ fontSize: "0.72rem", color: "#4b5563", fontWeight: 600, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Quick Actions
            </p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {[
                { label: "Take Quiz", tab: "quiz", color: "#2dd4bf" },
                { label: "Ask Doubt", tab: "doubt", color: "#a78bfa" },
                { label: "Assignments", tab: "assignments", color: "#60a5fa" },
                { label: "My Courses", tab: "courses", color: "#fb923c" },
              ].map(({ label, tab, color }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
                    background: "rgba(255,255,255,0.04)", color,
                    border: `1px solid ${color}25`, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${color}15`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Reminders ─── */}
        <div>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: "0.875rem",
            }}
          >
            <h2 style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={14} style={{ color: "#fbbf24" }} />
              Reminders
              {reminders.length > 0 && (
                <span
                  style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                    background: "rgba(251,191,36,0.15)", color: "#fbbf24",
                  }}
                >
                  {reminders.length}
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowAddReminder((v) => !v)}
              style={{
                padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
                background: showAddReminder ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                color: showAddReminder ? "#a78bfa" : "#6b7280",
                border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Add reminder form */}
          {showAddReminder && (
            <div
              style={{
                padding: "0.875rem", borderRadius: 10,
                background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.2)",
                marginBottom: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem",
              }}
            >
              <input
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                placeholder="Reminder title…"
                className="form-control"
                style={{ fontSize: "0.82rem", height: 36, padding: "0 0.75rem" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Clock size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                  <input
                    type="time"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="form-control"
                    style={{ fontSize: "0.82rem", height: 36, paddingLeft: 30 }}
                  />
                </div>
                <button
                  onClick={handleAddReminder}
                  disabled={addingReminder || !newReminderTitle.trim()}
                  style={{
                    padding: "0 16px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                    background: addingReminder || !newReminderTitle.trim() ? "#1f2937" : "linear-gradient(135deg, #9333ea, #6366f1)",
                    color: "#fff", border: "none",
                    cursor: addingReminder || !newReminderTitle.trim() ? "not-allowed" : "pointer",
                    height: 36, flexShrink: 0,
                    boxShadow: addingReminder || !newReminderTitle.trim() ? "none" : "0 2px 12px rgba(139,92,246,0.35)",
                    transition: "all 0.18s",
                  }}
                >
                  {addingReminder ? "…" : "Save"}
                </button>
              </div>
            </div>
          )}

          {/* Reminders list */}
          {remindersLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4b5563", padding: "0.5rem 0" }}>
              <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "0.8rem" }}>Loading reminders…</span>
            </div>
          ) : reminders.length === 0 ? (
            <div
              style={{
                textAlign: "center", padding: "2.5rem 1rem",
                border: "2px dashed rgba(255,255,255,0.05)", borderRadius: 10,
              }}
            >
              <BellOff size={24} style={{ color: "#374151", margin: "0 auto 0.5rem" }} />
              <p style={{ fontSize: "0.8rem", color: "#4b5563" }}>No reminders yet.</p>
              <p style={{ fontSize: "0.75rem", color: "#374151" }}>Add one to stay on track.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {reminders.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  onToggle={handleToggleReminder}
                  onDelete={handleDeleteReminder}
                />
              ))}
              {reminderDoneCount > 0 && (
                <p style={{ fontSize: "0.72rem", color: "#4b5563", marginTop: 4 }}>
                  {reminderDoneCount} of {reminders.length} done
                </p>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Weekly motivation quote */}
      <div
        style={{
          marginTop: "2rem", padding: "1.25rem 1.5rem", borderRadius: 14,
          background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.08))",
          border: "1px solid rgba(139,92,246,0.15)",
        }}
      >
        <p style={{ fontSize: "0.9rem", color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.6 }}>
          "The secret of getting ahead is getting started. Every expert was once a beginner — today's small steps
          are tomorrow's big wins."
        </p>
        <p style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 8 }}>Daily motivation from EduMentor AI</p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
