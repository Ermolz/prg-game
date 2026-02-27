import type { DabSettings } from '../model/settings';
import { DEFAULT_SETTINGS } from '../model/settings';

const KEY = 'dab.settings';

export function loadSettings(): DabSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(merged) as (keyof DabSettings)[]) {
      if (parsed[k] !== undefined) (merged as Record<string, unknown>)[k] = parsed[k];
    }
    if (parsed.logsVerbose !== undefined && parsed.verboseLogs === undefined) {
      merged.verboseLogs = Boolean(parsed.logsVerbose);
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: DabSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
