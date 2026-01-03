/**
 * Integrations Page - Connect external services
 */

import React, { useState, useEffect } from "react";
import { integrations } from "../lib/api";

interface Integration {
  id: string;
  provider: string;
  status: "connected" | "disconnected" | "error";
  createdAt: string;
}

const availableIntegrations = [
  {
    id: "github",
    name: "GitHub",
    description: "Connect repositories, issues, and pull requests",
    icon: "🐙",
    category: "Development",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync pages, databases, and documents",
    icon: "📝",
    category: "Productivity",
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Access files and folders from Drive",
    icon: "📁",
    category: "Storage",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Connect your Dropbox files",
    icon: "📦",
    category: "Storage",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications and messages",
    icon: "💬",
    category: "Communication",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5000+ apps",
    icon: "⚡",
    category: "Automation",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Payment processing and billing",
    icon: "💳",
    category: "Finance",
  },
  {
    id: "figma",
    name: "Figma",
    description: "Design files and prototypes",
    icon: "🎨",
    category: "Design",
  },
];

export function IntegrationsPage() {
  const [connectedIntegrations, setConnectedIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const data = await integrations.list();
      setConnectedIntegrations(data);
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      await integrations.connect(provider);
      loadIntegrations();
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this integration?")) return;
    try {
      await integrations.disconnect(id);
      loadIntegrations();
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const isConnected = (provider: string) => {
    return connectedIntegrations.some(
      (i) => i.provider === provider && i.status === "connected"
    );
  };

  const getIntegration = (provider: string) => {
    return connectedIntegrations.find((i) => i.provider === provider);
  };

  const categories = [...new Set(availableIntegrations.map((i) => i.category))];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="integrations-page">
      <div className="page-header">
        <div>
          <h2>Integrations</h2>
          <p className="subtitle">Connect your favorite tools and services</p>
        </div>
        <div className="connected-count">
          <span className="count">{connectedIntegrations.filter(i => i.status === "connected").length}</span>
          <span className="label">Connected</span>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="category-section">
          <h3 className="category-title">{category}</h3>
          <div className="integrations-grid">
            {availableIntegrations
              .filter((i) => i.category === category)
              .map((integration) => {
                const connected = isConnected(integration.id);
                const existing = getIntegration(integration.id);
                const isConnecting = connecting === integration.id;

                return (
                  <div
                    key={integration.id}
                    className={`integration-card ${connected ? "connected" : ""}`}
                  >
                    <div className="integration-header">
                      <span className="integration-icon">{integration.icon}</span>
                      {connected && (
                        <span className="badge badge-success">Connected</span>
                      )}
                    </div>
                    <h4 className="integration-name">{integration.name}</h4>
                    <p className="integration-description">{integration.description}</p>
                    <div className="integration-actions">
                      {connected ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDisconnect(existing!.id)}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConnect(integration.id)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? <span className="spinner" /> : "Connect"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <style>{`
        .integrations-page {
          max-width: 1200px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
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
        .connected-count {
          text-align: center;
          padding: 1rem 1.5rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
        }
        .connected-count .count {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--success);
        }
        .connected-count .label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
        }
        .category-section {
          margin-bottom: 2rem;
        }
        .category-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .integrations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }
        .integration-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
          transition: all 0.2s;
        }
        .integration-card:hover {
          border-color: var(--primary);
        }
        .integration-card.connected {
          border-color: var(--success);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(34, 197, 94, 0.05) 100%);
        }
        .integration-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.75rem;
        }
        .integration-icon {
          font-size: 2rem;
        }
        .integration-name {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .integration-description {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        .integration-actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
