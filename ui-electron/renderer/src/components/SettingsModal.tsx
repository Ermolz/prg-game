import { useState, useEffect } from 'react';
import type { DabSettings, EngineKind, GameMode, LogsLayout } from '../model/settings';
import { btnPrimary, btnSecondary } from '../lib/constants';

const ENGINES: EngineKind[] = ['csharp', 'python', 'java', 'prolog'];
const GAME_MODES: GameMode[] = ['PvP', 'PvE', 'EvE'];
const LOGS_LAYOUTS: LogsLayout[] = ['bottom', 'drawer'];

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: DabSettings;
  onApply: (s: DabSettings) => void;
};

export function SettingsModal({ isOpen, onClose, settings, onApply }: SettingsModalProps) {
  const [gameEngine, setGameEngine] = useState<EngineKind>(settings.gameEngine);
  const [botEngine, setBotEngine] = useState<EngineKind>(settings.botEngine);
  const [gameMode, setGameMode] = useState<GameMode>(settings.gameMode);
  const [defaultNx, setDefaultNx] = useState(settings.defaultNx);
  const [defaultNy, setDefaultNy] = useState(settings.defaultNy);
  const [logsEnabled, setLogsEnabled] = useState(settings.logsEnabled);
  const [verboseLogs, setVerboseLogs] = useState(settings.verboseLogs);
  const [autoScrollLogs, setAutoScrollLogs] = useState(settings.autoScrollLogs);
  const [logsLayout, setLogsLayout] = useState<LogsLayout>(settings.logsLayout);

  useEffect(() => {
    if (isOpen) {
      setGameEngine(settings.gameEngine);
      setBotEngine(settings.botEngine);
      setGameMode(settings.gameMode);
      setDefaultNx(settings.defaultNx);
      setDefaultNy(settings.defaultNy);
      setLogsEnabled(settings.logsEnabled);
      setVerboseLogs(settings.verboseLogs);
      setAutoScrollLogs(settings.autoScrollLogs);
      setLogsLayout(settings.logsLayout);
    }
  }, [isOpen, settings]);

  const handleApply = () => {
    onApply({
      ...settings,
      gameEngine,
      botEngine,
      gameMode,
      defaultNx: Math.max(1, Math.min(12, defaultNx)),
      defaultNy: Math.max(1, Math.min(12, defaultNy)),
      logsEnabled,
      verboseLogs,
      autoScrollLogs,
      logsLayout,
    });
    onClose();
  };

  const handleRestartEngines = () => {
    window.dab?.restartEngines?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Mode</label>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as GameMode)}
          >
            {GAME_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Default board size (Nx × Ny)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              max={12}
              value={defaultNx}
              onChange={(e) => setDefaultNx(parseInt(e.target.value, 10) || 2)}
              className="border border-gray-300 rounded px-3 py-2 w-20 text-gray-900"
            />
            <span className="text-gray-500">×</span>
            <input
              type="number"
              min={1}
              max={12}
              value={defaultNy}
              onChange={(e) => setDefaultNy(parseInt(e.target.value, 10) || 2)}
              className="border border-gray-300 rounded px-3 py-2 w-20 text-gray-900"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Game engine</label>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white"
            value={gameEngine}
            onChange={(e) => setGameEngine(e.target.value as EngineKind)}
          >
            {ENGINES.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Bot engine</label>
          <select
            className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white"
            value={botEngine}
            onChange={(e) => setBotEngine(e.target.value as EngineKind)}
          >
            {ENGINES.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Logs</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={logsEnabled}
              onChange={(e) => setLogsEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Logs enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={verboseLogs}
              onChange={(e) => setVerboseLogs(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Verbose logs</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScrollLogs}
              onChange={(e) => setAutoScrollLogs(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Auto-scroll logs</span>
          </label>
          {logsEnabled && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Logs position</span>
              <select
                className="border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white text-sm"
                value={logsLayout}
                onChange={(e) => setLogsLayout(e.target.value as LogsLayout)}
              >
                {LOGS_LAYOUTS.map((l) => (
                  <option key={l} value={l}>{l === 'bottom' ? 'Bottom panel' : 'Right drawer'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button type="button" className={btnPrimary} onClick={handleApply}>
            Apply
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={btnSecondary} onClick={handleRestartEngines}>
            Restart engines
          </button>
        </div>
      </div>
    </div>
  );
}
