"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Recording = { blob: Blob; url: string };

function pickMimeType(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t));
}

/**
 * Audio capture for debrief playback (specs.md §2).
 *
 * The object URL lives only as long as the debrief that shows it — audio is
 * never persisted (localStorage's ~5MB quota would be gone in three answers),
 * so `release()` must be called when advancing past the debrief.
 */
export function useMediaRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** Revoke the previous object URL. Call when leaving a debrief. */
  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    release();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("microphone unavailable in this browser");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      return true;
    } catch {
      // Denied permission, no device, or insecure context.
      setError("microphone permission denied");
      stopTracks();
      return false;
    }
  }, [release, stopTracks]);

  /** Resolves once the recorder has flushed its final chunk. */
  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current;
    recorderRef.current = null;

    if (!recorder || recorder.state === "inactive") {
      stopTracks();
      setRecording(false);
      return Promise.resolve(null);
    }

    return new Promise<Recording | null>((resolve) => {
      recorder.onstop = () => {
        stopTracks();
        setRecording(false);

        if (chunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        resolve({ blob, url });
      };
      try {
        recorder.stop();
      } catch {
        stopTracks();
        setRecording(false);
        resolve(null);
      }
    });
  }, [stopTracks]);

  useEffect(() => {
    return () => {
      stopTracks();
      release();
    };
  }, [stopTracks, release]);

  return { recording, error, start, stop, release };
}
