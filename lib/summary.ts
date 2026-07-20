import type { Attempt, StarFlags } from "./types";

export type StarMiss = { component: keyof StarFlags; missed: number; of: number };

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
