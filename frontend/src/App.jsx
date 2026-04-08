import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import NotificationBell from "./components/NotificationBell";
import { api } from "./services/api";

// Student pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Doubt from "./pages/Doubt";
import Quiz from "./pages/Quiz";
import Analytics from "./pages/Analytics";
import Recommendations from "./pages/Recommendations";
import Leaderboard from "./pages/Leaderboard";
import StudentCourses from "./pages/StudentCourses";
import StudentClassroom from "./pages/StudentClassroom";
import StudentAssignments from "./pages/StudentAssignments";
import DailyChecklist from "./pages/DailyChecklist";

// Instructor pages
import InstructorDashboard from "./pages/InstructorDashboard";
import InstructorCourses from "./pages/InstructorCourses";
import InstructorClassroom from "./pages/InstructorClassroom";
import InstructorQuizManager from "./pages/InstructorQuizManager";
import InstructorSubmissions from "./pages/InstructorSubmissions";
import InstructorAnalytics from "./pages/InstructorAnalytics";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Engagement state — populated by heartbeat on mount
  const [engagementData, setEngagementData] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Decode role from JWT
  let userRole = "student";
  if (token) {
    try {
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const decoded = JSON.parse(atob(payloadBase64));
        userRole = decoded.role || "student";
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem("access_token");
          setToken(null);
        }
      }
    } catch (e) {
      console.error("Failed to decode JWT:", e);
      localStorage.removeItem("access_token");
      setToken(null);
    }
  }

  // ── Heartbeat: fires on mount (after login) and on tab focus ──────────────
  useEffect(() => {
    if (!token || userRole !== "student") return;

    const runHeartbeat = async () => {
      try {
        const hb = await api.heartbeat();
        if (hb && !hb.detail) {
          setUnreadNotifications(hb.unread_notifications || 0);

          // Fetch full engagement status for the dashboard widgets
          const status = await api.getEngagementStatus();
          if (status && !status.detail) {
            setEngagementData(status);
            setUnreadNotifications(status.summary?.unread_notifications || 0);
          }
        }
      } catch {
        // heartbeat errors are silent — never crash the UI
      }
    };

    runHeartbeat();

    // Re-run heartbeat when the tab regains focus (e.g. student comes back)
    const onFocus = () => runHeartbeat();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token, userRole]);

  // Navigate helper — clears selectedCourse when leaving classroom
  const navigate = (tab) => {
    if (tab !== "classroom") setSelectedCourse(null);
    setActiveTab(tab);
  };

  const renderPage = () => {
    // ── INSTRUCTOR ────────────────────────────────────────────────
    if (userRole === "instructor") {
      switch (activeTab) {
        case "dashboard":       return <InstructorDashboard setActiveTab={navigate} />;
        case "courses":         return <InstructorCourses setActiveTab={navigate} />;
        case "classroom":       return <InstructorClassroom />;
        case "quiz-manager":    return <InstructorQuizManager />;
        case "submissions":     return <InstructorSubmissions />;
        case "class-analytics":
        case "students":        return <InstructorAnalytics setActiveTab={navigate} />;
        default:                return <InstructorDashboard setActiveTab={navigate} />;
      }
    }

    // ── STUDENT ───────────────────────────────────────────────────
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            setActiveTab={navigate}
            engagementData={engagementData}
          />
        );

      case "courses":
        return (
          <StudentCourses
            setActiveTab={navigate}
            setSelectedCourse={(course) => {
              setSelectedCourse(course);
              setActiveTab("classroom");
            }}
          />
        );

      case "classroom":
        return (
          <StudentClassroom
            course={selectedCourse}
            onBack={() => navigate("courses")}
          />
        );

      case "assignments":
        return (
          <StudentAssignments
            setActiveTab={navigate}
            setSelectedCourse={(course) => {
              setSelectedCourse(course);
              setActiveTab("classroom");
            }}
          />
        );

      case "checklist":
        return <DailyChecklist setActiveTab={navigate} />;

      case "quiz":            return <Quiz />;
      case "doubt":           return <Doubt />;
      case "analytics":       return <Analytics />;
      case "recommendations": return <Recommendations />;
      case "leaderboard":     return <Leaderboard />;

      default:                return <Dashboard setActiveTab={navigate} engagementData={engagementData} />;
    }
  };

  if (!token) {
    return <Auth onLogin={(newToken) => setToken(newToken)} />;
  }

  return (
    <>
      {/* AMBIENT BACKGROUND */}
      <div className="ambient-bg">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
      </div>

      <div className="flex h-screen text-white overflow-hidden">
        <Sidebar
          userRole={userRole}
          activeTab={activeTab}
          setActiveTab={navigate}
          onLogout={() => {
            localStorage.removeItem("access_token");
            setToken(null);
            setEngagementData(null);
          }}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar — notification bell lives here for students */}
          {userRole === "student" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "0.75rem 1.5rem 0",
                gap: "0.75rem",
              }}
            >
              <NotificationBell unreadCount={unreadNotifications} />
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto transition-all duration-300 ease-in-out"
            style={{
              padding: "0 1.75rem 2rem",
              paddingTop: userRole === "student" ? "0.5rem" : "1.5rem",
            }}
          >
            {renderPage()}
          </div>
        </div>
      </div>
    </>
  );
}
