/**
 * Reset Password Page - Set new password from email link
 */

import React, { useState } from "react";

interface ResetPasswordPageProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function ResetPasswordPage({ token, onSuccess, onBack }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Simulate API call - in production, this would call auth.resetPassword(token, password)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Reset password with token:", token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your new password below.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="password" className="label">New Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoFocus
            />
          </div>

          <div className="password-requirements">
            {passwordRequirements.map((req, i) => (
              <div key={i} className={`requirement ${req.met ? "met" : ""}`}>
                <span className="requirement-icon">{req.met ? "✓" : "○"}</span>
                <span>{req.label}</span>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
            {confirmPassword && !passwordsMatch && (
              <span className="field-error">Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            style={{ width: "100%" }}
          >
            {loading ? <span className="spinner" /> : "Reset Password"}
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
        .password-requirements {
          background: var(--bg-dark);
          border-radius: 0.5rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
        }
        .requirement {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          padding: 0.25rem 0;
        }
        .requirement.met {
          color: var(--success);
        }
        .requirement-icon {
          width: 16px;
          text-align: center;
        }
        .field-error {
          display: block;
          color: var(--error);
          font-size: 0.75rem;
          margin-top: 0.25rem;
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
