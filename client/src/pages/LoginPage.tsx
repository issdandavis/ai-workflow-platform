/**
 * Login / Register Page
 * Mystical theme with medallion background and triskelion logo
 */

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

type AuthView = "login" | "forgot-password" | "reset-password";

// Triskelion Logo for Login Page
const TriskelionLogo = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className="login-triskelion">
    <defs>
      <linearGradient id="loginGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E5C76B" />
        <stop offset="50%" stopColor="#C9A227" />
        <stop offset="100%" stopColor="#8B7019" />
      </linearGradient>
      <filter id="loginGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feFlood floodColor="#4A90D9" floodOpacity="0.6" />
        <feComposite in2="blur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="48" fill="#0A1628" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="#1E3A5F" strokeWidth="2" />
    <circle cx="50" cy="50" r="44" fill="none" stroke="#C9A227" strokeWidth="1" opacity="0.5" />
    <g transform="translate(50, 50)" filter="url(#loginGlow)">
      <path d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0" fill="none" stroke="url(#loginGold)" strokeWidth="4" strokeLinecap="round" />
      <path d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0" fill="none" stroke="url(#loginGold)" strokeWidth="4" strokeLinecap="round" transform="rotate(120)" />
      <path d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0" fill="none" stroke="url(#loginGold)" strokeWidth="4" strokeLinecap="round" transform="rotate(240)" />
      <circle cx="0" cy="0" r="3" fill="#C9A227" />
    </g>
  </svg>
);

export function LoginPage() {
  const [authView, setAuthView] = useState<AuthView>("login");
  const [resetToken, setResetToken] = useState<string>("");

  // Check URL for reset token on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) {
      setResetToken(token);
      setAuthView("reset-password");
    }
  }, []);

  if (authView === "forgot-password") {
    return <ForgotPasswordPage onBack={() => setAuthView("login")} />;
  }

  if (authView === "reset-password") {
    return (
      <ResetPasswordPage
        token={resetToken}
        onSuccess={() => setAuthView("login")}
        onBack={() => setAuthView("login")}
      />
    );
  }

  return <LoginForm onForgotPassword={() => setAuthView("forgot-password")} />;
}

interface LoginFormProps {
  onForgotPassword: () => void;
}

function LoginForm({ onForgotPassword }: LoginFormProps) {
  const { login, signup, loginAsGuest, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (mode === "signup" && password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      // Error is handled by context
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (err) {
      // Error is handled by context
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="login-page mystical-bg">
      <div className="medallion-overlay" />
      <div className="login-container mystical-card">
        <div className="login-header">
          <TriskelionLogo size={64} />
          <h1 className="mystical-heading">Arcane AI</h1>
          <p>Multi-AI orchestration for your projects</p>
        </div>

        {/* Quick Start - Most Prominent */}
        <button
          className="btn btn-mystical btn-lg quick-start-btn"
          onClick={handleGuestLogin}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : "⚡ Try Free - No Sign Up"}
        </button>
        
        <div className="features-quick">
          <span>🤖 GPT-4, Claude, Gemini</span>
          <span className="divider-dot">•</span>
          <span>🔑 No API keys needed</span>
        </div>

        <div className="runic-divider">
          <span>or sign in for full access</span>
        </div>

        <div className="login-tabs">
          <button
            className={`tab mystical-focus ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); clearError(); setLocalError(""); }}
          >
            Login
          </button>
          <button
            className={`tab mystical-focus ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); clearError(); setLocalError(""); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {displayError && (
            <div className="error-message">{displayError}</div>
          )}

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input mystical-focus"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input mystical-focus"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input mystical-focus"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="btn btn-secondary btn-lg submit-btn arcane-glow" disabled={loading}>
            {loading ? <span className="spinner" /> : mode === "login" ? "Login" : "Create Account"}
          </button>

          {mode === "login" && (
            <button
              type="button"
              className="forgot-password-link"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          )}
        </form>

        <p className="login-footer">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); clearError(); setLocalError(""); }}
          >
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }
        .login-page.mystical-bg {
          background: var(--nebula-gradient, radial-gradient(ellipse at center, #1E3A5F 0%, #0A1628 70%));
        }
        .login-page.mystical-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(74, 144, 217, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(201, 162, 39, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(45, 36, 56, 0.3) 0%, transparent 60%);
          pointer-events: none;
        }
        .medallion-overlay {
          position: absolute;
          inset: 0;
          background-image: url('/medallion-bg.svg');
          background-size: 500px 500px;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          pointer-events: none;
        }
        .login-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }
        .login-container.mystical-card {
          background: var(--card-gradient, linear-gradient(135deg, #2D2438 0%, #1A1625 100%));
          border: 1px solid var(--border-gold, rgba(201, 162, 39, 0.3));
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 
            0 0 40px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(201, 162, 39, 0.1);
        }
        .login-container.mystical-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--mystical-gold, #C9A227) 50%, transparent 100%);
          opacity: 0.6;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-triskelion {
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 20px rgba(74, 144, 217, 0.4));
        }
        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--mystical-gold, #C9A227);
          text-shadow: 0 0 20px rgba(201, 162, 39, 0.3);
        }
        .login-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .quick-start-btn {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
          margin-bottom: 0.75rem;
        }
        .btn-mystical {
          background: linear-gradient(135deg, var(--mystical-purple-deep, #2D2438) 0%, var(--mystical-blue-royal, #1E3A5F) 100%);
          border: 1px solid var(--mystical-gold, #C9A227);
          color: var(--mystical-gold, #C9A227);
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .btn-mystical::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(201, 162, 39, 0.15) 100%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .btn-mystical:hover::before {
          opacity: 1;
        }
        .btn-mystical:hover {
          box-shadow: var(--glow-gold, 0 0 15px rgba(201, 162, 39, 0.4));
        }
        .features-quick {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .divider-dot {
          color: var(--mystical-gold, #C9A227);
        }
        .runic-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.25rem 0;
          color: var(--text-dim);
          font-size: 0.75rem;
        }
        .runic-divider::before,
        .runic-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--mystical-gold, #C9A227) 50%, transparent 100%);
          opacity: 0.5;
        }
        .login-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--mystical-blue-cosmic, #0A1628);
          padding: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .tab {
          flex: 1;
          padding: 0.625rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab:hover {
          color: var(--text);
        }
        .tab.active {
          background: linear-gradient(135deg, var(--mystical-blue-royal, #1E3A5F) 0%, var(--mystical-purple-deep, #2D2438) 100%);
          color: var(--mystical-gold, #C9A227);
          border: 1px solid var(--border-gold, rgba(201, 162, 39, 0.3));
        }
        .mystical-focus:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--bg-dark), 0 0 0 4px var(--mystical-glow, #4A90D9), var(--glow-blue, 0 0 20px rgba(74, 144, 217, 0.3));
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .label {
          color: var(--mystical-gold, #C9A227);
          opacity: 0.9;
        }
        .input {
          background: var(--mystical-blue-cosmic, #0A1628);
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        .input:focus {
          border-color: var(--mystical-glow, #4A90D9);
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .submit-btn {
          margin-top: 0.5rem;
          border: 1px solid var(--border);
        }
        .submit-btn:hover {
          border-color: var(--mystical-glow, #4A90D9);
        }
        .arcane-glow:hover {
          box-shadow: var(--glow-blue, 0 0 20px rgba(74, 144, 217, 0.3));
        }
        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .link-btn {
          background: none;
          border: none;
          color: var(--mystical-gold, #C9A227);
          cursor: pointer;
          font-size: inherit;
        }
        .link-btn:hover {
          text-decoration: underline;
          text-shadow: 0 0 10px rgba(201, 162, 39, 0.3);
        }
        .forgot-password-link {
          display: block;
          width: 100%;
          margin-top: 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.875rem;
          cursor: pointer;
          text-align: center;
        }
        .forgot-password-link:hover {
          color: var(--mystical-gold, #C9A227);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
