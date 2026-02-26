import { useState, useCallback } from 'react';
import type { DabSettings } from '../model/settings';
import { loadSettings, saveSettings } from '../lib/settingsStorage';

export function useSettings(): {
  settings: DabSettings;
  setSettings: (s: DabSettings) => void;
  applySettings: (s: DabSettings) => void;
} {
  const [settings, setSettingsState] = useState<DabSettings>(loadSettings);

  const setSettings = useCallback((s: DabSettings) => {
    setSettingsState(s);
  }, []);

  const applySettings = useCallback((s: DabSettings) => {
    saveSettings(s);
    setSettingsState(s);
    window.dab.setSettings(s);
  }, []);

  return { settings, setSettings, applySettings };
}
