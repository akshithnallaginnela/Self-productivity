/**
 * NavigationBar.tsx — Official M3 Bottom Navigation Bar
 *
 * Implements the Material Design 3 Navigation Bar component at exactly 80dp:
 * https://m3.material.io/components/navigation-bar/overview
 *
 * Key specs:
 *   - Total height: 80dp
 *   - Active indicator pill: 64×32dp, border-radius 16dp
 *   - Icon size: 24dp (we use Lucide at size 22 for optical balance)
 *   - Label: label-medium (12sp, weight 500; bold when active)
 *   - Active indicator: secondaryContainer fill
 *   - State layers: hover 8%, press 12%
 */

import React from 'react';
import {
  Shield,
  CheckSquare,
  IndianRupee,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { NavigationTab } from '../../types';

/** Describes a single navigation destination in the bar. */
interface NavDestination {
  /** The tab identifier used for routing */
  id: NavigationTab;
  /** Display label shown below the icon */
  label: string;
  /** Lucide icon component to render */
  icon: React.ReactNode;
}

interface NavigationBarProps {
  /** Currently active navigation tab */
  activeTab: NavigationTab;
  /** Callback fired when user taps a navigation destination */
  onTabChange: (tab: NavigationTab) => void;
}

/** The five primary navigation destinations of Recovery Warrior. */
const DESTINATIONS: NavDestination[] = [
  { id: 'recovery', label: 'Recovery', icon: <Shield size={22} /> },
  { id: 'routine',  label: 'Habits',   icon: <CheckSquare size={22} /> },
  { id: 'income',   label: 'Forge ₹',  icon: <IndianRupee size={22} /> },
  { id: 'mindset',  label: 'Mindset',  icon: <Sparkles size={22} /> },
  { id: 'analytics', label: 'Matrix',  icon: <BarChart3 size={22} /> },
];

/**
 * Renders the official M3 bottom navigation bar with active indicator pills.
 * Each destination has a 64×32dp pill that fills with secondaryContainer
 * color when active, providing clear visual feedback per M3 guidelines.
 */
export const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="system-nav-bar" aria-label="Main navigation">
      {DESTINATIONS.map((dest) => {
        const isActive = activeTab === dest.id;
        return (
          <button
            key={dest.id}
            className={`nav-destination ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(dest.id)}
            aria-label={dest.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Active indicator pill (64×32dp) */}
            <div className="nav-indicator-pill">
              {dest.icon}
            </div>

            {/* Label (M3 label-medium) */}
            <span className="nav-destination-label">
              {dest.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
