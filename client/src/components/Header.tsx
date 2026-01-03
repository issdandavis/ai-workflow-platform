/**
 * Header Component
 */

import React, { useState, useEffect } from "react";
import { system } from "../lib/api";

type Page = "dashboard" | "projects" | "chat" | "fleet" | "roundtable" | "settings" | "integrations";

interface HeaderProps {
  currentPage: Page;
}

const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  chat: "AI Chat",
  fleet: "Fleet Engine",
  roundtable: "Roundtable",
  settings: "Settings",
  integrations: "Integrations",
};

export function Header({ currentPage }: HeaderProps) {
  const [apiStatus, setApiStatus] = useState<"connected" | "disconnected" | "checking">("checking");

  useEffect(() => {
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkApiStatus = async () => {
    try {
      await system.health();
      setApiStatus("connected");
    } catch {
      setApiStatus("disconnected");
    }
  };

  return (
    <header className="header">
      <h1 className="header-title">{pageTitles[currentPage]}</h1>
      <div className="header-actions">
        <div className={`status-badge ${apiStatus}`}>
          <span className={`status-dot status-dot-${apiStatus === "connected" ? "success" : apiStatus === "disconnected" ? "error" : "warning"} ${apiStatus === "checking" ? "" : "status-dot-pulse"}`} />
          <span>{apiStatus === "connected" ? "API Connected" : apiStatus === "disconnected" ? "API Offline" : "Checking..."}</span>
        </div>
      </div>

      <style>{`
        .header {
          background: var(--bg-card);
          border-bottom: 1px solid var(--border);
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .status-badge.connected {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: var(--success);
        }
        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
        }
        .status-badge.checking {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: var(--warning);
        }
      `}</style>
    </header>
  );
}
