/**
 * Mission Detail Component - View mission progress and results
 */

import React, { useState, useEffect, useRef } from "react";
import { fleet } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";

interface MissionDetailProps {
  missionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface AgentResult {
  agent: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  startedAt?: string;
  completedAt?: string;
}

export function MissionDetail({ missionId, onClose, onUpdate }: MissionDetailProps) {
  const { showToast } = useToast();
  const [mission, setMission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMission();
    // Poll for updates if mission is running
    pollRef.current = setInterval(() => {
      if (mission?.status === "running") {
        loadMission();
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [missionId]);

  const loadMission = async () => {
    try {
      const data = await fleet.getMission(missionId);
      setMission(data);
      // Stop polling if completed
      if (data.status !== "running" && pollRef.current) {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      console.error("Failed to load mission:", err);
      showToast("error", "Failed to load mission details");
    } finally {
      setLoading(false);
    }
  };

  const getAgentIcon = (agent: string) => {
    const icons: Record<string, string> = {
      openai: "🤖",
      anthropic: "🧠",
      google: "✨",
      groq: "⚡",
      perplexity: "🔍",
    };
    return icons[agent] || "🔮";
  };

  const getAgentName = (agent: string) => {
    const names: Record<string, string> = {
      openai: "GPT-4",
      anthropic: "Claude",
      google: "Gemini",
      groq: "Llama",
      perplexity: "Perplexity",
    };
    return names[agent] || agent;
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

  if (!mission) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <p>Mission not found</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const agentResults: AgentResult[] = mission.agentResults || 
    mission.agents?.map((a: string) => ({ agent: a, status: "pending" })) || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{mission.name}</h2>
            <span className={`badge badge-${getStatusBadge(mission.status)}`}>
              {mission.status}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Goal */}
          <div className="section">
            <label className="label">Mission Goal</label>
            <p className="goal-text">{mission.goal}</p>
          </div>

          {/* Progress */}
          {mission.status === "running" && (
            <div className="progress-section">
              <div className="progress-bar-lg">
                <div 
                  className="progress-fill" 
                  style={{ width: `${mission.progress || 0}%` }} 
                />
              </div>
              <span className="progress-text">{mission.progress || 0}% complete</span>
            </div>
          )}

          {/* Agent Results */}
          <div className="section">
            <h3>Agent Progress</h3>
            <div className="agents-results">
              {agentResults.map((result: AgentResult, i: number) => (
                <div key={i} className={`agent-result agent-result-${result.status}`}>
                  <div className="agent-header">
                    <span className="agent-icon">{getAgentIcon(result.agent)}</span>
                    <span className="agent-name">{getAgentName(result.agent)}</span>
                    <span className={`badge badge-${getStatusBadge(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  {result.status === "running" && (
                    <div className="agent-thinking">
                      <div className="thinking-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <span>Thinking...</span>
                    </div>
                  )}
                  {result.output && (
                    <div className="agent-output">
                      <pre>{result.output}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Result */}
          {mission.status === "completed" && mission.finalResult && (
            <div className="section">
              <h3>Synthesized Result</h3>
              <div className="final-result">
                <pre>{mission.finalResult}</pre>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        .modal-xl {
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .modal-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .section h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .goal-text {
          color: var(--text-muted);
          line-height: 1.5;
          padding: 1rem;
          background: var(--bg-dark);
          border-radius: 0.5rem;
        }
        .progress-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .progress-bar-lg {
          flex: 1;
          height: 8px;
          background: var(--bg-dark);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--success));
          transition: width 0.5s ease;
        }
        .progress-text {
          font-size: 0.875rem;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .agents-results {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .agent-result {
          background: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem;
        }
        .agent-result-running {
          border-color: var(--warning);
        }
        .agent-result-completed {
          border-color: var(--success);
        }
        .agent-result-failed {
          border-color: var(--error);
        }
        .agent-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .agent-icon {
          font-size: 1.5rem;
        }
        .agent-name {
          font-weight: 500;
          flex: 1;
        }
        .agent-thinking {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.75rem;
          color: var(--text-muted);
          font-size: 0.875rem;
        }
        .thinking-dots {
          display: flex;
          gap: 4px;
        }
        .thinking-dots span {
          width: 6px;
          height: 6px;
          background: var(--warning);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
        .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .agent-output, .final-result {
          margin-top: 0.75rem;
          padding: 1rem;
          background: var(--bg-card);
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        .agent-output pre, .final-result pre {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .final-result {
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(34, 197, 94, 0.1) 100%);
          border: 1px solid var(--success);
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
    </div>
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
