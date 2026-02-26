import { useState, useEffect } from 'react';
import type { DabSettings, EngineKind } from '../model/settings';

const ENGINES: EngineKind[] = ['csharp', 'python', 'java', 'prolog'];

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  settings: DabSettings;
  onApply: (s: DabSettings) => void;
};

export function SettingsModal({ isOpen, onClose, settings, onApply }: SettingsModalProps) {
  const [gameEngine, setGameEngine] = useState<EngineKind>(settings.gameEngine);
  const [botEngine, setBotEngine] = useState<EngineKind>(settings.botEngine);
  const [logsEnabled, setLogsEnabled] = useState(settings.logsEnabled);
  const [logsVerbose, setLogsVerbose] = useState(settings.logsVerbose);

  useEffect(() => {
    if (isOpen) {
      setGameEngine(settings.gameEngine);
      setBotEngine(settings.botEngine);
      setLogsEnabled(settings.logsEnabled);
      setLogsVerbose(settings.logsVerbose);
    }
  }, [isOpen, settings]);

  const handleApply = () => {
    onApply({
      gameEngine,
      botEngine,
      logsEnabled,
      logsVerbose,
    });
    onClose();
  };

  const handleRestartEngines = () => {
    window.dab.restartEngine?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>

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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="logsEnabled"
            checked={logsEnabled}
            onChange={(e) => setLogsEnabled(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="logsEnabled" className="text-sm text-gray-700">Logs enabled</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="logsVerbose"
            checked={logsVerbose}
            onChange={(e) => setLogsVerbose(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="logsVerbose" className="text-sm text-gray-700">Verbose logs</label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleApply}
          >
            Apply
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            onClick={handleRestartEngines}
          >
            Restart engines
          </button>
        </div>
      </div>
    </div>
  );
}
