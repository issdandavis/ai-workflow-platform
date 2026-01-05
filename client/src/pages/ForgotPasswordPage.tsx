/**
 * Forgot Password Page - Request password reset
 */

import React, { useState } from "react";

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simulate API call - in production, this would call auth.forgotPassword(email)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="success-icon">✓</div>
          <h1>Check Your Email</h1>
          <p className="auth-subtitle">
            If an account exists for {email}, you'll receive a password reset link shortly.
          </p>
          <button className="btn btn-primary" onClick={onBack} style={{ width: "100%", marginTop: "1.5rem" }}>
            Back to Login
          </button>
        </div>
        <style>{`
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: var(--bg-dark);
          }
          .auth-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 2rem;
            width: 100%;
            max-width: 400px;
            text-align: center;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: var(--success);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1.5rem;
          }
          .auth-card h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
          }
          .auth-subtitle {
            color: var(--text-muted);
            font-size: 0.9375rem;
            line-height: 1.5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
            {loading ? <span className="spinner" /> : "Send Reset Link"}
          </button>
        </form>

        <button className="back-link" onClick={onBack}>
          ← Back to Login
        </button>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: var(--bg-dark);
        }
        .auth-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 2rem;
          width: 100%;
          max-width: 400px;
        }
        .auth-card h1 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        .auth-subtitle {
          color: var(--text-muted);
          font-size: 0.9375rem;
          text-align: center;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          padding: 0.75rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .back-link {
          display: block;
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.875rem;
          cursor: pointer;
          text-align: center;
        }
        .back-link:hover {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
