import type { State } from '../model/types';

export function GameOverBanner({ state }: { state: State }) {
  const text =
    state.s1 > state.s2 ? 'P1 wins' : state.s2 > state.s1 ? 'P2 wins' : 'Tie';
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-800">
      {text}
    </div>
  );
}
