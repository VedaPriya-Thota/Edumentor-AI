import { useState } from "react";
import { api } from "../services/api";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        if (res.access_token) {
          localStorage.setItem("access_token", res.access_token);
          onLogin(res.access_token);
        } else {
          setError(res.detail || "Login failed");
        }
      } else {
        const res = await api.register({
          name,
          email,
          password,
          role: role,
        });
        if (res.message) {
          // Success, switch to login
          setIsLogin(true);
          setError("Registration successful! Please sign in.");
        } else {
          setError(res.detail || "Registration failed");
        }
      }
        } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-wrapper { display: flex; height: 100vh; width: 100%; background-color: #050510; color: white; }
        .auth-left { display: none; flex: 1; padding: 4rem; position: relative; overflow: hidden; flex-direction: column; justify-content: center; }
        @media (min-width: 1024px) { .auth-left { display: flex; } }
        .auth-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background: rgba(147, 51, 234, 0.3); border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .auth-content { position: relative; z-index: 10; max-width: 32rem; }
        .auth-logo-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 4rem; }
        .auth-logo { width: 40px; height: 40px; border-radius: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; }
        .auth-title { font-size: 3rem; font-weight: 700; line-height: 1.1; margin-bottom: 1rem; }
        .auth-gradient-text { background: linear-gradient(to right, #c084fc, #9333ea); -webkit-background-clip: text; color: transparent; }
        .auth-desc { color: #9ca3af; font-size: 1.125rem; margin-bottom: 3rem; line-height: 1.6; }
        .auth-features { display: flex; flex-direction: column; gap: 1.5rem; color: #d1d5db; }
        .auth-feature-item { display: flex; align-items: center; gap: 1rem; }
        .auth-bullet { width: 24px; height: 24px; border-radius: 50%; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.3); }
        
        .auth-right { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; background: #0a0a14; position: relative; z-index: 10; border-left: 1px solid rgba(255,255,255,0.05); }
        .auth-form-container { width: 100%; max-width: 28rem; }
        .auth-tabs { display: flex; gap: 2rem; border-bottom: 1px solid #1f2937; margin-bottom: 2.5rem; font-size: 1.125rem; }
        .auth-tab-active { padding-bottom: 1rem; font-weight: 600; color: white; border-bottom: 2px solid #a855f7; border-top: none; border-left: none; border-right: none; background: transparent; cursor: pointer; }
        .auth-tab-inactive { padding-bottom: 1rem; font-weight: 500; color: #6b7280; border: none; background: transparent; cursor: pointer; }
        .auth-form-title { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; }
        .auth-form-subtitle { color: #9ca3af; margin-bottom: 2rem; }
        
        .auth-form-group { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .auth-label { font-size: 0.875rem; font-weight: 500; color: #d1d5db; }
        .auth-input { width: 100%; background: #0d0d1a; border: 1px solid #1f2937; border-radius: 8px; padding: 0.75rem 1rem; color: white; transition: all 0.2s; }
        .auth-input:focus { outline: none; border-color: #a855f7; box-shadow: 0 0 0 1px #a855f7; }
        
        .auth-submit { width: 100%; background: linear-gradient(135deg, #9333ea 0%, #6366f1 100%); color: #fff; font-weight: 600; border-radius: 10px; padding: 0.8rem 1rem; margin-top: 1rem; border: none; cursor: pointer; transition: all 0.22s; box-shadow: 0 4px 20px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.2); letter-spacing: 0.01em; }
        .auth-submit:hover:not(:disabled) { transform: translateY(-2px) scale(1.01); box-shadow: 0 8px 28px rgba(139,92,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25); }
        .auth-submit:active:not(:disabled) { transform: translateY(0) scale(0.99); }
        .auth-submit:disabled { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.3); }
      `}</style>
      <div className="auth-wrapper">
        {/* LEFT SIDE - BRANDING */}
        <div className="auth-left">
          <div className="auth-glow"></div>

          <div className="auth-content">
            <div className="auth-logo-row">
              <div className="auth-logo">💜</div>
              <h1 style={{fontSize: '1.5rem', fontWeight: 'bold'}}>EduMentor AI</h1>
            </div>

            <h2 className="auth-title">
              Unlock Your <br />
              <span className="auth-gradient-text">
                Learning Potential
              </span>
            </h2>
            
            <p className="auth-desc">
              Your intelligent companion for mastering difficult concepts, tracking
              progress, and elevating your academic performance.
            </p>

            <div className="auth-features">
              <div className="auth-feature-item">
                <div className="auth-bullet"></div>
                <span>24/7 Context-Aware AI Mentor</span>
              </div>
              <div className="auth-feature-item">
                <div className="auth-bullet"></div>
                <span>Personalized Performance Analytics</span>
              </div>
              <div className="auth-feature-item">
                <div className="auth-bullet"></div>
                <span>Adaptive Quizzes & Weakness Targeting</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div className="auth-right">
          <div className="auth-form-container">
            {/* TABS */}
            <div className="auth-tabs">
              <button 
                type="button"
                className={role === "student" ? "auth-tab-active" : "auth-tab-inactive"}
                onClick={() => setRole("student")}
              >
                Student Profile
              </button>
              <button 
                type="button"
                className={role === "instructor" ? "auth-tab-active" : "auth-tab-inactive"}
                onClick={() => setRole("instructor")}
              >
                Instructor Access
              </button>
            </div>

            {/* HEADINGS */}
            <h3 className="auth-form-title">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h3>
            <p className="auth-form-subtitle">
              {isLogin
                ? "Enter your details to continue your learning journey."
                : "Sign up to start tracking your progress and studying smarter."}
            </p>

            {/* ERROR DISPLAY */}
            {error && (
              <div style={{padding: '1rem', marginBottom: '1.5rem', borderRadius: '8px', fontSize: '0.875rem', background: error.includes('successful') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: error.includes('successful') ? '#4ade80' : '#f87171', border: error.includes('successful') ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'}}>
                {error}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="auth-form-group">
                  <label className="auth-label">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="auth-input"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div className="auth-form-group">
                <label className="auth-label">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  placeholder="student@university.edu"
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="••••••••"
                />
              </div>

              {isLogin && (
                <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                  <button
                    type="button"
                    style={{fontSize: '0.875rem', color: '#c084fc', background: 'transparent', border: 'none', cursor: 'pointer'}}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
              >
                {loading
                  ? "Processing..."
                  : isLogin
                  ? "Sign In to Dashboard"
                  : "Create Account"}
              </button>
            </form>

            {/* FOOTER */}
            <div style={{marginTop: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem'}}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                style={{color: '#c084fc', fontWeight: '500', background: 'transparent', border: 'none', cursor: 'pointer'}}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
