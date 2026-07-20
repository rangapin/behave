import type { Critique, Grade, StarFlags } from "./types";

/**
 * Shown when the model returns something unreadable. §3: never block the session on
 * a parse error.
 */
export const FALLBACK_FEEDBACK =
  "critique unavailable — the model returned something unreadable. your transcript is below; self-check it against STAR.";

const GRADES: readonly Grade[] = ["strong", "adequate", "weak"];

/** Strip ```json fences and any prose the model wrapped around the object. */
export function extractJson(raw: string): string {
  let s = raw.trim();

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) s = fence[1].trim();

  // Model sometimes prefixes "Here's the critique:" or similar. Take the outermost
  // brace-delimited span rather than the first, so nested objects survive.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last > first) s = s.slice(first, last + 1);

  return s.trim();
}

function isBool(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/** All four flags must be genuine booleans, or we drop the block entirely. */
function parseStar(v: unknown): StarFlags | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (
    !isBool(o.situation) ||
    !isBool(o.task) ||
    !isBool(o.action) ||
    !isBool(o.result)
  ) {
    return undefined;
  }
  return {
    situation: o.situation,
    task: o.task,
    action: o.action,
    result: o.result,
  };
}

function parseGrade(v: unknown): Grade | undefined {
  return typeof v === "string" && (GRADES as readonly string[]).includes(v)
    ? (v as Grade)
    : undefined;
}

function parseFeedback(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

const RANK: Record<Grade, number> = { weak: 0, adequate: 1, strong: 2 };

/** The best grade these flags permit, per §3's rule. */
export function ceilingFromFlags(star: StarFlags): Grade {
  const missing = [star.situation, star.task, star.action, star.result].filter(
    (present) => !present,
  ).length;

  if (missing >= 2) return "weak";
  if (missing === 1) return "adequate";
  return "strong";
}

/**
 * The flags are the source of truth for the grade ceiling.
 *
 * §3 tells the model "grade must follow the flags", but the whole point of this drill
 * is that it doesn't flatter you — so we enforce the ceiling rather than trusting it.
 * A model may grade *below* what the flags allow (a fully-STAR answer can still be
 * merely adequate on content); it may never grade above.
 */
export function clampGradeToFlags(grade: Grade, star: StarFlags): Grade {
  const ceiling = ceilingFromFlags(star);
  return RANK[grade] > RANK[ceiling] ? ceiling : grade;
}

/**
 * Used when the flags parsed but the grade didn't. Never awards "strong": §3 reserves
 * that for all-four-true *and* genuinely good content, and content is exactly the
 * judgement we just lost.
 */
export function deriveGradeFromFlags(star: StarFlags): Grade {
  const ceiling = ceilingFromFlags(star);
  return ceiling === "strong" ? "adequate" : ceiling;
}

export type ParseOptions = {
  /** false for nostar questions — star and grade are expected to be absent. §3. */
  expectStar: boolean;
};

/**
 * Defensive by construction: the model will occasionally return malformed JSON, and
 * a partial parse beats discarding a critique the user just waited on.
 */
export function parseCritique(raw: string, opts: ParseOptions): Critique {
  const fallback: Critique = { feedback: [FALLBACK_FEEDBACK], degraded: true };

  if (typeof raw !== "string" || !raw.trim()) return fallback;

  let data: unknown;
  try {
    data = JSON.parse(extractJson(raw));
  } catch {
    return fallback;
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return fallback;
  }
  const o = data as Record<string, unknown>;

  const feedback = parseFeedback(o.feedback);
  // Feedback is the payload. Without it there is nothing worth rendering.
  if (feedback.length === 0) return fallback;

  const followup =
    typeof o.followup === "string" && o.followup.trim()
      ? o.followup.trim()
      : undefined;

  const critique: Critique = { feedback, followup };

  if (opts.expectStar) {
    const star = parseStar(o.star);
    if (star) {
      critique.star = star;
      const grade = parseGrade(o.grade);
      // No usable grade but valid flags: derive it rather than showing none.
      critique.grade = grade ? clampGradeToFlags(grade, star) : deriveGradeFromFlags(star);
    }
    // star missing or malformed: keep the feedback, drop the chips. §3.
  }

  return critique;
}
