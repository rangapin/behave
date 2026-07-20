"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  FATAL_SPEECH_ERRORS,
  getSpeechRecognitionCtor,
  speechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/speech-types";

/**
 * Transcription with an explicit stop gate.
 *
 * The bug this exists to prevent (specs.md §2, CLAUDE.md § Reference): Chrome
 * fires `onend` spontaneously on long silences even with `continuous: true`.
 * Resolving on the first `onend` truncates the transcript whenever you pause to
 * think, and the critique then grades half an answer as missing its Result —
 * wrong *and* invisible. So `onend` only resolves when we asked it to stop;
 * otherwise it restarts and keeps accumulating into the same buffer.
 */
/** Capability never changes for the life of the page. */
const subscribeNever = () => () => {};

export function useSpeechRecognition() {
  // Server renders `false` so the degrade notice is what hydrates; the client
  // snapshot then reports the real capability without a mismatch.
  const supported = useSyncExternalStore(
    subscribeNever,
    speechRecognitionSupported,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const stopRequestedRef = useRef(false);
  const resolveRef = useRef<((t: string) => void) | null>(null);
  const restartsRef = useRef(0);

  const settle = useCallback(() => {
    setListening(false);
    recognitionRef.current = null;
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(transcriptRef.current.trim());
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || recognitionRef.current) return;

    transcriptRef.current = "";
    stopRequestedRef.current = false;
    restartsRef.current = 0;
    setError(null);

    const build = (): SpeechRecognitionLike => {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            transcriptRef.current += result[0].transcript + " ";
          }
        }
      };

      rec.onerror = (event) => {
        if (FATAL_SPEECH_ERRORS.has(event.error)) {
          setError(event.error);
          stopRequestedRef.current = true; // don't fight a permission denial
        }
        // Non-fatal (`no-speech`, `network`, `aborted`) falls through to onend,
        // which restarts unless a stop was requested.
      };

      rec.onend = () => {
        if (stopRequestedRef.current) {
          settle();
          return;
        }

        // Spontaneous end mid-answer — restart and keep the same buffer.
        // Bounded so a hard-failing recognizer can't spin forever.
        if (restartsRef.current >= 50) {
          setError("recognition kept dropping");
          settle();
          return;
        }
        restartsRef.current += 1;

        try {
          const next = build();
          recognitionRef.current = next;
          next.start();
        } catch {
          settle();
        }
      };

      return rec;
    };

    try {
      const rec = build();
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setError("could not start recognition");
      recognitionRef.current = null;
    }
  }, [settle]);

  /** Resolves with the final transcript once the recognizer has actually ended. */
  const stop = useCallback((): Promise<string> => {
    stopRequestedRef.current = true;

    const rec = recognitionRef.current;
    if (!rec) return Promise.resolve(transcriptRef.current.trim());

    return new Promise<string>((resolve) => {
      resolveRef.current = resolve;
      try {
        rec.stop();
      } catch {
        settle();
      }
    });
  }, [settle]);

  /** Drop everything without waiting — used by the runaway ceiling and unmount. */
  const abort = useCallback(() => {
    stopRequestedRef.current = true;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    setListening(false);
    try {
      rec?.abort();
    } catch {
      // already gone
    }
  }, []);

  useEffect(() => abort, [abort]);

  return { supported, listening, error, start, stop, abort };
}
