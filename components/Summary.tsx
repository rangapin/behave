"use client";

import { summarize } from "@/lib/summary";
import type { Attempt } from "@/lib/types";
import styles from "./Summary.module.css";

export function Summary({
  attempts,
  onRestart,
}: {
  attempts: readonly Attempt[];
  onRestart: () => void;
}) {
  const stats = summarize(attempts);

  return (
    <section className={styles.wrap}>
      <h1 className={styles.heading}>session over</h1>

      <div className={styles.grid}>
        <Stat label="answered" value={String(stats.answered)} />
        <Stat label="skipped" value={String(stats.skipped)} />
        <Stat label="avg time" value={`${stats.avgTimeSec}s`} />
        <Stat label="over limit" value={String(stats.overtimes)} />
      </div>

      {stats.worstStar && (
        <p className={`mono ${styles.worst}`}>
          most dropped: {stats.worstStar.component} ({stats.worstStar.missed} of{" "}
          {stats.worstStar.of} answers)
        </p>
      )}

      {stats.abandoned > 0 && (
        <p className="notice">
          {stats.abandoned} answer{stats.abandoned === 1 ? "" : "s"} hit the runaway
          ceiling and {stats.abandoned === 1 ? "was" : "were"} dropped.
        </p>
      )}

      <p className={styles.note}>
        history across sessions lands in phase 3 — these numbers cover this session
        only.
      </p>

      <button className="btn btn-primary" onClick={onRestart}>
        run another
      </button>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`card ${styles.stat}`}>
      <span className="mono">{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
