/**
 * Settings Page - Profile, API keys, preferences
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { vault, auth } from "../lib/api";

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "apikeys" | "usage">("profile");
  const [credentials, setCredentials] = useState<any[]>([]);
  const [supportedProviders, setSupportedProviders] = useState<string[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Password change state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // New API key state
  const [newKey, setNewKey] = useState({ provider: "", apiKey: "", label: "" });
  const [keyError, setKeyError] = useState("");

  useEffect(() => {
    if (activeTab === "apikeys") {
      loadCredentials();
    } else if (activeTab === "usage") {
      loadUsage();
    }
  }, [activeTab]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const data = await vault.getCredentials();
      setCredentials(data.credentials || []);
      setSupportedProviders(data.supportedProviders || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    setLoading(true);
    try {
      const data = await vault.getUsage();
      setUsage(data);
    } catch (err) {
      console.error("Failed to load usage:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwords.new.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    try {
      await auth.changePassword(passwords.current, passwords.new);
      setPasswordSuccess(true);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError("");

    if (!newKey.provider || !newKey.apiKey) {
      setKeyError("Provider and API key are required");
      return;
    }

    try {
      await vault.storeCredential(newKey.provider, newKey.apiKey, newKey.label);
      setNewKey({ provider: "", apiKey: "", label: "" });
      loadCredentials();
    } catch (err: any) {
      setKeyError(err.message || "Failed to store API key");
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    try {
      await vault.deleteCredential(id);
      loadCredentials();
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile
        </button>
        <button
          className={`tab ${activeTab === "apikeys" ? "active" : ""}`}
          onClick={() => setActiveTab("apikeys")}
        >
          API Keys
        </button>
        <button
          className={`tab ${activeTab === "usage" ? "active" : ""}`}
          onClick={() => setActiveTab("usage")}
        >
          Usage
        </button>
      </div>

      <div className="settings-content">
        {activeTab === "profile" && (
          <div className="settings-section">
            <div className="card">
              <h3 className="card-title">Profile Information</h3>
              <div className="profile-info">
                <div className="profile-avatar">
                  {user?.email[0].toUpperCase()}
                </div>
                <div className="profile-details">
                  <div className="info-row">
                    <span className="info-label">Email</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Role</span>
                    <span className="info-value">{user?.role}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Account Type</span>
                    <span className="info-value">{user?.isGuest ? "Guest" : "Registered"}</span>
                  </div>
                </div>
              </div>
            </div>

            {!user?.isGuest && (
              <div className="card">
                <h3 className="card-title">Change Password</h3>
                <form onSubmit={handlePasswordChange}>
                  {passwordError && <div className="error-message">{passwordError}</div>}
                  {passwordSuccess && <div className="success-message">Password changed successfully!</div>}
                  <div className="form-group">
                    <label className="label">Current Password</label>
                    <input
                      type="password"
                      className="input"
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Update Password
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === "apikeys" && (
          <div className="settings-section">
            <div className="card">
              <h3 className="card-title">Add API Key</h3>
              <form onSubmit={handleAddKey}>
                {keyError && <div className="error-message">{keyError}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Provider</label>
                    <select
                      className="input"
                      value={newKey.provider}
                      onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                      required
                    >
                      <option value="">Select provider...</option>
                      {supportedProviders.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="label">API Key</label>
                    <input
                      type="password"
                      className="input"
                      value={newKey.apiKey}
                      onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                      placeholder="sk-..."
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Label (optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={newKey.label}
                    onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                    placeholder="My OpenAI Key"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Add API Key
                </button>
              </form>
            </div>

            <div className="card">
              <h3 className="card-title">Stored API Keys</h3>
              {loading ? (
                <div className="loading-small"><div className="spinner" /></div>
              ) : credentials.length === 0 ? (
                <p className="empty-text">No API keys stored yet</p>
              ) : (
                <div className="keys-list">
                  {credentials.map((cred) => (
                    <div key={cred.id} className="key-item">
                      <div className="key-info">
                        <span className="key-provider">{cred.provider}</span>
                        {cred.label && <span className="key-label">{cred.label}</span>}
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteKey(cred.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "usage" && (
          <div className="settings-section">
            <div className="card">
              <h3 className="card-title">Usage Summary (Last 30 Days)</h3>
              {loading ? (
                <div className="loading-small"><div className="spinner" /></div>
              ) : usage ? (
                <div className="usage-stats">
                  <div className="usage-stat">
                    <span className="usage-value">{usage.summary?.totalTokens?.toLocaleString() || 0}</span>
                    <span className="usage-label">Total Tokens</span>
                  </div>
                  <div className="usage-stat">
                    <span className="usage-value">${usage.summary?.totalCostUsd?.toFixed(2) || "0.00"}</span>
                    <span className="usage-label">Estimated Cost</span>
                  </div>
                </div>
              ) : (
                <p className="empty-text">No usage data available</p>
              )}
            </div>

            {usage?.byProvider && Object.keys(usage.byProvider).length > 0 && (
              <div className="card">
                <h3 className="card-title">Usage by Provider</h3>
                <div className="provider-usage-list">
                  {Object.entries(usage.byProvider).map(([provider, data]: [string, any]) => (
                    <div key={provider} className="provider-usage-item">
                      <span className="provider-name">{provider}</span>
                      <div className="provider-stats">
                        <span>{data.tokens?.toLocaleString() || 0} tokens</span>
                        <span>${data.costUsd?.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .settings-page {
          max-width: 800px;
        }
        .settings-page h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }
        .settings-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--bg-card);
          padding: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .tab {
          flex: 1;
          padding: 0.75rem;
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
        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .profile-info {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }
        .profile-avatar {
          width: 64px;
          height: 64px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        .profile-details {
          flex: 1;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--border);
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: var(--text-muted);
        }
        .info-value {
          font-weight: 500;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-row {
          display: flex;
          gap: 1rem;
        }
        .form-row .form-group {
          flex: 1;
        }
        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: var(--success);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .keys-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .key-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .key-provider {
          font-weight: 500;
          text-transform: capitalize;
        }
        .key-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-left: 0.75rem;
        }
        .loading-small {
          display: flex;
          justify-content: center;
          padding: 2rem;
        }
        .empty-text {
          color: var(--text-muted);
          text-align: center;
          padding: 1.5rem;
        }
        .usage-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }
        .usage-stat {
          text-align: center;
          padding: 1.5rem;
          background: var(--bg-dark);
          border-radius: 0.75rem;
        }
        .usage-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
        }
        .usage-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .provider-usage-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .provider-usage-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .provider-name {
          font-weight: 500;
          text-transform: capitalize;
        }
        .provider-stats {
          display: flex;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
