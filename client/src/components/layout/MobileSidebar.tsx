/**
 * Mobile Sidebar Component - Hamburger menu for mobile devices
 */

import React, { useEffect, useRef, JSX } from "react";
import { useAuth } from "../../contexts/AuthContext";

type Page = "dashboard" | "projects" | "chat" | "fleet" | "roundtable" | "settings" | "integrations" | "shopify";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string; section: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid", section: "Main" },
  { id: "projects", label: "Projects", icon: "folder", section: "Main" },
  { id: "chat", label: "AI Chat", icon: "message", section: "AI Tools" },
  { id: "fleet", label: "Fleet Engine", icon: "cpu", section: "AI Tools" },
  { id: "roundtable", label: "Roundtable", icon: "users", section: "AI Tools" },
  { id: "shopify", label: "Shopify", icon: "shop", section: "Integrations" },
  { id: "integrations", label: "Integrations", icon: "link", section: "Settings" },
  { id: "settings", label: "Settings", icon: "settings", section: "Settings" },
];

const icons: Record<string, JSX.Element> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  cpu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export function MobileSidebar({ isOpen, onClose, currentPage, onNavigate }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    firstFocusableRef.current?.focus();
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const sections = [...new Set(navItems.map((item) => item.section))];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-sidebar-backdrop" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <nav 
        ref={sidebarRef}
        className="mobile-sidebar"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="mobile-sidebar-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="logo-text">AI Workflow</span>
          </div>
          <button 
            ref={firstFocusableRef}
            className="close-btn" 
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            {icons.close}
          </button>
        </div>

        <div className="mobile-nav-content">
          {sections.map((section) => (
            <div key={section} className="nav-section">
              <div className="nav-section-title">{section}</div>
              {navItems
                .filter((item) => item.section === section)
                .map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={currentPage === item.id ? "page" : undefined}
                  >
                    <span className="nav-icon" aria-hidden="true">{icons[item.icon]}</span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="mobile-sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar" aria-hidden="true">{user.email[0].toUpperCase()}</div>
              <div className="user-details">
                <div className="user-email">{user.email}</div>
                <div className="user-role">{user.isGuest ? "Guest" : user.role}</div>
              </div>
            </div>
          )}
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon" aria-hidden="true">{icons.logout}</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </nav>

      <style>{`
        .mobile-sidebar-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 199;
          animation: fadeIn 0.2s ease-out;
        }
        .mobile-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          max-width: 85vw;
          background: var(--bg-card);
          z-index: 200;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .mobile-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .logo-icon {
          width: 28px;
          height: 28px;
          color: var(--primary);
        }
        .logo-text {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary);
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.375rem;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .close-btn:hover, .close-btn:focus {
          background: var(--bg-hover);
          color: var(--text);
        }
        .close-btn:focus {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .close-btn svg {
          width: 24px;
          height: 24px;
        }
        .mobile-nav-content {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
        }
        .nav-section {
          margin-bottom: 1.5rem;
        }
        .nav-section-title {
          font-size: 0.6875rem;
          text-transform: uppercase;
          color: var(--text-dim);
          letter-spacing: 0.05em;
          padding: 0 0.75rem;
          margin-bottom: 0.5rem;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          min-height: 44px;
          padding: 0.625rem 0.75rem;
          border: none;
          background: none;
          color: var(--text-muted);
          font-size: 0.9375rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .nav-item:hover, .nav-item:focus {
          background: var(--primary-light);
          color: var(--text);
        }
        .nav-item:focus {
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }
        .nav-item.active {
          background: var(--primary);
          color: white;
        }
        .nav-icon {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }
        .nav-icon svg {
          width: 100%;
          height: 100%;
        }
        .mobile-sidebar-footer {
          padding: 1rem;
          border-top: 1px solid var(--border);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          padding: 0.5rem;
        }
        .user-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
        }
        .user-details {
          overflow: hidden;
        }
        .user-email {
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .logout-btn {
          color: var(--error);
        }
        .logout-btn:hover, .logout-btn:focus {
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
        }
      `}</style>
    </>
  );
}
