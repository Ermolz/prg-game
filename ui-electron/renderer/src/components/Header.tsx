import type { EngineStatus } from '../model/types';
import { btnSecondary } from '../lib/constants';
import { engineStatusClass } from '../lib/utils';

type HeaderProps = {
  engineStatus: EngineStatus;
  busy: boolean;
  onNew22: () => void;
  onNew32: () => void;
  onOpenSettings?: () => void;
};

export function Header({ engineStatus, busy, onNew22, onNew32, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Dots and Boxes</h1>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onNew22} disabled={busy}>
            New 2×2
          </button>
          <button type="button" className={btnSecondary} onClick={onNew32} disabled={busy}>
            New 3×2
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${engineStatusClass(engineStatus)}`}>
          Engine: {engineStatus}
        </span>
        {onOpenSettings && (
          <button type="button" className={btnSecondary} onClick={onOpenSettings} disabled={busy}>
            Settings
          </button>
        )}
        <button
          type="button"
          className={btnSecondary}
          onClick={() => window.dab?.restartEngine?.()}
          disabled={busy}
        >
          Restart engine
        </button>
      </div>
    </header>
  );
}
