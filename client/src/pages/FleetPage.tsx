/**
 * Fleet Engine Page - Multi-AI parallel collaboration
 */

import React, { useState, useEffect } from "react";
import { fleet } from "../lib/api";

interface Mission {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  agents: string[];
  progress: number;
  createdAt: string;
}

export function FleetPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [fleetStatus, setFleetStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newMission, setNewMission] = useState({
    name: "",
    goal: "",
    agents: ["openai", "anthropic"],
  });

  useEffect(() => {
    loadFleetData();
  }, []);

  const loadFleetData = async () => {
    try {
      const [statusData, missionsData] = await Promise.all([
        fleet.getStatus().catch(() => null),
        fleet.getMissions().catch(() => []),
      ]);
      setFleetStatus(statusData);
      setMissions(missionsData);
    } catch (err) {
      console.error("Failed to load fleet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fleet.createMission(newMission);
      setShowCreate(false);
      setNewMission({ name: "", goal: "", agents: ["openai", "anthropic"] });
      loadFleetData();
    } catch (err) {
      console.error("Failed to create mission:", err);
    }
  };

  const availableAgents = [
    { id: "openai", name: "OpenAI GPT-4", icon: "🤖" },
    { id: "anthropic", name: "Anthropic Claude", icon: "🧠" },
    { id: "google", name: "Google Gemini", icon: "✨" },
    { id: "groq", name: "Groq Llama", icon: "⚡" },
    { id: "perplexity", name: "Perplexity", icon: "🔍" },
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div>
          <h2>Fleet Engine</h2>
          <p className="subtitle">Orchestrate multiple AI agents working in parallel</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Mission
        </button>
      </div>

      {/* Fleet Status */}
      <div className="status-cards">
        <div className="status-card">
          <div className="status-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
            </svg>
          </div>
          <div className="status-info">
            <span className="status-value">{fleetStatus?.activeAgents || 0}</span>
            <span className="status-label">Active Agents</span>
          </div>
        </div>
        <div className="status-card">
          <div className="status-icon running">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="status-info">
            <span className="status-value">{missions.filter(m => m.status === "running").length}</span>
            <span className="status-label">Running Missions</span>
          </div>
        </div>
        <div className="status-card">
          <div className="status-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="status-info">
            <span className="status-value">{missions.filter(m => m.status === "completed").length}</span>
            <span className="status-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Available Agents */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Agents</h3>
        </div>
        <div className="agents-grid">
          {availableAgents.map((agent) => (
            <div key={agent.id} className="agent-card">
              <span className="agent-icon">{agent.icon}</span>
              <span className="agent-name">{agent.name}</span>
              <span className="badge badge-success">Ready</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missions List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Missions</h3>
        </div>
        {missions.length === 0 ? (
          <div className="empty-state-small">
            <p>No missions yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="missions-list">
            {missions.map((mission) => (
              <div key={mission.id} className="mission-item">
                <div className="mission-info">
                  <h4 className="mission-name">{mission.name}</h4>
                  <div className="mission-agents">
                    {mission.agents.map((agent, i) => (
                      <span key={i} className="agent-tag">{agent}</span>
                    ))}
                  </div>
                </div>
                <div className="mission-status">
                  <span className={`badge badge-${getStatusBadge(mission.status)}`}>
                    {mission.status}
                  </span>
                  {mission.status === "running" && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${mission.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Mission Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Mission</h3>
            <form onSubmit={handleCreateMission}>
              <div className="form-group">
                <label className="label">Mission Name</label>
                <input
                  type="text"
                  className="input"
                  value={newMission.name}
                  onChange={(e) => setNewMission({ ...newMission, name: e.target.value })}
                  placeholder="Code Review Mission"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Goal</label>
                <textarea
                  className="input textarea"
                  value={newMission.goal}
                  onChange={(e) => setNewMission({ ...newMission, goal: e.target.value })}
                  placeholder="Describe what you want the agents to accomplish..."
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Select Agents</label>
                <div className="agent-checkboxes">
                  {availableAgents.map((agent) => (
                    <label key={agent.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newMission.agents.includes(agent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMission({ ...newMission, agents: [...newMission.agents, agent.id] });
                          } else {
                            setNewMission({ ...newMission, agents: newMission.agents.filter(a => a !== agent.id) });
                          }
                        }}
                      />
                      <span>{agent.icon} {agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Launch Mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .fleet-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .page-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .status-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .status-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .status-icon {
          width: 48px;
          height: 48px;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status-icon svg {
          width: 24px;
          height: 24px;
        }
        .status-icon.active {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
        }
        .status-icon.running {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
        }
        .status-icon.completed {
          background: rgba(34, 197, 94, 0.1);
          color: var(--success);
        }
        .status-value {
          font-size: 1.5rem;
          font-weight: 700;
          display: block;
        }
        .status-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .agents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 0.75rem;
        }
        .agent-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .agent-icon {
          font-size: 1.25rem;
        }
        .agent-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .missions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .mission-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .mission-name {
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .mission-agents {
          display: flex;
          gap: 0.5rem;
        }
        .agent-tag {
          padding: 0.25rem 0.5rem;
          background: var(--bg-hover);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          text-transform: capitalize;
        }
        .mission-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .progress-bar {
          width: 100px;
          height: 4px;
          background: var(--bg-hover);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s;
        }
        .empty-state-small {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1rem;
        }
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          width: 100%;
          max-width: 500px;
        }
        .modal h3 {
          font-size: 1.25rem;
          margin-bottom: 1.5rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .agent-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          cursor: pointer;
        }
        .checkbox-label:hover {
          background: var(--bg-dark);
          border-radius: 0.375rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "running": return "warning";
    case "completed": return "success";
    case "failed": return "error";
    default: return "neutral";
  }
}
