import type { Attempt, StarFlags } from "./types";

export type StarMiss = { component: keyof StarFlags; missed: number; of: number };

export type WeakStory = {
  questionId: string;
  skips: number;
  overtimes: number;
  /** skips + overtimes — the "rewrite these" signal §7 ranks on. */
  score: number;
};

/**
 * The questions you skip or blow the clock on most — §7's "weakest stories —
 * rewrite these", ranked across all history. A story that was always answered in
 * time has nothing to flag, so score 0 is dropped rather than shown as a zero.
 * An abandoned run counts as an overtime (it ran 3× the limit — the same signal).
 */
export function weakestStories(
  attempts: readonly Attempt[],
  limit = 3,
): WeakStory[] {
  const byId = new Map<string, WeakStory>();
  for (const a of attempts) {
    const row =
      byId.get(a.questionId) ??
      { questionId: a.questionId, skips: 0, overtimes: 0, score: 0 };
    if (a.skipped) row.skips += 1;
    if (a.overtime) row.overtimes += 1;
    row.score = row.skips + row.overtimes;
    byId.set(a.questionId, row);
  }
  return [...byId.values()]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type SessionStats = {
  answered: number;
  skipped: number;
  abandoned: number;
  avgTimeSec: number;
  overtimes: number;
  /** The component dropped most often, or null when nothing was STAR-graded. */
  worstStar: StarMiss | null;
};

const COMPONENTS: ReadonlyArray<keyof StarFlags> = [
  "situation",
  "task",
  "action",
  "result",
];

/**
 * §7's stats, computed over whatever attempts you hand it — this session in
 * phase 1, all of history once phase 3 persists them.
 */
export function summarize(attempts: readonly Attempt[]): SessionStats {
  const skipped = attempts.filter((a) => a.skipped).length;
  const abandoned = attempts.filter((a) => a.abandoned).length;
  const answered = attempts.filter((a) => !a.skipped && !a.abandoned);

  const graded = attempts.filter((a): a is Attempt & { star: StarFlags } => !!a.star);

  let worstStar: StarMiss | null = null;
  if (graded.length > 0) {
    for (const component of COMPONENTS) {
      const missed = graded.filter((a) => !a.star[component]).length;
      if (!worstStar || missed > worstStar.missed) {
        worstStar = { component, missed, of: graded.length };
      }
    }
    // Nothing dropped is not a "worst" — say nothing rather than flag a zero.
    if (worstStar && worstStar.missed === 0) worstStar = null;
  }

  const totalTime = answered.reduce((sum, a) => sum + a.timeUsedSec, 0);

  return {
    answered: answered.length,
    skipped,
    abandoned,
    overtimes: answered.filter((a) => a.overtime).length,
    avgTimeSec: answered.length ? Math.round(totalTime / answered.length) : 0,
    worstStar,
  };
}
