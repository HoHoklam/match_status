import React, { useState } from 'react';
import { MatchManagementHub } from './features/match-management/MatchManagementHub';
import { MatchSetupWizard } from './features/match-management/MatchSetupWizard';
import { LiveMatchDesk } from './features/live-desk/LiveMatchDesk';
import { MatchLiveSnapshot } from '@shared/types';
import './styles/adminTheme.css';
import './styles/liveDesk.css';
import './styles/matchManagement.css';

type AdminView = 'HUB' | 'SETUP' | 'LIVE_DESK';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AdminView>('HUB');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('sztu-match-2026-001');
  const [editingMatchData, setEditingMatchData] = useState<MatchLiveSnapshot | null>(null);

  const handleEnterLiveDesk = (matchId: string) => {
    setSelectedMatchId(matchId);
    setCurrentView('LIVE_DESK');
  };

  const handleMatchCreated = (newMatchId: string) => {
    setSelectedMatchId(newMatchId);
    setEditingMatchData(null);
    setCurrentView('LIVE_DESK');
  };

  const handleCreateNewMatch = () => {
    setEditingMatchData(null);
    setCurrentView('SETUP');
  };

  const handleEditMatchSetup = (match: MatchLiveSnapshot) => {
    setEditingMatchData(match);
    setCurrentView('SETUP');
  };

  return (
    <div className="admin-app">
      {currentView === 'HUB' && (
        <MatchManagementHub
          onEnterLiveDesk={handleEnterLiveDesk}
          onCreateNewMatch={handleCreateNewMatch}
        />
      )}

      {currentView === 'SETUP' && (
        <MatchSetupWizard
          initialMatchData={editingMatchData}
          onBack={() => {
            if (editingMatchData) {
              setCurrentView('LIVE_DESK');
            } else {
              setCurrentView('HUB');
            }
          }}
          onMatchCreated={handleMatchCreated}
        />
      )}

      {currentView === 'LIVE_DESK' && (
        <LiveMatchDesk
          initialMatchId={selectedMatchId}
          onBackToHub={() => setCurrentView('HUB')}
          onEditMatchSetup={handleEditMatchSetup}
        />
      )}
    </div>
  );
};

export default App;
