/**
 * Forgot Password Page - Request password reset
 */

import React, { useState } from "react";
import { auth } from "../lib/api";

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
      await auth.forgotPassword(email);
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
        <style>{styles}</style>
      </div>
    );
  }
