/**
 * Toast Component - Displays toast notifications
 */

import React from "react";
import { useToast, ToastType } from "../../contexts/ToastContext";

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{icons[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => hideToast(toast.id)} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          z-index: 1000;
          max-width: 400px;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }
        .toast-success {
          border-color: var(--success);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(34, 197, 94, 0.1) 100%);
        }
        .toast-error {
          border-color: var(--error);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(239, 68, 68, 0.1) 100%);
        }
        .toast-warning {
          border-color: var(--warning);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(245, 158, 11, 0.1) 100%);
        }
        .toast-info {
          border-color: var(--info);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(59, 130, 246, 0.1) 100%);
        }
        .toast-icon {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
        }
        .toast-icon svg {
          width: 100%;
          height: 100%;
        }
        .toast-success .toast-icon { color: var(--success); }
        .toast-error .toast-icon { color: var(--error); }
        .toast-warning .toast-icon { color: var(--warning); }
        .toast-info .toast-icon { color: var(--info); }
        .toast-message {
          flex: 1;
          font-size: 0.875rem;
          line-height: 1.4;
        }
        .toast-close {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          padding: 0;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .toast-close:hover {
          opacity: 1;
        }
        .toast-close svg {
          width: 100%;
          height: 100%;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @media (max-width: 480px) {
          .toast-container {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
