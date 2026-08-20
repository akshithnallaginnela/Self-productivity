/**
 * NavigationBar.tsx — floating bottom navigation dock.
 *
 * Six destinations, including the glance deck. The deck used to be reachable
 * only through a function that was never called, which left the whole view
 * dead in the shipped app.
 */

import React from 'react';
import { Home, CheckSquare, IndianRupee, Sparkles, BarChart3, LayoutGrid } from 'lucide-react';
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
  { id: 'recovery', label: 'Recovery', icon: <Home size={20} /> },
  { id: 'routine', label: 'Habits', icon: <CheckSquare size={20} /> },
  { id: 'income', label: 'Income', icon: <IndianRupee size={20} /> },
  { id: 'mindset', label: 'Mindset', icon: <Sparkles size={20} /> },
  { id: 'analytics', label: 'Insights', icon: <BarChart3 size={20} /> },
  { id: 'widgets', label: 'Glance', icon: <LayoutGrid size={20} /> }
];

export const NavigationBar: React.FC<NavigationBarProps> = ({ activeTab, onTabChange }) => (
  <div className="ref-bottom-dock-wrapper">
    <nav className="ref-bottom-dock" aria-label="Main navigation">
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
            {isActive && <span className="ref-dock-active-dot" aria-hidden="true" />}
            {dest.icon}
          </button>
        );
      })}
    </nav>
  </div>
);
