import type { Edge } from './types';
import type { EngineInstance } from './EngineInstance';

export type BotMoveUnifiedParams = { nx: number; ny: number; history: Edge[] };
export type ApplyMoveResult = {
  state: unknown;
  closedBoxes?: unknown[];
  extraTurn?: boolean;
};
export type BotMoveUnifiedResult = ApplyMoveResult & { move: Edge };

export async function botMoveUnified(
  game: EngineInstance,
  bot: EngineInstance,
  params: BotMoveUnifiedParams
): Promise<BotMoveUnifiedResult> {
  const { nx, ny, history } = params;
  await bot.request('init', { nx, ny });
  for (const edge of history) {
    await bot.request('applyMove', { edge });
  }
  const botRes = await bot.request<{ move: Edge }>('botMove', {});
  const gameRes = await game.request<ApplyMoveResult>('applyMove', { edge: botRes.move });
  return { ...gameRes, move: botRes.move };
}
