/**
 * AI Chat Page - Interactive chat with AI assistant
 */

import React, { useState, useRef, useEffect } from "react";
import { assistant } from "../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: any[];
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI assistant. I can help you with your projects, answer questions about the platform, and assist with AI workflows. What would you like to do today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await assistant.chat(userMessage.content, "chat");
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response || "I apologize, but I couldn't process that request. Please try again.",
        timestamp: new Date(),
        actions: response.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${err.message || "Unknown error"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What can you help me with?",
    "Show me my recent projects",
    "How do I create a new workflow?",
    "Explain the Fleet Engine",
  ];

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === "user" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                )}
              </div>
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                {message.actions && message.actions.length > 0 && (
                  <div className="message-actions">
                    {message.actions.map((action: any, i: number) => (
                      <button key={i} className="action-chip">
                        {action.label || action.type}
                      </button>
                    ))}
                  </div>
                )}
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-avatar">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-list">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => setInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="chat-input-form">
          <input
            type="text"
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      <style>{`
        .chat-page {
          height: calc(100vh - 65px - 3rem);
          display: flex;
          flex-direction: column;
        }
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 1rem;
          overflow: hidden;
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .message {
          display: flex;
          gap: 0.75rem;
          max-width: 80%;
          animation: fadeIn 0.3s ease-out;
        }
        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .message-avatar svg {
          width: 20px;
          height: 20px;
        }
        .message.user .message-avatar {
          background: var(--primary);
          color: white;
        }
        .message.assistant .message-avatar {
          background: var(--bg-hover);
          color: var(--primary);
        }
        .message-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .message-text {
          padding: 0.875rem 1rem;
          border-radius: 1rem;
          font-size: 0.9375rem;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .message.user .message-text {
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 0.25rem;
        }
        .message.assistant .message-text {
          background: var(--bg-dark);
          border-bottom-left-radius: 0.25rem;
        }
        .message-time {
          font-size: 0.6875rem;
          color: var(--text-dim);
          padding: 0 0.5rem;
        }
        .message.user .message-time {
          text-align: right;
        }
        .message-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0 0.5rem;
        }
        .action-chip {
          padding: 0.375rem 0.75rem;
          background: var(--primary-light);
          border: 1px solid var(--primary);
          border-radius: 9999px;
          color: var(--primary);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-chip:hover {
          background: var(--primary);
          color: white;
        }
        .typing-indicator {
          display: flex;
          gap: 0.25rem;
          padding: 1rem;
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
        .suggestions {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
        }
        .suggestions-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .suggestions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .suggestion-chip {
          padding: 0.5rem 1rem;
          background: var(--bg-dark);
          border: 1px solid var(--border);
          border-radius: 9999px;
          color: var(--text);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .suggestion-chip:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }
        .chat-input-form {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          background: var(--bg-dark);
        }
        .chat-input {
          flex: 1;
          padding: 0.875rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          color: var(--text);
          font-size: 0.9375rem;
        }
        .chat-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .send-btn {
          width: 48px;
          height: 48px;
          background: var(--primary);
          border: none;
          border-radius: 0.75rem;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .send-btn:hover:not(:disabled) {
          background: var(--primary-hover);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .send-btn svg {
          width: 20px;
          height: 20px;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
