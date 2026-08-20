/**
 * NavigationBar.tsx — Floating Dark Navigation Dock
 *
 * Implements the floating capsule navigation dock from the reference design:
 *   - Suspended floating dark pill dock
 *   - Active white pill container with active green indicator dot
 *   - Touch-optimized icons with haptic feedback transitions
 */

import React from 'react';
import {
  Home,
  CheckSquare,
  IndianRupee,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { NavigationTab } from '../../types';

interface NavDestination {
  id: NavigationTab;
  label: string;
  icon: React.ReactNode;
}

interface NavigationBarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const DESTINATIONS: NavDestination[] = [
  { id: 'recovery', label: 'Home', icon: <Home size={20} /> },
  { id: 'routine',  label: 'Habits', icon: <CheckSquare size={20} /> },
  { id: 'income',   label: 'Forge', icon: <IndianRupee size={20} /> },
  { id: 'mindset',  label: 'Mindset', icon: <Sparkles size={20} /> },
  { id: 'analytics', label: 'Matrix', icon: <BarChart3 size={20} /> },
];

export const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="ref-bottom-dock-wrapper">
      <nav className="ref-bottom-dock" aria-label="Main floating navigation dock">
        {DESTINATIONS.map((dest) => {
          const isActive = activeTab === dest.id;
          return (
            <button
              key={dest.id}
              className={`ref-dock-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(dest.id)}
              aria-label={dest.label}
              aria-current={isActive ? 'page' : undefined}
              title={dest.label}
            >
              {isActive && <div className="ref-dock-active-dot" />}
              {dest.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

