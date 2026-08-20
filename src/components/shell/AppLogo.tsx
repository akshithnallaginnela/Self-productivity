/**
 * AppLogo.tsx — Sovereign Eagle Vector Emblem & App Logo
 *
 * Renders the master 3D Titanium & Gold Sovereign Eagle emblem
 * with crisp scaling, squircle framing, and glowing accents.
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
  const borderRadius = Math.round(size * 0.22);

  return (
    <div
      className={`app-logo-wrapper ${animated ? 'animate-pulse' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        boxShadow: variant === 'badge' ? '0 8px 24px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.5)' : 'none',
        flexShrink: 0
      }}
    >
      <img
        src="/logo.png"
        alt="Sovereign Eagle"
        width={size}
        height={size}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          borderRadius: `${borderRadius}px`
        }}
      />
    </div>
  );
};

