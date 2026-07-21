import { SEED_BANK } from "./seed-bank";
import { loadBank, saveBank } from "./storage";
import type { Question } from "./types";

/**
 * External store for the question bank, mirroring settings-store: components read
 * the persisted bank via useSyncExternalStore without loading state inside an
 * effect. The server snapshot is the seed bank (what hydrates); the client
 * snapshot then supplies the stored, possibly-edited bank.
 */

let cached: Question[] | null = null;
const listeners = new Set<() => void>();

export function subscribeBank(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBank(): Question[] {
  if (!cached) cached = loadBank();
  return cached;
}

export function getServerBank(): Question[] {
  return SEED_BANK;
}

export function setBank(next: Question[]): void {
  cached = next;
  saveBank(next);
  listeners.forEach((l) => l());
}
