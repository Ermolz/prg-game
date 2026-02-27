import { useState, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useSettings } from './hooks/useSettings';
import type { DabSettings } from './model/settings';
import { palette, btnSecondary } from './lib/constants';
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

const LOGS_DRAWER_WIDTH = 320;

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveLoadMessage, setSaveLoadMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const { settings, applySettings } = useSettings();
  const {
    state,
    possibleEdges,
    over,
    error,
    busy,
    boxOwners,
    gameEngineStatus,
    botEngineStatus,
    moveHistory,
    redoStack,
    loadGame,
    undo,
    redo,
    onEdgeClick,
    onBotMove,
    saveGame,
    loadSavedGame,
    syncGameEngine,
    onRestartEngines,
  } = useGameState();

  const handleSave = useCallback(async () => {
    const result = await saveGame({
      gameEngine: settings.gameEngine,
      botEngine: settings.botEngine,
      gameMode: settings.gameMode,
    });
    if ('path' in result && result.path) {
      setSaveLoadMessage({ type: 'ok', text: `Saved to ${result.path}` });
    } else if ('error' in result) {
      setSaveLoadMessage({ type: 'err', text: result.error ?? 'Save failed' });
    }
    setTimeout(() => setSaveLoadMessage(null), 3000);
  }, [saveGame, settings]);

  const handleLoad = useCallback(async () => {
    const result = await loadSavedGame((s) => {
      if (s && typeof s === 'object' && s !== null) {
        applySettings({ ...settings, ...(s as Partial<DabSettings>) });
      }
    });
    if ('error' in result && result.error) {
      setSaveLoadMessage({ type: 'err', text: result.error });
      setTimeout(() => setSaveLoadMessage(null), 4000);
    }
  }, [loadSavedGame, applySettings, settings]);

  if (!state) {
    return <LoadingScreen error={error} />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${palette.bgPage} ${palette.textPrimary}`}>
      <Header
        busy={busy}
        gameEngineStatus={gameEngineStatus}
        botEngineStatus={botEngineStatus}
        defaultNx={settings.defaultNx}
        defaultNy={settings.defaultNy}
        onNewGame={loadGame}
        onOpenSettings={() => setSettingsOpen(true)}
        onRestartEngines={onRestartEngines}
        onUndo={undo}
        onRedo={redo}
        onSave={handleSave}
        onLoad={handleLoad}
        canUndo={moveHistory.length > 0}
        canRedo={redoStack.length > 0}
      />

      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onApply={(s) => {
            applySettings(s);
            setSettingsOpen(false);
            syncGameEngine();
          }}
        />
      )}

      <main
        className={
          settings.logsEnabled && settings.logsLayout === 'drawer'
            ? 'flex-1 flex flex-row min-h-0 min-w-0'
            : 'flex-1 flex flex-col min-h-0 p-4 gap-3'
        }
      >
        <div
          className={
            settings.logsEnabled && settings.logsLayout === 'drawer'
              ? 'flex-1 flex flex-col min-h-0 min-w-0 p-4 gap-3'
              : 'contents'
          }
        >
          {saveLoadMessage && (
            <div
              className={
                saveLoadMessage.type === 'ok'
                  ? 'rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800 text-sm'
                  : 'rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800 text-sm'
              }
            >
              {saveLoadMessage.text}
            </div>
          )}
          {over && <GameOverBanner state={state} />}
          {error && <ErrorBanner message={error} />}
          <ControlsCard
            state={state}
            over={over}
            busy={busy}
            onBotMove={onBotMove}
            gameMode={settings.gameMode}
          />
          <div
            className={`flex-1 flex items-center justify-center min-h-0 ${busy ? 'pointer-events-none opacity-75' : ''}`}
          >
            <GameBoard
              state={state}
              possibleEdges={possibleEdges}
              boxOwners={boxOwners}
              onEdgeClick={onEdgeClick}
              disabled={busy}
            />
          </div>
          {settings.logsEnabled && settings.logsLayout === 'bottom' && (
            <LogPanel
              logsVerbose={settings.verboseLogs}
              autoScroll={settings.autoScrollLogs}
            />
          )}
        </div>

        {settings.logsEnabled && settings.logsLayout === 'drawer' &&
          (logsDrawerOpen ? (
            <div
              className="flex flex-col shrink-0 border-l border-gray-200 bg-gray-900 min-h-0"
              style={{ width: LOGS_DRAWER_WIDTH }}
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-700 shrink-0">
                <span className="text-xs font-medium text-gray-400">Log</span>
                <button
                  type="button"
                  className={`${btnSecondary} text-xs py-1 px-2`}
                  onClick={() => setLogsDrawerOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <LogPanel
                  logsVerbose={settings.verboseLogs}
                  autoScroll={settings.autoScrollLogs}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="shrink-0 w-8 border-l border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center py-4"
              style={{ writingMode: 'vertical-rl' }}
              onClick={() => setLogsDrawerOpen(true)}
            >
              Logs
            </button>
          ))}
      </main>
    </div>
  );
}
