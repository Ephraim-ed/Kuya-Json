"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Global UI preferences, persisted across workspaces and reloads. */
export interface Preferences {
  /** Move workspace tabs into the left sidebar as a vertical list. */
  verticalTabs: boolean;
  /** When vertical tabs are on, stack tabs (top) and tree (bottom) instead of a switcher. */
  sidebarSplit: boolean;
}

const KEY = "kuya-json:preferences";

const DEFAULTS: Preferences = {
  verticalTabs: false,
  sidebarSplit: false,
};

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const loaded = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) });
    } catch {
      /* ignore malformed / unavailable storage */
    }
    loaded.current = true;
  }, []);

  // Persist after the initial load.
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  return { prefs, setPref };
}
