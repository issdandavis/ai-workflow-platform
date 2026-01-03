/**
 * Login / Register Page
 */

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
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
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <svg viewBox="0 0 24 24" fill="currentColor" className="login-logo">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h1>AI Workflow Platform</h1>
          <p>Multi-AI orchestration for your projects</p>
        </div>

        <div className="login-tabs">
          <button
            className={`tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); clearError(); setLocalError(""); }}
          >
            Login
          </button>
          <button
            className={`tab ${mode === "signup" ? "active" : ""}`}
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
              className="input"
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
              className="input"
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
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          className="btn btn-secondary btn-lg guest-btn"
          onClick={handleGuestLogin}
          disabled={loading}
        >
          Continue as Guest
        </button>

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
          background: linear-gradient(135deg, var(--bg-dark) 0%, #1a1a2e 100%);
        }
        .login-container {
          width: 100%;
          max-width: 400px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 2rem;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .login-logo {
          width: 48px;
          height: 48px;
          color: var(--primary);
          margin-bottom: 1rem;
        }
        .login-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .login-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .login-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--bg-dark);
          padding: 0.25rem;
          border-radius: 0.5rem;
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
          background: var(--primary);
          color: white;
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
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
          color: var(--text-dim);
          font-size: 0.8125rem;
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .guest-btn {
          width: 100%;
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
          color: var(--primary);
          cursor: pointer;
          font-size: inherit;
        }
        .link-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
