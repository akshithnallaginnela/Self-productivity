/**
 * App.tsx — Root Application Component & Navigation State Machine
 *
 * This is the entry point React component for Recovery Warrior.
 * It manages:
 *   - Active navigation tab state (recovery | routine | income | mindset | analytics | widgets)
 *   - Crisis modal open/close state
 *   - Profile modal open/close state
 *   - Root archetype theming (sets data-archetype on <html> for CSS token switching)
 *
 * The component delegates visual rendering to AndroidShell (edge-to-edge device frame)
 * and routes to the appropriate view component based on activeTab.
 */

import React, { useState, useEffect } from 'react';
import { NavigationTab } from './types';
import { db } from './services/db';
import { AndroidShell } from './components/shell/AndroidShell';
import { RecoveryView } from './components/recovery/RecoveryView';
import { RoutineView } from './components/routine/RoutineView';
import { IncomeView } from './components/income/IncomeView';
import { MindsetView } from './components/mindset/MindsetView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { WidgetDeck } from './components/widgets/WidgetDeck';
import { CrisisModal } from './components/recovery/CrisisModal';
import { ProfileModal } from './components/profile/ProfileModal';

export const App: React.FC = () => {
  /** Tracks which tab/view is currently displayed */
  const [activeTab, setActiveTab] = useState<NavigationTab>('recovery');

  /** Controls visibility of the 10-second crisis intervention modal */
  const [isCrisisOpen, setIsCrisisOpen] = useState<boolean>(false);

  /** Controls visibility of the warrior profile settings modal */
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  /**
   * On mount, read the saved archetype from the database and apply it
   * to the root <html> element as a data attribute. This drives the
   * CSS custom property tonal palette (Eagle/Wolf/Tiger).
   */
  useEffect(() => {
    const profile = db.getProfile();
    document.documentElement.setAttribute(
      'data-archetype',
      profile.selectedArchetype || 'EAGLE'
    );
  }, []);

  /**
   * Routes the activeTab state to the corresponding view component.
   * Each view is a self-contained feature module that subscribes
   * to the reactive database for its own data.
   */
  const renderActiveView = (): React.ReactNode => {
    switch (activeTab) {
      case 'recovery':
        return <RecoveryView onOpenCrisis={() => setIsCrisisOpen(true)} />;
      case 'routine':
        return <RoutineView />;
      case 'income':
        return <IncomeView />;
      case 'mindset':
        return <MindsetView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'widgets':
        return (
          <WidgetDeck
            onOpenCrisis={() => setIsCrisisOpen(true)}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      default:
        return <RecoveryView onOpenCrisis={() => setIsCrisisOpen(true)} />;
    }
  };

  return (
    <AndroidShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onOpenCrisis={() => setIsCrisisOpen(true)}
      onOpenProfile={() => setIsProfileOpen(true)}
    >
      {renderActiveView()}

      {/* Emergency Crisis Intervention Modal (10s countdown + 4-7-8 breathing) */}
      <CrisisModal
        isOpen={isCrisisOpen}
        onClose={() => setIsCrisisOpen(false)}
      />

      {/* Warrior Profile & Target Configuration Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </AndroidShell>
  );
};

export default App;
