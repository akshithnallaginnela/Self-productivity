/**
 * AppLogo.tsx — Sovereign Eagle Vector Emblem & App Logo
 *
 * Implements a high-precision, geometric vector SVG logo representing
 * the Sovereign Eagle brand identity with radiant golden gradients
 * and sharp apex wing geometry.
 */

import React from 'react';

interface AppLogoProps {
  /** Size in pixels (width and height) */
  size?: number;
  /** Visual variant: 'gradient' | 'monochrome' | 'badge' */
  variant?: 'gradient' | 'monochrome' | 'badge';
  /** Whether to apply glowing pulse animation */
  animated?: boolean;
  /** Optional class names */
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 48,
  variant = 'gradient',
  animated = false,
  className = ''
}) => {
  return (
    <div
      className={`app-logo-wrapper ${animated ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Primary Sovereign Gold Gradient */}
          <linearGradient id="eagleGoldGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>

          {/* Wing Highlight Gradient */}
          <linearGradient id="eagleWingGrad" x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Shield Outer Glow */}
          <filter id="eagleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#d97706" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Outer Sovereign Hexagonal Shield Crest */}
        {variant === 'badge' && (
          <path
            d="M50 4 L88 22 L88 62 L50 96 L12 62 L12 22 Z"
            fill="#18181b"
            stroke="url(#eagleGoldGrad)"
            strokeWidth="3"
            filter="url(#eagleGlow)"
          />
        )}

        {/* Geometric Eagle Wing Left */}
        <path
          d="M50 32 L22 18 L10 38 L30 46 L14 56 L34 62 L22 74 L50 86 Z"
          fill="url(#eagleWingGrad)"
          opacity="0.95"
        />

        {/* Geometric Eagle Wing Right */}
        <path
          d="M50 32 L78 18 L90 38 L70 46 L86 56 L66 62 L78 74 L50 86 Z"
          fill="url(#eagleGoldGrad)"
        />

        {/* Central Apex Eagle Head & Crown */}
        <path
          d="M50 14 L58 28 L50 38 L42 28 Z"
          fill="#fffbeb"
        />

        {/* Sharp Eagle Beak */}
        <path
          d="M50 38 L56 46 L50 50 L44 46 Z"
          fill="#f59e0b"
        />

        {/* Apex Inner Heart Shield */}
        <path
          d="M50 50 L60 62 L50 78 L40 62 Z"
          fill="#18181b"
          stroke="#fef3c7"
          strokeWidth="1.5"
        />

        {/* Inner Sovereign Flame Core */}
        <circle cx="50" cy="64" r="3.5" fill="#f59e0b" />
      </svg>
    </div>
  );
};
