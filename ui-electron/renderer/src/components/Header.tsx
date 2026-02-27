import type { EngineStatus } from '../model/types';
import { btnSecondary, btnGhost, palette } from '../lib/constants';
import { engineStatusChipClass, engineStatusDotClass } from '../lib/utils';

type HeaderProps = {
  busy: boolean;
  gameEngineStatus: EngineStatus;
  botEngineStatus: EngineStatus;
  defaultNx: number;
  defaultNy: number;
  onNewGame: (nx: number, ny: number) => void;
  onOpenSettings?: () => void;
  onRestartEngines?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onLoad: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

function StatusChip({ label, status }: { label: string; status: EngineStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${engineStatusChipClass(status)}`}
      title={label}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${engineStatusDotClass(status)}`} />
      {label}: {status}
    </span>
  );
}

export function Header({
  busy,
  gameEngineStatus,
  botEngineStatus,
  defaultNx,
  defaultNy,
  onNewGame,
  onOpenSettings,
  onRestartEngines,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  canUndo,
  canRedo,
}: HeaderProps) {
  return (
    <header
      className={`sticky top-0 z-10 ${palette.bgCard} border-b ${palette.borderCard} shadow-sm`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={`text-lg font-bold ${palette.textPrimary}`}>Dots and Boxes</h1>
          <div className="h-5 w-px bg-gray-200" aria-hidden />
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => onNewGame(defaultNx, defaultNy)}
              disabled={busy}
            >
              New game ({defaultNx}×{defaultNy})
            </button>
            <button type="button" className={btnSecondary} onClick={() => onNewGame(2, 2)} disabled={busy}>
              2×2
            </button>
            <button type="button" className={btnSecondary} onClick={() => onNewGame(3, 2)} disabled={busy}>
              3×2
            </button>
          </div>
          <div className="h-5 w-px bg-gray-200" aria-hidden />
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" className={btnGhost} onClick={onUndo} disabled={busy || !canUndo} title="Undo (Ctrl+Z)">
              Undo
            </button>
            <button type="button" className={btnGhost} onClick={onRedo} disabled={busy || !canRedo} title="Redo (Ctrl+Y)">
              Redo
            </button>
            <button type="button" className={btnGhost} onClick={onSave} disabled={busy}>
              Save
            </button>
            <button type="button" className={btnGhost} onClick={onLoad} disabled={busy}>
              Load
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip label="Game" status={gameEngineStatus} />
          <button
            type="button"
            className={`${btnSecondary} text-xs py-1 px-2`}
            onClick={onRestartEngines ?? (() => window.dab?.restartEngines?.())}
            disabled={busy}
            title="Restart both engines and re-sync current game"
          >
            Restart
          </button>
          <StatusChip label="Bot" status={botEngineStatus} />
          {onOpenSettings && (
            <button type="button" className={btnSecondary} onClick={onOpenSettings} disabled={busy}>
              Settings
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
