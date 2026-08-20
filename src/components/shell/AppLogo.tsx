/**
 * AppLogo.tsx — Sovereign Eagle Vector Emblem & App Logo
 *
 * Implements a high-precision, geometric vector SVG logo representing
 * the Sovereign Eagle brand identity with radiant golden gradients,
 * multi-faceted wings, apex crown, and heart crystal core.
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
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Sovereign Gold Highlights */}
          <linearGradient id="appEagleGoldLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="30%" stopColor="#FDE68A" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Sovereign Amber Core Gradient */}
          <linearGradient id="appEagleGoldCore" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FCD34D" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="85%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Sovereign Bronze / Shadow Gold Gradient */}
          <linearGradient id="appEagleBronze" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="50%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* Dark Shield Metal Gradient */}
          <linearGradient id="appShieldMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#242630" />
            <stop offset="50%" stopColor="#161820" />
            <stop offset="100%" stopColor="#0E0F14" />
          </linearGradient>

          {/* Shield Border Gradient */}
          <linearGradient id="appShieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="25%" stopColor="#D97706" />
            <stop offset="70%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          {/* Glowing Drop Shadow Filter */}
          <filter id="appEagleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#F59E0B" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer Sovereign Hexagonal Shield Crest */}
        {variant === 'badge' && (
          <path
            d="M 256 36 L 452 124 L 452 320 L 256 476 L 60 320 L 60 124 Z"
            fill="url(#appShieldMetal)"
            stroke="url(#appShieldBorder)"
            strokeWidth="12"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#appEagleGlow)"
          />
        )}

        {/* Inner Subtle Shield Inset Rim */}
        {variant === 'badge' && (
          <path
            d="M 256 58 L 432 136 L 432 308 L 256 448 L 80 308 L 80 136 Z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            strokeLinejoin="round"
          />
        )}

        {/* Layer 1: Left Wing - Primary Upper Feathers */}
        <path
          d="M 256 160 L 108 108 L 84 180 L 180 208 L 100 236 L 204 268 L 132 308 L 256 380 Z"
          fill={variant === 'monochrome' ? '#FFFFFF' : 'url(#appEagleGoldLight)'}
        />

        {/* Layer 1: Right Wing - Primary Upper Feathers */}
        <path
          d="M 256 160 L 404 108 L 428 180 L 332 208 L 412 236 L 308 268 L 380 308 L 256 380 Z"
          fill={variant === 'monochrome' ? '#CCCCCC' : 'url(#appEagleBronze)'}
        />

        {/* Layer 2: Left Wing - Secondary Tier Feathers */}
        <path
          d="M 256 188 L 132 144 L 112 196 L 200 220 L 136 248 L 220 274 L 172 316 L 256 368 Z"
          fill={variant === 'monochrome' ? '#E5E5E5' : 'url(#appEagleGoldCore)'}
        />

        {/* Layer 2: Right Wing - Secondary Tier Feathers */}
        <path
          d="M 256 188 L 380 144 L 400 196 L 312 220 L 376 248 L 292 274 L 340 316 L 256 368 Z"
          fill={variant === 'monochrome' ? '#B3B3B3' : 'url(#appEagleGoldCore)'}
        />

        {/* Layer 3: Dynamic Feather Rib Separators */}
        <path
          d="M 256 188 L 132 144 M 200 220 L 112 196 M 220 274 L 136 248 M 256 368 L 172 316"
          stroke="#161820"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M 256 188 L 380 144 M 312 220 L 400 196 M 292 274 L 376 248 M 256 368 L 340 316"
          stroke="#161820"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Apex Eagle Crest / Crown Feathers */}
        <polygon points="256,76 292,136 256,172 220,136" fill="#FFFDF5" />
        <polygon points="256,76 256,172 220,136" fill="#FEF3C7" />

        {/* Piercing Eagle Head & Beak */}
        <polygon points="256,172 300,214 256,252 212,214" fill="#161820" stroke="#FDE68A" strokeWidth="2" />
        <polygon points="256,204 286,236 256,268 226,236" fill="url(#appEagleGoldLight)" />
        <polygon points="256,204 256,268 226,236" fill="#D97706" />

        {/* Center Heart Flame Diamond Crystal */}
        <polygon
          points="256,274 306,328 256,412 206,328"
          fill="#12131A"
          stroke={variant === 'monochrome' ? '#FFFFFF' : 'url(#appEagleGoldLight)'}
          strokeWidth="5"
          strokeLinejoin="round"
        />

        {/* Sovereign Inner Ember Crystal Facets */}
        <polygon points="256,290 292,332 256,396 256,290" fill="#F59E0B" />
        <polygon points="256,290 220,332 256,396 256,290" fill="#D97706" />
        <circle cx="256" cy="336" r="10" fill="#FFFBEB" />
      </svg>
    </div>
  );
};
