/**
 * Project Detail Component - View and edit project details
 */

import React, { useState, useEffect } from "react";
import { projects, agents } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";

interface ProjectDetailProps {
  projectId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface AgentRun {
  id: string;
  status: string;
  goal: string;
  provider: string;
  createdAt: string;
}

export function ProjectDetail({ projectId, onClose, onUpdate }: ProjectDetailProps) {
  const { showToast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runGoal, setRunGoal] = useState("");
  const [startingRun, setStartingRun] = useState(false);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const data = await projects.get(projectId);
      setProject(data);
      setEditData({ name: data.name, description: data.description || "" });
    } catch (err) {
      console.error("Failed to load project:", err);
      showToast("error", "Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editData.name.trim()) return;
    setSaving(true);
    try {
      await projects.update(projectId, editData);
      setProject({ ...project, ...editData });
      setEditing(false);
      showToast("success", "Project updated");
      onUpdate();
    } catch (err) {
      console.error("Failed to update project:", err);
      showToast("error", "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runGoal.trim()) return;
    setStartingRun(true);
    try {
      await agents.run({ projectId, goal: runGoal });
      setShowRunModal(false);
      setRunGoal("");
      showToast("success", "Agent run started!");
      loadProject();
    } catch (err) {
      console.error("Failed to start run:", err);
      showToast("error", "Failed to start agent run");
    } finally {
      setStartingRun(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <p>Project not found</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            {editing ? (
              <input
                type="text"
                className="input title-input"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                autoFocus
              />
            ) : (
              <h2>{project.name}</h2>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="modal-body">
            <div className="project-meta-row">
              <span className="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <span className="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {project.agentRuns?.length || 0} runs
              </span>
            </div>

            <div className="section">
              <label className="label">Description</label>
              {editing ? (
                <textarea
                  className="input textarea"
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Add a description..."
                  rows={3}
                />
              ) : (
                <p className="description-text">
                  {project.description || "No description"}
                </p>
              )}
            </div>

            <div className="section">
              <div className="section-header">
                <h3>Agent Runs</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowRunModal(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Start Run
                </button>
              </div>
              {!project.agentRuns || project.agentRuns.length === 0 ? (
                <div className="empty-runs">
                  <p>No agent runs yet</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowRunModal(true)}>
                    Start your first run
                  </button>
                </div>
              ) : (
                <div className="runs-list">
                  {project.agentRuns.map((run: AgentRun) => (
                    <div key={run.id} className="run-item">
                      <div className="run-info">
                        <span className="run-goal">{run.goal}</span>
                        <span className="run-meta">
                          {run.provider} • {new Date(run.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span className={`badge badge-${getStatusBadge(run.status)}`}>
                        {run.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {editing ? (
              <>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="spinner" /> : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={() => setEditing(true)}>
                  Edit Project
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Start Run Modal */}
      {showRunModal && (
        <div className="modal-overlay" style={{ zIndex: 210 }} onClick={() => setShowRunModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Start Agent Run</h3>
            <form onSubmit={handleStartRun}>
              <div className="form-group">
                <label className="label">Goal</label>
                <textarea
                  className="input textarea"
                  value={runGoal}
                  onChange={(e) => setRunGoal(e.target.value)}
                  placeholder="What should the AI agent accomplish?"
                  rows={4}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRunModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={startingRun}>
                  {startingRun ? <span className="spinner" /> : "Start Run"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-lg {
          max-width: 600px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
        }
        .title-input {
          font-size: 1.5rem;
          font-weight: 600;
          padding: 0.5rem;
          flex: 1;
          margin-right: 1rem;
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .project-meta-row {
          display: flex;
          gap: 1.5rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }
        .description-text {
          color: var(--text-muted);
          font-size: 0.9375rem;
          line-height: 1.5;
        }
        .empty-runs {
          text-align: center;
          padding: 2rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .empty-runs p {
          color: var(--text-muted);
          margin-bottom: 1rem;
        }
        .runs-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .run-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.875rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .run-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .run-goal {
          font-size: 0.9375rem;
          font-weight: 500;
        }
        .run-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }
      `}</style>
    </>
  );
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "completed": return "success";
    case "running": return "warning";
    case "failed": return "error";
    default: return "neutral";
  }
}
