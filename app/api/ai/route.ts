import Anthropic from "@anthropic-ai/sdk";
import { guard } from "@/lib/guard";
import { parseCritique } from "@/lib/parse-critique";
import { cleanVariant } from "@/lib/parse-variant";
import { buildCritiquePrompt, buildVariantPrompt } from "@/lib/prompts";
import { FALLBACK_FEEDBACK } from "@/lib/parse-critique";
import type { Critique } from "@/lib/types";

// specs.md §3 — the model is pinned here deliberately.
const MODEL = "claude-sonnet-4-6";

type VariantPayload = { question: string };

type CritiquePayload = {
  questionAsked: string;
  transcript: string;
  timeUsedSec: number;
  limitSec: number;
  nostar?: boolean;
  originalQuestion?: string;
  /** Follow-up answers get no further follow-up — max depth 1, §2. */
  isFollowup?: boolean;
};

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/** Concatenate the text blocks of a response, ignoring any other block type. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function variant(payload: VariantPayload) {
  const original = payload.question;

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: "user", content: buildVariantPrompt(original) }],
  });

  const rephrased = cleanVariant(textOf(message));

  // §3: 15 < length < 400, else fall back to the canonical wording. Validated
  // here rather than client-side so the route always returns a usable question.
  const usable = rephrased.length > 15 && rephrased.length < 400;

  return Response.json({
    question: usable ? rephrased : original,
    rephrased: usable,
    original,
  });
}

async function critique(payload: CritiquePayload) {
  const prompt = buildCritiquePrompt({
    questionAsked: payload.questionAsked,
    transcript: payload.transcript,
    timeUsedSec: payload.timeUsedSec,
    limitSec: payload.limitSec,
    originalQuestion: payload.originalQuestion,
    nostar: payload.nostar,
  });

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const parsed = parseCritique(textOf(message), { expectStar: !payload.nostar });

  // Max depth 1 — a follow-up's critique never offers another follow-up.
  const result: Critique = payload.isFollowup
    ? { ...parsed, followup: undefined }
    : parsed;

  return Response.json(result);
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  }

  let body: { op?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "malformed body" }, { status: 400 });
  }

  try {
    switch (body.op) {
      case "variant":
        return await variant(body.payload as VariantPayload);
      case "critique":
        return await critique(body.payload as CritiquePayload);
      default:
        return Response.json({ error: `unknown op: ${body.op}` }, { status: 400 });
    }
  } catch (err) {
    // Upstream failure must not block the drill. Variant callers fall back to
    // the canonical wording; critique callers get the degraded critique.
    console.error("[/api/ai]", body.op, err);
    if (body.op === "critique") {
      const degraded: Critique = { feedback: [FALLBACK_FEEDBACK], degraded: true };
      return Response.json(degraded);
    }
    return Response.json({ error: "upstream failed" }, { status: 502 });
  }
}
