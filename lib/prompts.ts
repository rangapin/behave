/**
 * The three tuned prompts, verbatim from specs.md §3. Do not rewrite without being
 * asked — they are calibrated, and the anti-inflation language is load-bearing.
 */

export function buildVariantPrompt(question: string): string {
  return `Rephrase this behavioral interview question so it asks for the same underlying story but with different wording and angle, as a real hiring manager for a technical support role at an AI startup would phrase it conversationally. Return ONLY the rephrased question, nothing else.

Question: "${question}"`;
}

export type CritiqueInput = {
  questionAsked: string;
  transcript: string;
  timeUsedSec: number;
  limitSec: number;
  /** Set when this answer is a follow-up probe, to the original question's wording. */
  originalQuestion?: string;
  /** nostar questions get the clarity/specificity/concision rubric instead of STAR. */
  nostar?: boolean;
};

function contextLine(originalQuestion?: string): string {
  return originalQuestion
    ? `This was a follow-up probe after their initial answer to "${originalQuestion}".`
    : "";
}

function overtimeNote(timeUsedSec: number, limitSec: number): string {
  const over = timeUsedSec - limitSec;
  return over > 0
    ? `They ran ${over} seconds over the limit — factor that into whether they rambled.`
    : "";
}

/** Shared head: persona, then the answer under evaluation. */
function head(input: CritiqueInput): string {
  return `You are a skeptical, experienced hiring manager evaluating a candidate for a technical Product Support role at an AI startup. You give calibrated, honest critique — never generic praise. ${contextLine(input.originalQuestion)}

Question asked: "${input.questionAsked}"
Candidate's spoken answer (raw transcript, may have transcription errors — judge substance, not typos): "${input.transcript}"
Time used: ${input.timeUsedSec} seconds (limit was ${input.limitSec}). ${overtimeNote(input.timeUsedSec, input.limitSec)}`;
}

function starPrompt(input: CritiqueInput): string {
  return `${head(input)}

Grade this answer against STAR. A behavioral answer that skips a component is incomplete no matter how fluent it sounded:
- Situation: a specific, concrete setting — real people, a real system, a time and place. "At my last job we often had..." is NOT a situation.
- Task: what THEY personally owned, distinct from what the team owned.
- Action: the specific steps they personally took. "We decided" is not an action; "I did X" is.
- Result: an observable or measurable outcome. "It went better" is not a result.

Also: did they ramble or front-load context too long?

Respond ONLY with valid JSON, no markdown fences:
{"star":{"situation":true,"task":false,"action":true,"result":false},"grade":"weak","feedback":["point 1","point 2","point 3"],"followup":"one sharp adaptive follow-up question a real interviewer would ask to probe the weakest part of this answer"}

Set each star field true ONLY if that component was genuinely present and specific — default to false when in doubt. grade must follow the flags: "weak" if two or more are false, "adequate" if exactly one is false, "strong" only if all four are true AND the content is genuinely good. Never award "strong" to compensate for confident delivery. Keep each feedback point under 25 words, direct, specific to what they said, and name the missing STAR components explicitly. If the answer was genuinely strong, say what made it strong — but never inflate.`;
}

function nostarPrompt(input: CritiqueInput): string {
  return `${head(input)}

This is NOT a story question. Do not ask for a past example and do not grade it against STAR. Judge it on:
- Clarity: is there a clear point of view, stated early, that you could repeat back after hearing it once?
- Specificity: does it commit to something concrete — real practices, real tradeoffs, real reasons — or would it be interchangeable with what any candidate would say?
- Concision: does it get there directly, or circle the same idea?

Also: did they ramble or front-load context too long?

Respond ONLY with valid JSON, no markdown fences:
{"feedback":["point 1","point 2","point 3"],"followup":"one sharp adaptive follow-up question a real interviewer would ask to probe the weakest part of this answer"}

Keep each feedback point under 25 words, direct, and specific to what they actually said. The main failure mode here is an answer that sounds reasonable but could have come from any candidate — name that explicitly when you see it. Never inflate; confident delivery is not a substitute for a real point of view.`;
}

export function buildCritiquePrompt(input: CritiqueInput): string {
  return input.nostar ? nostarPrompt(input) : starPrompt(input);
}
