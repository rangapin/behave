import { loadSettings, saveSettings } from "./storage";
import { DEFAULT_SETTINGS, type Settings } from "./types";

/**
 * A tiny external store so components can read persisted settings via
 * useSyncExternalStore. The server snapshot is always DEFAULT_SETTINGS, which is
 * what hydrates; the client snapshot then supplies the stored values without a
 * mismatch — and without loading state inside an effect.
 */

let cached: Settings | null = null;
const listeners = new Set<() => void>();

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable identity between writes — required of a getSnapshot. */
export function getSettings(): Settings {
  if (!cached) cached = loadSettings();
  return cached;
}

export function getServerSettings(): Settings {
  return DEFAULT_SETTINGS;
}

export function updateSettings(patch: Partial<Settings>): void {
  cached = { ...getSettings(), ...patch };
  saveSettings(cached);
  listeners.forEach((l) => l());
}
