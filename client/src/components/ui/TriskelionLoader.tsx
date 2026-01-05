/**
 * Animated Triskelion Loading Indicator
 * Mystical rotating triple spiral with cosmic glow effect
 */

import React from "react";

interface TriskelionLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TriskelionLoader({ size = "md", className = "" }: TriskelionLoaderProps) {
  const sizeMap = {
    sm: 24,
    md: 40,
    lg: 64,
  };
  
  const dimension = sizeMap[size];
  
  return (
    <div className={`triskelion-loader ${className}`} role="status" aria-label="Loading">
      <svg
        viewBox="0 0 100 100"
        width={dimension}
        height={dimension}
        className="triskelion-svg"
      >
        <defs>
          <linearGradient id="loaderGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E5C76B" />
            <stop offset="50%" stopColor="#C9A227" />
            <stop offset="100%" stopColor="#8B7019" />
          </linearGradient>
          <filter id="loaderGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#4A90D9" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background circle */}
        <circle cx="50" cy="50" r="46" fill="var(--mystical-blue-cosmic, #0A1628)" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--mystical-blue-royal, #1E3A5F)" strokeWidth="1.5" />
        
        {/* Triskelion spiral group */}
        <g transform="translate(50, 50)" filter="url(#loaderGlow)">
          {/* First spiral arm */}
          <path
            d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0"
            fill="none"
            stroke="url(#loaderGold)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Second spiral arm (rotated 120°) */}
          <path
            d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0"
            fill="none"
            stroke="url(#loaderGold)"
            strokeWidth="4"
            strokeLinecap="round"
            transform="rotate(120)"
          />
          {/* Third spiral arm (rotated 240°) */}
          <path
            d="M 0 0 Q 8 -4, 12 -12 Q 14 -20, 8 -24 Q 0 -28, -8 -22 Q -14 -16, -10 -8 Q -6 0, 0 0"
            fill="none"
            stroke="url(#loaderGold)"
            strokeWidth="4"
            strokeLinecap="round"
            transform="rotate(240)"
          />
          {/* Center dot */}
          <circle cx="0" cy="0" r="3" fill="#C9A227" />
        </g>
      </svg>
      
      <style>{`
        .triskelion-loader {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .triskelion-svg {
          animation: triskelion-rotate 2s linear infinite;
        }
        
        @keyframes triskelion-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .triskelion-svg {
            animation: triskelion-pulse 2s ease-in-out infinite;
          }
          
          @keyframes triskelion-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Full-page loading overlay with triskelion
 */
export function TriskelionOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="triskelion-overlay" role="status" aria-live="polite">
      <TriskelionLoader size="lg" />
      <span className="triskelion-message">{message}</span>
      
      <style>{`
        .triskelion-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          background: var(--nebula-gradient, radial-gradient(ellipse at center, #1E3A5F 0%, #0A1628 70%));
          z-index: 9999;
        }
        
        .triskelion-message {
          font-family: 'Cinzel', serif;
          color: var(--mystical-gold, #C9A227);
          font-size: 1rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}
