/**
 * Roundtable Page - Multi-AI discussion sessions
 */

import React, { useState, useEffect } from "react";
import { roundtable } from "../lib/api";
import { useToast } from "../contexts/ToastContext";
import type { NavigateFn, NavigateOptions } from "../App";

interface Session {
  id: string;
  topic: string;
  status: "active" | "completed" | "paused";
  participants: string[];
  messageCount: number;
  createdAt: string;
}

interface RoundtablePageProps {
  onNavigate: NavigateFn;
  pendingModal: NavigateOptions | null;
  onModalHandled: () => void;
}

export function RoundtablePage({ onNavigate, pendingModal, onModalHandled }: RoundtablePageProps) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({
    topic: "",
    participants: ["openai", "anthropic"],
  });

  const aiParticipants = [
    { id: "openai", name: "GPT-4", color: "#10a37f" },
    { id: "anthropic", name: "Claude", color: "#d97706" },
    { id: "google", name: "Gemini", color: "#4285f4" },
    { id: "groq", name: "Llama", color: "#f97316" },
    { id: "perplexity", name: "Perplexity", color: "#8b5cf6" },
  ];

  useEffect(() => {
    loadSessions();
  }, []);

  // Handle pending modal from navigation
  useEffect(() => {
    if (pendingModal?.openModal === "create") {
      setShowCreate(true);
      onModalHandled();
    }
  }, [pendingModal, onModalHandled]);

  const loadSessions = async () => {
    try {
      const data = await roundtable.getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      showToast("error", "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.topic.trim() || newSession.participants.length < 2) return;

    try {
      await roundtable.createSession(newSession);
      setShowCreate(false);
      setNewSession({ topic: "", participants: ["openai", "anthropic"] });
      showToast("success", "Roundtable started!");
      loadSessions();
    } catch (err) {
      console.error("Failed to create session:", err);
      showToast("error", "Failed to start roundtable");
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
    <div className="roundtable-page">
      <div className="page-header">
        <div>
          <h2>AI Roundtable</h2>
          <p className="subtitle">Create discussions between multiple AI models</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Roundtable
        </button>
      </div>

      {/* How it works */}
      <div className="info-card">
        <h3>How Roundtable Works</h3>
        <div className="info-steps">
          <div className="info-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Choose a Topic</h4>
              <p>Define a question or problem for the AIs to discuss</p>
            </div>
          </div>
          <div className="info-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Select Participants</h4>
              <p>Pick 2+ AI models to join the discussion</p>
            </div>
          </div>
          <div className="info-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Watch & Learn</h4>
              <p>AIs debate and build on each other's ideas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sessions</h3>
          <span className="badge badge-info">{sessions.length} total</span>
        </div>
        {sessions.length === 0 ? (
          <div className="empty-state-small">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-icon">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No roundtable sessions yet</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              Start Your First Roundtable
            </button>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="session-main">
                  <h4 className="session-topic">{session.topic}</h4>
                  <div className="session-participants">
                    {session.participants.map((p, i) => {
                      const participant = aiParticipants.find(ap => ap.id === p);
                      return (
                        <span
                          key={i}
                          className="participant-badge"
                          style={{ backgroundColor: participant?.color + "20", color: participant?.color }}
                        >
                          {participant?.name || p}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="session-meta">
                  <span className={`badge badge-${session.status === "active" ? "success" : session.status === "paused" ? "warning" : "neutral"}`}>
                    {session.status}
                  </span>
                  <span className="message-count">{session.messageCount || 0} messages</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Start New Roundtable</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="label">Discussion Topic</label>
                <textarea
                  className="input textarea"
                  value={newSession.topic}
                  onChange={(e) => setNewSession({ ...newSession, topic: e.target.value })}
                  placeholder="What should the AIs discuss? e.g., 'Best practices for API design' or 'Pros and cons of microservices'"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Select Participants (min 2)</label>
                <div className="participants-grid">
                  {aiParticipants.map((ai) => (
                    <label
                      key={ai.id}
                      className={`participant-option ${newSession.participants.includes(ai.id) ? "selected" : ""}`}
                      style={{ borderColor: newSession.participants.includes(ai.id) ? ai.color : undefined }}
                    >
                      <input
                        type="checkbox"
                        checked={newSession.participants.includes(ai.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSession({ ...newSession, participants: [...newSession.participants, ai.id] });
                          } else {
                            setNewSession({ ...newSession, participants: newSession.participants.filter(p => p !== ai.id) });
                          }
                        }}
                      />
                      <span className="participant-dot" style={{ backgroundColor: ai.color }} />
                      <span>{ai.name}</span>
                    </label>
                  ))}
                </div>
                {newSession.participants.length < 2 && (
                  <p className="form-hint">Select at least 2 participants</p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={newSession.participants.length < 2}
                >
                  Start Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .roundtable-page {
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
        .info-card {
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.1) 100%);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
        }
        .info-card h3 {
          margin-bottom: 1.25rem;
        }
        .info-steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
        }
        .info-step {
          display: flex;
          gap: 1rem;
        }
        .step-number {
          width: 32px;
          height: 32px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .step-content h4 {
          font-size: 0.9375rem;
          margin-bottom: 0.25rem;
        }
        .step-content p {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .session-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .session-item:hover {
          background: var(--bg-hover);
        }
        .session-topic {
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .session-participants {
          display: flex;
          gap: 0.5rem;
        }
        .participant-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .session-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .message-count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .empty-state-small {
          text-align: center;
          padding: 3rem 2rem;
        }
        .empty-icon {
          width: 48px;
          height: 48px;
          color: var(--text-dim);
          margin-bottom: 1rem;
        }
        .empty-state-small p {
          color: var(--text-muted);
          margin-bottom: 1rem;
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
        .participants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.5rem;
        }
        .participant-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: var(--bg-dark);
          border: 2px solid var(--border);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .participant-option:hover {
          background: var(--bg-hover);
        }
        .participant-option.selected {
          background: var(--primary-light);
        }
        .participant-option input {
          display: none;
        }
        .participant-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .form-hint {
          font-size: 0.75rem;
          color: var(--warning);
          margin-top: 0.5rem;
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
