import {
  appendAttempt,
  clearHistory,
  loadHistory,
} from "./storage";
import type { Attempt } from "./types";

/**
 * External store for attempt history, mirroring settings-store. Writes go through
 * storage.ts and then notify subscribers, so the summary and history page reflect
 * a just-recorded attempt without reloading. The server snapshot is a stable empty
 * array; the client snapshot is the persisted history.
 */

const EMPTY: Attempt[] = [];
let cached: Attempt[] | null = null;
const listeners = new Set<() => void>();

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getHistory(): Attempt[] {
  if (!cached) cached = loadHistory();
  return cached;
}

export function getServerHistory(): Attempt[] {
  return EMPTY;
}

export function recordAttempt(attempt: Attempt): void {
  appendAttempt(attempt);
  cached = [...(cached ?? loadHistory()), attempt];
  listeners.forEach((l) => l());
}

export function resetHistory(): void {
  clearHistory();
  cached = EMPTY;
  listeners.forEach((l) => l());
}
