/**
 * Minimal SpeechRecognition typings — the Web Speech API is not in lib.dom.
 * Chromium-only; every consumer must check `speechRecognitionSupported()` first.
 */

export type SpeechRecognitionAlternative = { transcript: string; confidence: number };

export type SpeechRecognitionResult = {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};

export type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};

export type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

export type SpeechRecognitionErrorEvent = { error: string; message?: string };

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as SpeechWindow;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Errors that end the session for good. Everything else (notably `no-speech`,
 * which Chrome fires constantly on pauses) is recoverable by restarting.
 */
export const FATAL_SPEECH_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
]);
