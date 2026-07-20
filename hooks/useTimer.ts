"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RUNAWAY_MULTIPLIER } from "@/lib/types";

const TICK_MS = 200;

export type TimerOptions = {
  limitSec: number;
  /**
   * Fired once when elapsed reaches limit x RUNAWAY_MULTIPLIER. A safety net for
   * a walked-away tab, not a second timer — nothing counts down to it and you
   * will never reach it while genuinely talking. specs.md §2.
   */
  onRunaway?: () => void;
};

export function useTimer({ limitSec, onRunaway }: TimerOptions) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef(false);

  // Kept in a ref so a changing callback identity doesn't restart the interval.
  const onRunawayRef = useRef(onRunaway);
  useEffect(() => {
    onRunawayRef.current = onRunaway;
  }, [onRunaway]);

  const clear = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clear();
    setRunning(false);
  }, [clear]);

  const reset = useCallback(() => {
    clear();
    startedAtRef.current = null;
    firedRef.current = false;
    setElapsed(0);
    setRunning(false);
  }, [clear]);

  const start = useCallback(() => {
    clear();
    startedAtRef.current = Date.now();
    firedRef.current = false;
    setElapsed(0);
    setRunning(true);

    const ceiling = limitSec * RUNAWAY_MULTIPLIER;

    intervalRef.current = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;

      // Derived from wall clock, not accumulated ticks — a throttled background
      // tab would otherwise drift and under-report the time used.
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);

      if (secs >= ceiling && !firedRef.current) {
        firedRef.current = true;
        clear();
        setRunning(false);
        onRunawayRef.current?.();
      }
    }, TICK_MS);
  }, [clear, limitSec]);

  useEffect(() => clear, [clear]);

  const overtime = elapsed > limitSec;

  return {
    elapsed,
    running,
    overtime,
    /** Seconds remaining, floored at zero. Past the limit, read `overBy`. */
    remaining: Math.max(0, limitSec - elapsed),
    overBy: Math.max(0, elapsed - limitSec),
    /** 0..1 of the limit consumed, clamped — drives the ring. */
    progress: Math.min(1, elapsed / limitSec),
    start,
    stop,
    reset,
  };
}
