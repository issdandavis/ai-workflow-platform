/**
 * Header Component
 * Mystical theme with arcane styling
 */

import React, { useState, useEffect } from "react";
import { system } from "../lib/api";
import { ThemeToggle } from "./ui/ThemeToggle";

type Page = "dashboard" | "projects" | "chat" | "fleet" | "roundtable" | "settings" | "integrations" | "shopify";

interface HeaderProps {
  currentPage: Page;
  onMobileMenuToggle?: () => void;
}

const pageTitles: Record<Page, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  chat: "AI Chat",
  fleet: "Fleet Engine",
  roundtable: "Roundtable",
  settings: "Settings",
  integrations: "Integrations",
  shopify: "Shopify",
};

const menuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export function Header({ currentPage, onMobileMenuToggle }: HeaderProps) {
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
      <div className="header-left">
        {onMobileMenuToggle && (
          <button 
            className="mobile-menu-btn mystical-focus" 
            onClick={onMobileMenuToggle}
            aria-label="Open navigation menu"
          >
            {menuIcon}
          </button>
        )}
        <h1 className="header-title mystical-heading">{pageTitles[currentPage]}</h1>
      </div>
      <div className="header-actions">
        <div className={`status-badge ${apiStatus}`}>
          <span className={`status-dot status-dot-${apiStatus === "connected" ? "success" : apiStatus === "disconnected" ? "error" : "warning"} ${apiStatus === "checking" ? "" : "status-dot-pulse"}`} aria-hidden="true" />
          <span>{apiStatus === "connected" ? "API Connected" : apiStatus === "disconnected" ? "API Offline" : "Checking..."}</span>
        </div>
        <ThemeToggle />
      </div>

      <style>{`
        .header {
          background: var(--card-gradient, linear-gradient(135deg, var(--mystical-purple-deep, #2D2438) 0%, var(--mystical-purple-dark, #1A1625) 100%));
          border-bottom: 1px solid var(--border-gold, rgba(201, 162, 39, 0.2));
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, var(--mystical-gold, #C9A227) 50%, transparent 100%);
          opacity: 0.3;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .header-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--mystical-gold, #C9A227);
        }
        .header-title.mystical-heading {
          font-family: 'Cinzel', 'Times New Roman', serif;
          letter-spacing: 0.05em;
          text-shadow: 0 0 15px rgba(201, 162, 39, 0.2);
        }
        .mobile-menu-btn {
          display: none;
          width: 44px;
          height: 44px;
          background: none;
          border: 1px solid var(--border-gold, rgba(201, 162, 39, 0.3));
          border-radius: 0.5rem;
          color: var(--text-muted);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .mobile-menu-btn:hover {
          background: rgba(74, 144, 217, 0.1);
          color: var(--mystical-gold, #C9A227);
          border-color: var(--mystical-glow, #4A90D9);
        }
        .mystical-focus:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--bg-dark), 0 0 0 4px var(--mystical-glow, #4A90D9), var(--glow-blue, 0 0 20px rgba(74, 144, 217, 0.3));
        }
        .mobile-menu-btn svg {
          width: 24px;
          height: 24px;
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
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.1);
        }
        .status-badge.disconnected {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--error);
        }
        .status-badge.checking {
          background: rgba(201, 162, 39, 0.1);
          border: 1px solid rgba(201, 162, 39, 0.3);
          color: var(--mystical-gold, #C9A227);
        }
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex;
          }
          .status-badge span:last-child {
            display: none;
          }
          .status-badge {
            padding: 0.5rem;
          }
        }
      `}</style>
    </header>
  );
}
