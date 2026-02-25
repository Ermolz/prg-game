import type { Box, EngineStatus } from '../model/types';

export function boxKey(b: Box): string {
  return `${b.x},${b.y}`;
}

export function engineStatusClass(s: EngineStatus): string {
  if (s === 'ready') return 'bg-green-100 text-green-800';
  if (s === 'down' || s === 'restarting') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}
