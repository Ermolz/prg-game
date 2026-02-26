import type { DabSettings } from '../model/settings';
import { DEFAULT_SETTINGS } from '../model/settings';

const KEY = 'dab.settings';

export function loadSettings(): DabSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DabSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: DabSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
