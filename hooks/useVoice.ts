"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSpeech } from "@/lib/api-client";
import { rankEnglishVoices } from "@/lib/voices";
import type { Settings } from "@/lib/types";

/**
 * The interviewer voice — ElevenLabs, browser speechSynthesis, or off (§4).
 *
 * `cancel()` is load-bearing, not cosmetic: beginning an answer must hard-stop
 * any in-flight speech before getUserMedia, or the TTS bleeds through the mic
 * and the interviewer's own phrasing lands in your transcript and gets graded
 * as your answer. specs.md §2.
 */
export function useVoice(settings: Settings) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  /**
   * §4 says an ElevenLabs failure falls back to the browser voice for the rest
   * of the session. Deliberate deviation: we latch the *voice id* that failed
   * rather than a bare boolean, so correcting the id in settings retries. Fixing
   * a typo and still hearing the browser voice reads as the fix not working.
   */
  const failedVoiceIdRef = useRef<string | null>(null);
  /** Missing or rejected key — no edit in the UI can fix it, so latch hard. */
  const keyFailedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const load = () => setVoices(rankEnglishVoices(window.speechSynthesis.getVoices()));
    load();
    // Chrome populates the list asynchronously.
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speakBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const chosen = voices.find((v) => v.voiceURI === settings.browserVoiceURI);
        if (chosen) utterance.voice = chosen;
        utterance.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }),
    [voices, settings.browserVoiceURI],
  );

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!settings.readAloud || settings.voiceMode === "off" || !text.trim()) return;

      cancel();
      setError(null);

      const voiceAlreadyFailed = failedVoiceIdRef.current === settings.elevenVoiceId;
      const elevenUsable = !keyFailedRef.current && !voiceAlreadyFailed;

      if (settings.voiceMode === "elevenlabs" && elevenUsable) {
        const result = await fetchSpeech(text, settings.elevenVoiceId);
        if ("url" in result) {
          urlRef.current = result.url;
          const audio = new Audio(result.url);
          audioRef.current = audio;
          setSpeaking(true);
          await new Promise<void>((resolve) => {
            audio.onended = () => {
              setSpeaking(false);
              resolve();
            };
            audio.onerror = () => {
              setSpeaking(false);
              resolve();
            };
            audio.play().catch(() => {
              setSpeaking(false);
              resolve();
            });
          });
          return;
        }
        // Show the reason inline, then use the browser voice rather than
        // retrying something that won't work. A 401/403 (rejected key) or 503
        // (key not set) is unfixable from the UI; anything else is treated as
        // this voice id being wrong, and retries once the id changes.
        setError(result.error);
        if ([401, 403, 503].includes(result.status)) {
          keyFailedRef.current = true;
        } else {
          failedVoiceIdRef.current = settings.elevenVoiceId;
        }
      }

      await speakBrowser(text);
    },
    [settings, cancel, speakBrowser],
  );

  useEffect(() => cancel, [cancel]);

  return { voices, speaking, error, speak, cancel };
}
