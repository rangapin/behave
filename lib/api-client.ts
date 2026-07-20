import { SECRET_HEADER } from "./constants";
import type { Critique } from "./types";

function headers(): HeadersInit {
  return {
    "content-type": "application/json",
    [SECRET_HEADER]: process.env.NEXT_PUBLIC_SURFACE_SECRET ?? "",
  };
}

export type VariantResult = {
  question: string;
  rephrased: boolean;
  original: string;
};

/**
 * Never throws — a failed rephrase falls back to the canonical wording so the
 * drill continues. §3.
 */
export async function fetchVariant(question: string): Promise<VariantResult> {
  const fallback: VariantResult = { question, rephrased: false, original: question };
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ op: "variant", payload: { question } }),
    });
    if (!res.ok) return fallback;
    return (await res.json()) as VariantResult;
  } catch {
    return fallback;
  }
}

export type CritiqueRequest = {
  questionAsked: string;
  transcript: string;
  timeUsedSec: number;
  limitSec: number;
  nostar?: boolean;
  originalQuestion?: string;
  isFollowup?: boolean;
};

/** Never throws — the route already degrades, and so does this. */
export async function fetchCritique(input: CritiqueRequest): Promise<Critique> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ op: "critique", payload: input }),
    });
    return (await res.json()) as Critique;
  } catch {
    const { FALLBACK_FEEDBACK } = await import("./parse-critique");
    return { feedback: [FALLBACK_FEEDBACK], degraded: true };
  }
}

/** Returns an object URL for the spoken audio, or null to fall back to the browser voice. */
export async function fetchSpeech(
  text: string,
  voiceId: string,
): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: body.error ?? `tts failed (${res.status})` };
    }
    return { url: URL.createObjectURL(await res.blob()) };
  } catch {
    return { error: "tts unreachable" };
  }
}
