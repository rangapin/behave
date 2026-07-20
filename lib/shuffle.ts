import type { Question, SessionLength } from "./types";

/** Returns a float in [0, 1). Injectable so the shuffle stays testable. */
export type Rng = () => number;

/**
 * Fisher-Yates. Returns a new array — never mutates the input, because the caller
 * is usually holding the bank itself.
 */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Draw a session from the bank.
 *
 * No memory across sessions by design (specs.md §2) — this stays a pure function so
 * it can be tested without a store. nostory questions are deliberately included:
 * the amber flag only means something if they can come up, and skipping them is
 * what feeds the "weakest stories" ranking.
 */
export function pickSession(
  bank: readonly Question[],
  count: SessionLength,
  rng: Rng = Math.random,
): Question[] {
  const shuffled = shuffle(bank, rng);
  if (count === "all") return shuffled;
  return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)));
}
