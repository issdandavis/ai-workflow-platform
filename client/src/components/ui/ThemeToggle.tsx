/**
 * Theme Toggle Component - Switch between dark/light/system themes
 */

import React, { useState, useRef, useEffect, JSX } from "react";
import { useTheme } from "../../contexts/ThemeContext";

const icons = {
  sun: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const currentIcon = resolvedTheme === "dark" ? icons.moon : icons.sun;

  const options: { value: "light" | "dark" | "system"; label: string; icon: JSX.Element }[] = [
    { value: "light", label: "Light", icon: icons.sun },
    { value: "dark", label: "Dark", icon: icons.moon },
    { value: "system", label: "System", icon: icons.system },
  ];

  return (
    <div className="theme-toggle-container" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        className="theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Theme: ${theme}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="theme-icon" aria-hidden="true">{currentIcon}</span>
      </button>

      {isOpen && (
        <div className="theme-menu" role="menu" aria-label="Theme options">
          {options.map((option) => (
            <button
              key={option.value}
              className={`theme-option ${theme === option.value ? "active" : ""}`}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              role="menuitemradio"
              aria-checked={theme === option.value}
            >
              <span className="option-icon" aria-hidden="true">{option.icon}</span>
              <span className="option-label">{option.label}</span>
              {theme === option.value && (
                <span className="check-icon" aria-hidden="true">{icons.check}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .theme-toggle-container {
          position: relative;
        }
        .theme-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .theme-toggle-btn:hover, .theme-toggle-btn:focus {
          background: var(--bg-hover);
          color: var(--text);
          border-color: var(--text-dim);
        }
        .theme-toggle-btn:focus {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .theme-icon {
          width: 20px;
          height: 20px;
        }
        .theme-icon svg {
          width: 100%;
          height: 100%;
        }
        .theme-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.375rem;
          min-width: 140px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 50;
          animation: fadeIn 0.15s ease-out;
        }
        .theme-option {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.875rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .theme-option:hover, .theme-option:focus {
          background: var(--bg-hover);
          color: var(--text);
        }
        .theme-option:focus {
          outline: none;
          box-shadow: inset 0 0 0 2px var(--primary);
        }
        .theme-option.active {
          color: var(--primary);
        }
        .option-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .option-icon svg {
          width: 100%;
          height: 100%;
        }
        .option-label {
          flex: 1;
        }
        .check-icon {
          width: 16px;
          height: 16px;
          color: var(--primary);
        }
        .check-icon svg {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
