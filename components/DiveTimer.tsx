"use client";

import styles from "./DiveTimer.module.css";

export type TimerLabel = "READY" | "ANSWERING" | "SURFACE" | "DONE";

export type DiveTimerProps = {
  /** 0..1 of the limit consumed. */
  progress: number;
  remaining: number;
  overBy: number;
  overtime: boolean;
  label: TimerLabel;
};

const SIZE = 190;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** The one signature element (§8). Everything else on the page stays quiet. */
export function DiveTimer({ progress, remaining, overBy, overtime, label }: DiveTimerProps) {
  const stroke = overtime ? "var(--amber)" : "var(--kelp)";

  return (
    <div className={styles.wrap} style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.ring}
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          // Depletes clockwise as the answer runs down.
          strokeDashoffset={CIRCUMFERENCE * Math.min(1, Math.max(0, progress))}
          className={styles.progress}
        />
      </svg>

      <div className={styles.face}>
        <div
          className={`mono ${styles.label} ${
            label === "SURFACE" ? styles.flashing : ""
          }`}
          style={overtime ? { color: "var(--amber)" } : undefined}
        >
          {label}
        </div>
        <div
          className={styles.count}
          style={overtime ? { color: "var(--amber)" } : undefined}
          // The live count is the accessible readout; the ring is decorative.
          role="timer"
          aria-live="off"
        >
          {overtime ? `+${clock(overBy)}` : clock(remaining)}
        </div>
      </div>
    </div>
  );
}
