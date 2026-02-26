import { useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { useSettings } from './hooks/useSettings';
import {
  LoadingScreen,
  Header,
  GameOverBanner,
  ErrorBanner,
  ControlsCard,
  GameBoard,
  SettingsModal,
  LogPanel,
} from './components';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, applySettings } = useSettings();
  const {
    state,
    possibleEdges,
    over,
    error,
    busy,
    boxOwners,
    engineStatus,
    loadGame,
    onEdgeClick,
    onBotMove,
  } = useGameState();

  if (!state) {
    return <LoadingScreen error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col gap-4">
      <Header
        engineStatus={engineStatus}
        busy={busy}
        onNew22={() => loadGame(2, 2)}
        onNew32={() => loadGame(3, 2)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onApply={(s) => {
            applySettings(s);
            setSettingsOpen(false);
          }}
        />
      )}

      {over && <GameOverBanner state={state} />}
      {error && <ErrorBanner message={error} />}

      <ControlsCard state={state} over={over} busy={busy} onBotMove={onBotMove} />

      <GameBoard
        state={state}
        possibleEdges={possibleEdges}
        boxOwners={boxOwners}
        onEdgeClick={onEdgeClick}
      />

      {settings.logsEnabled && <LogPanel logsVerbose={settings.logsVerbose} />}
    </div>
  );
}
