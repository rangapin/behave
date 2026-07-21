"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { getBank, getServerBank, subscribeBank } from "@/lib/bank-store";
import {
  getHistory,
  getServerHistory,
  subscribeHistory,
} from "@/lib/history-store";
import { summarize, weakestStories, type WeakStory } from "@/lib/summary";
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

  // Weakest-stories and the STAR-miss line are ranked across all history, not
  // just this session. §7.
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistory,
    getServerHistory,
  );
  const bank = useSyncExternalStore(subscribeBank, getBank, getServerBank);

  const weakest = weakestStories(history);
  const worstStar = summarize(history).worstStar;
  const wording = (id: string) => bank.find((q) => q.id === id)?.q ?? id;

  return (
    <section className={styles.wrap}>
      <h1 className={styles.heading}>session over</h1>

      <div className={styles.grid}>
        <Stat label="answered" value={String(stats.answered)} />
        <Stat label="skipped" value={String(stats.skipped)} />
        <Stat label="avg time" value={`${stats.avgTimeSec}s`} />
        <Stat label="over limit" value={String(stats.overtimes)} />
      </div>

      {stats.abandoned > 0 && (
        <p className="notice">
          {stats.abandoned} answer{stats.abandoned === 1 ? "" : "s"} hit the runaway
          ceiling and {stats.abandoned === 1 ? "was" : "were"} dropped.
        </p>
      )}

      {worstStar && (
        <p className={`mono ${styles.worst}`}>
          most dropped: {worstStar.component} ({worstStar.missed} of {worstStar.of}{" "}
          answers)
        </p>
      )}

      {weakest.length > 0 && (
        <div className={styles.weakest}>
          <span className="mono">weakest stories — rewrite these</span>
          <ol className={styles.weakList}>
            {weakest.map((w) => (
              <li key={w.questionId} className={styles.weakItem}>
                <span className={styles.weakQ}>{wording(w.questionId)}</span>
                <span className={`mono ${styles.weakMeta}`}>{weakLabel(w)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className={styles.actions}>
        <button className="btn btn-primary" onClick={onRestart}>
          run another
        </button>
        <Link className={`btn ${styles.link}`} href="/history">
          full history
        </Link>
      </div>
    </section>
  );
}

function weakLabel({ skips, overtimes }: WeakStory): string {
  const parts: string[] = [];
  if (skips) parts.push(`${skips} skip${skips === 1 ? "" : "s"}`);
  if (overtimes) parts.push(`${overtimes} over`);
  return parts.join(" · ");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`card ${styles.stat}`}>
      <span className="mono">{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
