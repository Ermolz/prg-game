import type { State } from '../model/types';
import { card, btnPrimary } from '../lib/constants';

type ControlsCardProps = {
  state: State;
  over: boolean;
  busy: boolean;
  onBotMove: () => void;
};

export function ControlsCard({ state, over, busy, onBotMove }: ControlsCardProps) {
  return (
    <section className={card}>
      <p className="text-gray-700 mb-3">
        Score: P1 = {state.s1} | P2 = {state.s2} — Turn: P{state.player}
        {over && ' (game over)'}
      </p>
      <div className="flex flex-wrap gap-2">
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
