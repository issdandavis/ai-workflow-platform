/**
 * Dashboard Page - Overview and recent activity
 */

import React, { useState, useEffect } from "react";
import { dashboard, ai, audit } from "../lib/api";

interface Stats {
  usage: { totalTokens: number; totalCostUsd: number; periodDays: number };
  integrations: { total: number; connected: number };
  roundtables: { total: number; active: number };
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, providersData, activityData] = await Promise.all([
        dashboard.getStats().catch(() => null),
        ai.getProviders().catch(() => ({ providers: [] })),
        audit.getLogs(10).catch(() => []),
      ]);
      setStats(statsData);
      setProviders(providersData.providers || []);
      setRecentActivity(activityData);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon tokens">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.usage.totalTokens.toLocaleString() || 0}</div>
            <div className="stat-label">Tokens Used (30d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M8 10h8M8 14h8" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">${stats?.usage.totalCostUsd.toFixed(2) || "0.00"}</div>
            <div className="stat-label">Estimated Cost (30d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon integrations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.integrations.connected || 0}/{stats?.integrations.total || 0}</div>
            <div className="stat-label">Active Integrations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon roundtables">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.roundtables.active || 0}</div>
            <div className="stat-label">Active Roundtables</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* AI Providers */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">AI Providers</h3>
            <span className="badge badge-info">{providers.length} available</span>
          </div>
          <div className="providers-list">
            {providers.length === 0 ? (
              <p className="empty-text">No providers configured</p>
            ) : (
              providers.map((provider: any, i: number) => (
                <div key={i} className="provider-item">
                  <div className="provider-info">
                    <span className="provider-name">{provider.name || provider.provider}</span>
                    <span className="provider-model">{provider.model || "default"}</span>
                  </div>
                  <span className={`badge ${provider.available ? "badge-success" : "badge-neutral"}`}>
                    {provider.available ? "Ready" : "Unavailable"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
          </div>
          <div className="activity-list">
            {recentActivity.length === 0 ? (
              <p className="empty-text">No recent activity</p>
            ) : (
              recentActivity.map((log: any, i: number) => (
                <div key={i} className="activity-item">
                  <div className="activity-icon">
                    <span className={`status-dot status-dot-${getActionColor(log.action)}`} />
                  </div>
                  <div className="activity-content">
                    <span className="activity-action">{formatAction(log.action)}</span>
                    {log.target && <span className="activity-target">{log.target}</span>}
                  </div>
                  <span className="activity-time">{formatTime(log.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card quick-actions">
        <h3 className="card-title">Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Start AI Chat</span>
          </button>
          <button className="action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
            </svg>
            <span>Launch Fleet Mission</span>
          </button>
          <button className="action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Create Roundtable</span>
          </button>
          <button className="action-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>New Project</span>
          </button>
        </div>
      </div>

      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon svg {
          width: 24px;
          height: 24px;
        }
        .stat-icon.tokens {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
        }
        .stat-icon.cost {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }
        .stat-icon.integrations {
          background: rgba(59, 130, 246, 0.1);
          color: var(--info);
        }
        .stat-icon.roundtables {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .stat-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }
        .providers-list, .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .provider-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .provider-info {
          display: flex;
          flex-direction: column;
        }
        .provider-name {
          font-weight: 500;
          text-transform: capitalize;
        }
        .provider-model {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
        }
        .activity-icon {
          width: 24px;
          display: flex;
          justify-content: center;
        }
        .activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .activity-action {
          font-size: 0.875rem;
        }
        .activity-target {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .activity-time {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .empty-text {
          color: var(--text-muted);
          font-size: 0.875rem;
          text-align: center;
          padding: 1rem;
        }
        .quick-actions {
          margin-top: 0.5rem;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 1rem;
          background: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          color: var(--text);
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .action-btn svg {
          width: 28px;
          height: 28px;
          color: var(--primary);
        }
        .action-btn span {
          font-size: 0.875rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getActionColor(action: string): string {
  if (action.includes("created") || action.includes("connected")) return "success";
  if (action.includes("deleted") || action.includes("disconnected")) return "error";
  if (action.includes("updated") || action.includes("changed")) return "warning";
  return "info";
}

function formatTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
