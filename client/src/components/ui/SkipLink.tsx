/**
 * Skip Link Component - Accessibility skip-to-content link
 */

import React from "react";

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export function SkipLink({ targetId = "main-content", children = "Skip to main content" }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <a href={`#${targetId}`} className="skip-link" onClick={handleClick}>
        {children}
      </a>
      <style>{`
        .skip-link {
          position: absolute;
          top: -100px;
          left: 0;
          background: var(--primary);
          color: white;
          padding: 0.75rem 1.5rem;
          z-index: 9999;
          font-weight: 500;
          text-decoration: none;
          border-radius: 0 0 0.5rem 0;
          transition: top 0.2s;
        }
        .skip-link:focus {
          top: 0;
          outline: 2px solid white;
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
}
