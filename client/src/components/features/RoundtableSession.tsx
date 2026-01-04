/**
 * Roundtable Session Component - View and participate in AI discussions
 */

import React, { useState, useEffect, useRef } from "react";
import { roundtable } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";

interface RoundtableSessionProps {
  sessionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface Message {
  id: string;
  participant: string;
  content: string;
  createdAt: string;
}

const aiParticipants: Record<string, { name: string; color: string }> = {
  openai: { name: "GPT-4", color: "#10a37f" },
  anthropic: { name: "Claude", color: "#d97706" },
  google: { name: "Gemini", color: "#4285f4" },
  groq: { name: "Llama", color: "#f97316" },
  perplexity: { name: "Perplexity", color: "#8b5cf6" },
  user: { name: "You", color: "#6366f1" },
};

export function RoundtableSession({ sessionId, onClose, onUpdate }: RoundtableSessionProps) {
  const { showToast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSession();
    // Poll for new messages if session is active
    pollRef.current = setInterval(() => {
      if (session?.status === "active") {
        loadSession();
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async () => {
    try {
      const data = await roundtable.getSession(sessionId);
      setSession(data);
      setMessages(data.messages || []);
      // Simulate current speaker for active sessions
      if (data.status === "active" && data.participants?.length > 0) {
        const speakerIndex = Math.floor(Date.now() / 5000) % data.participants.length;
        setCurrentSpeaker(data.participants[speakerIndex]);
      } else {
        setCurrentSpeaker(null);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      showToast("error", "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || sending) return;

    setSending(true);
    try {
      await roundtable.addMessage(sessionId, userInput);
      setUserInput("");
      loadSession();
    } catch (err) {
      console.error("Failed to send message:", err);
      showToast("error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getParticipantInfo = (participant: string) => {
    return aiParticipants[participant] || { name: participant, color: "#6b7280" };
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <p>Session not found</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="session-header">
          <div>
            <h2>{session.topic}</h2>
            <div className="session-participants">
              {session.participants?.map((p: string) => {
                const info = getParticipantInfo(p);
                return (
                  <span
                    key={p}
                    className="participant-chip"
                    style={{ backgroundColor: info.color + "20", color: info.color }}
                  >
                    {info.name}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="session-controls">
            <span className={`badge badge-${session.status === "active" ? "success" : "neutral"}`}>
              {session.status}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-messages">
              <p>The discussion is starting...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const info = getParticipantInfo(msg.participant);
              return (
                <div key={msg.id} className="message">
                  <div 
                    className="message-avatar"
                    style={{ backgroundColor: info.color }}
                  >
                    {info.name[0]}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author" style={{ color: info.color }}>
                        {info.name}
                      </span>
                      <span className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="message-text">{msg.content}</div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {session.status === "active" && currentSpeaker && (
            <div className="message typing">
              <div 
                className="message-avatar"
                style={{ backgroundColor: getParticipantInfo(currentSpeaker).color }}
              >
                {getParticipantInfo(currentSpeaker).name[0]}
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <span className="typing-text">
                  {getParticipantInfo(currentSpeaker).name} is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* User input */}
        <form onSubmit={handleSendMessage} className="input-form">
          <input
            type="text"
            className="input"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Add your thoughts to the discussion..."
            disabled={sending || session.status !== "active"}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!userInput.trim() || sending || session.status !== "active"}
          >
            {sending ? <span className="spinner" /> : "Send"}
          </button>
        </form>
      </div>

      <style>{`
        .session-modal {
          display: flex;
          flex-direction: column;
          height: 80vh;
          max-height: 700px;
        }
        .modal-xl {
          max-width: 800px;
        }
        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1rem;
        }
        .session-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .session-participants {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .participant-chip {
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .session-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0.5rem 0;
        }
        .empty-messages {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .message {
          display: flex;
          gap: 0.75rem;
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .message-content {
          flex: 1;
          min-width: 0;
        }
        .message-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .message-author {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .message-time {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .message-text {
          font-size: 0.9375rem;
          line-height: 1.5;
          color: var(--text);
          white-space: pre-wrap;
        }
        .message.typing .message-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: var(--text-muted);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .typing-text {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .input-form {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          margin-top: auto;
        }
        .input-form .input {
          flex: 1;
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
