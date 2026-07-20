import { SEED_BANK, SEED_VERSION } from "./seed-bank";
import { DEFAULT_SETTINGS, type Attempt, type Question, type Settings } from "./types";

export const KEYS = {
  bank: "surface:bank",
  bankVersion: "surface:bankVersion",
  settings: "surface:settings",
  history: "surface:history",
} as const;

/** Every read/write goes through here — the app renders on the server first. */
function ls(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage disabled (private mode, blocked cookies)
  }
}

function read<T>(key: string, fallback: T): T {
  const store = ls();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  const store = ls();
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // quota or disabled storage — the session still works, it just won't persist.
  }
}

/**
 * Seeds on first run, and re-seeds when SEED_VERSION outruns the stored version.
 * Without the version check, editing seed-bank.ts leaves the browser serving the old
 * bank forever, which presents as a phantom bug. specs.md §5.
 *
 * Phase 3 adds CRUD on top of this — the data layer does not change again.
 */
export function loadBank(): Question[] {
  const storedVersion = read<number>(KEYS.bankVersion, 0);
  const stored = read<Question[] | null>(KEYS.bank, null);

  if (!stored || !Array.isArray(stored) || stored.length === 0 || storedVersion < SEED_VERSION) {
    write(KEYS.bank, SEED_BANK);
    write(KEYS.bankVersion, SEED_VERSION);
    return SEED_BANK;
  }
  return stored;
}

export function saveBank(bank: Question[]): void {
  write(KEYS.bank, bank);
  write(KEYS.bankVersion, SEED_VERSION);
}

export function loadSettings(): Settings {
  // Merge over defaults so a settings shape added later doesn't break an old store.
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: Settings): void {
  write(KEYS.settings, settings);
}

/** Phase 3 owns the history UI; logging the attempts costs nothing to do now. */
export function loadHistory(): Attempt[] {
  const stored = read<Attempt[]>(KEYS.history, []);
  return Array.isArray(stored) ? stored : [];
}

export function appendAttempt(attempt: Attempt): void {
  write(KEYS.history, [...loadHistory(), attempt]);
}
