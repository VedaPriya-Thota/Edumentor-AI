import {
  LogOut, LayoutDashboard, Users, BookOpen, ClipboardList,
  BarChart2, FileText, HelpCircle, MessageSquare, Trophy, Star,
  CheckSquare, BookMarked,
} from "lucide-react";

export default function Sidebar({ userRole, activeTab, setActiveTab, onLogout }) {
  const studentMenu = [
    { key: "dashboard",       label: "Dashboard",       icon: LayoutDashboard },
    { key: "courses",         label: "My Courses",       icon: BookMarked },
    { key: "assignments",     label: "Assignments",       icon: ClipboardList },
    { key: "checklist",       label: "Daily Checklist",  icon: CheckSquare },
    { key: "leaderboard",     label: "Leaderboard",      icon: Trophy },
    { key: "doubt",           label: "Ask Doubts",       icon: MessageSquare },
    { key: "quiz",            label: "Take Quiz",        icon: HelpCircle },
    { key: "analytics",       label: "Analytics",        icon: BarChart2 },
    { key: "recommendations", label: "Recommendations",  icon: Star },
  ];

  const instructorMenu = [
    { key: "dashboard",        label: "Overview",         icon: LayoutDashboard },
    { key: "courses",          label: "My Courses",       icon: BookOpen },
    { key: "classroom",        label: "Classroom",        icon: ClipboardList },
    { key: "quiz-manager",     label: "Quiz Manager",     icon: HelpCircle },
    { key: "submissions",      label: "Submissions",      icon: FileText },
    { key: "class-analytics",  label: "Class Analytics",  icon: BarChart2 },
    { key: "students",         label: "Students",         icon: Users },
  ];

  const menu = userRole === "instructor" ? instructorMenu : studentMenu;

  // Decode name from JWT
  let userName = userRole === "instructor" ? "Professor" : "Student";
  try {
    const payload = JSON.parse(atob(localStorage.getItem("access_token").split(".")[1]));
    if (payload.name) userName = payload.name;
  } catch (_) {}

  const initials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      className="h-full flex flex-col pt-8 pb-6 shrink-0"
      style={{
        width: "288px",
        background: "linear-gradient(180deg, #06060f 0%, #080814 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        padding: "2rem 1.25rem 1.5rem",
      }}
    >
      {/* LOGO */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))",
            border: "1px solid rgba(139,92,246,0.3)",
            boxShadow: "0 0 12px rgba(139,92,246,0.2)",
          }}
        >
          <span className="text-sm">💜</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          EduMentor <span className="text-gray-400 font-medium">AI</span>
        </h2>
      </div>

      {/* SECTION LABEL */}
      <div className="px-2 mb-3">
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "rgba(139,92,246,0.6)", letterSpacing: "0.12em" }}>MAIN MENU</span>
      </div>

      {/* NAV ITEMS */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ gap: "2px" }}>
        {menu.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.7rem 1.125rem",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 500,
                letterSpacing: "-0.01em",
                cursor: "pointer",
                border: "none",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                color: active ? "#fff" : "#9ca3af",
                background: active
                  ? "linear-gradient(90deg, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.06) 100%)"
                  : "transparent",
                borderLeft: active ? "2px solid #a855f7" : "2px solid transparent",
                boxShadow: active ? "0 0 16px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "#e5e7eb";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#9ca3af";
                }
              }}
            >
              <Icon
                size={16}
                style={{ color: active ? "#a855f7" : "#6b7280", flexShrink: 0, transition: "color 0.25s" }}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* DIVIDER */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "1rem 0.5rem" }} />

      {/* USER + LOGOUT */}
      <div>
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div
            className="flex items-center justify-center font-bold shrink-0"
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))",
              color: "#c084fc",
              border: "1px solid rgba(139,92,246,0.25)",
              boxShadow: "0 0 10px rgba(139,92,246,0.15)",
              fontSize: "0.7rem",
            }}
          >
            {initials}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-white truncate" style={{ fontSize: "0.875rem" }}>{userName}</div>
            <div className="capitalize" style={{ fontSize: "0.72rem", color: "#6b7280" }}>{userRole}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "0.65rem 1.125rem",
            borderRadius: 14,
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
