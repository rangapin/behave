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
  // Set once ElevenLabs has failed — §4 says fall back for the rest of the session.
  const elevenFailedRef = useRef(false);

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

      if (settings.voiceMode === "elevenlabs" && !elevenFailedRef.current) {
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
        // Show the reason inline, then use the browser voice for the rest of
        // the session rather than retrying a key or voiceId that won't work.
        setError(result.error);
        elevenFailedRef.current = true;
      }

      await speakBrowser(text);
    },
    [settings, cancel, speakBrowser],
  );

  useEffect(() => cancel, [cancel]);

  return { voices, speaking, error, speak, cancel };
}
