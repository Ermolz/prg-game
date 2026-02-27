import type { State } from '../model/types';
import { card, btnPrimary, palette } from '../lib/constants';

type ControlsCardProps = {
  state: State;
  over: boolean;
  busy: boolean;
  onBotMove: () => void;
  gameMode?: string;
};

export function ControlsCard({ state, over, busy, onBotMove, gameMode }: ControlsCardProps) {
  return (
    <section className={`${card} py-3`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className={`text-sm ${palette.textPrimary}`}>
            <span className="font-medium">P1</span> {state.s1}
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-medium">P2</span> {state.s2}
            <span className="mx-2 text-gray-400">—</span>
            Turn: <span className="font-medium">P{state.player}</span>
            {over && <span className="ml-2 text-gray-500">(game over)</span>}
          </p>
          {busy && (
            <span className="text-sm font-medium text-amber-600">Bot thinking…</span>
          )}
          {gameMode && (
            <span className={`text-xs ${palette.textMuted}`}>Mode: {gameMode}</span>
          )}
        </div>
        <button
          type="button"
          className={btnPrimary}
          onClick={onBotMove}
          disabled={busy || over}
        >
          Bot move
        </button>
      </div>
    </section>
  );
}
