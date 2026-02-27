import type { Box, EngineStatus } from '../model/types';

export function boxKey(b: Box): string {
  return `${b.x},${b.y}`;
}

export function engineStatusClass(s: EngineStatus): string {
  if (s === 'ready') return 'bg-green-100 text-green-800';
  if (s === 'down' || s === 'restarting') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
}

/** For status chips: rounded-full, small text, dot indicator */
export function engineStatusChipClass(s: EngineStatus): string {
  if (s === 'ready') return 'rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800';
  if (s === 'down' || s === 'restarting') return 'rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800';
  return 'rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700';
}

export function engineStatusDotClass(s: EngineStatus): string {
  if (s === 'ready') return 'bg-green-600';
  if (s === 'down' || s === 'restarting') return 'bg-amber-500';
  return 'bg-gray-500';
}
