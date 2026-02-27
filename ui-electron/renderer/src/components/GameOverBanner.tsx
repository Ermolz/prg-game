import type { State } from '../model/types';

export function GameOverBanner({ state }: { state: State }) {
  const text =
    state.s1 > state.s2 ? 'P1 wins' : state.s2 > state.s1 ? 'P2 wins' : 'Tie';
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 font-semibold text-green-800 shadow-sm">
      Game over — {text}
    </div>
  );
}
