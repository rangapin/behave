export type Question = {
  id: string;
  q: string; // canonical wording
  hint: string; // story-bank notes, revealed on demand
  nostory?: boolean; // flagged amber in UI — no prepared story yet
  nostar?: boolean; // not a story question — skip STAR grading (specs.md §3)
  tags?: string[];
};

export type StarFlags = {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
};

export type Grade = "strong" | "adequate" | "weak";

/**
 * A parsed critique. `star` and `grade` are absent for nostar questions and for
 * partial parses where feedback survived but the STAR block did not — §3 says to
 * render the feedback rather than discard the whole critique.
 */
export type Critique = {
  star?: StarFlags;
  grade?: Grade;
  feedback: string[];
  followup?: string;
  /** true when this came from the fallback path, not the model. */
  degraded?: boolean;
};

export type Attempt = {
  questionId: string;
  askedWording: string;
  timestamp: number;
  timeUsedSec: number;
  overtime: boolean;
  transcript: string;
  feedback: string[];
  followup?: string;
  star?: StarFlags;
  grade?: Grade;
  skipped?: boolean; // Skip pressed before answering
  abandoned?: boolean; // hit the 3x runaway ceiling (§2)
};

export type AnswerLimit = 90 | 120 | 150;
export type SessionLength = 5 | 8 | 12 | "all";
export type VoiceMode = "browser" | "elevenlabs" | "off";

export type Settings = {
  limitSec: AnswerLimit;
  questionsPerSession: SessionLength;
  rephrase: boolean;
  readAloud: boolean;
  voiceMode: VoiceMode;
  browserVoiceURI: string | null;
  elevenVoiceId: string;
};

export const DEFAULT_SETTINGS: Settings = {
  limitSec: 120,
  questionsPerSession: 5,
  rephrase: true,
  readAloud: true,
  voiceMode: "browser",
  browserVoiceURI: null,
  // Sarah — a *premade* voice. specs.md §4 originally defaulted to Rachel
  // (21m00Tcm4TlvDq8ikWAM), but Rachel is a library voice and free-tier keys
  // get 402 paid_plan_required on those. Premade voices work on every tier.
  elevenVoiceId: "EXAVITQu4vr4xnSDxMaL",
};

/** Runaway ceiling multiplier — specs.md §2. Safety net, not a second timer. */
export const RUNAWAY_MULTIPLIER = 3;
