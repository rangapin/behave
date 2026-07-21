"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { StarChips } from "@/components/StarChips";
import { getBank, getServerBank, subscribeBank } from "@/lib/bank-store";
import {
  getHistory,
  getServerHistory,
  resetHistory,
  subscribeHistory,
} from "@/lib/history-store";
import type { Attempt, Question } from "@/lib/types";
import styles from "./HistoryView.module.css";

type Group = { id: string; wording: string; attempts: Attempt[] };

/** Group by question, attempts oldest→newest so progress reads down the column. */
function groupByQuestion(history: Attempt[], bank: Question[]): Group[] {
  const byId = new Map<string, Attempt[]>();
  for (const a of history) {
    const list = byId.get(a.questionId) ?? [];
    list.push(a);
    byId.set(a.questionId, list);
  }
  const groups: Group[] = [];
  for (const [id, attempts] of byId) {
    attempts.sort((a, b) => a.timestamp - b.timestamp);
    groups.push({
      id,
      wording: bank.find((q) => q.id === id)?.q ?? id,
      attempts,
    });
  }
  // Most recently practiced story first.
  return groups.sort(
    (a, b) => last(b.attempts).timestamp - last(a.attempts).timestamp,
  );
}

const last = <T,>(xs: T[]): T => xs[xs.length - 1];

export function HistoryView() {
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistory,
    getServerHistory,
  );
  const bank = useSyncExternalStore(subscribeBank, getBank, getServerBank);

  function clear() {
    if (!window.confirm("clear all attempt history? this can't be undone.")) return;
    resetHistory();
  }

  const groups = groupByQuestion(history, bank);

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <Link className={styles.back} href="/">
            ← surface
          </Link>
          <h1 className={styles.title}>history</h1>
        </div>
        {history.length > 0 && (
          <button className={styles.clear} onClick={clear}>
            clear
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <p className={styles.empty}>no attempts yet. run a session first.</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((g) => (
            <div key={g.id} className={styles.group}>
              <div className={styles.groupHead}>
                <span className={styles.question}>{g.wording}</span>
                <span className={`mono ${styles.count}`}>
                  {g.attempts.length}×
                </span>
              </div>
              <ul className={styles.rows}>
                {g.attempts.map((a, i) => (
                  <Row key={`${a.timestamp}-${i}`} attempt={a} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ attempt: a }: { attempt: Attempt }) {
  return (
    <li className={styles.row}>
      <span className={`mono ${styles.when}`}>{formatDate(a.timestamp)}</span>
      <span className={styles.marks}>
        {a.star ? (
          <StarChips star={a.star} grade={a.grade} />
        ) : (
          <span className={`mono ${styles.status}`}>{statusLabel(a)}</span>
        )}
      </span>
      <span className={`mono ${styles.time} ${a.overtime ? styles.over : ""}`}>
        {a.skipped ? "—" : `${a.timeUsedSec}s`}
      </span>
    </li>
  );
}

function statusLabel(a: Attempt): string {
  if (a.skipped) return "skipped";
  if (a.abandoned) return "abandoned";
  if (a.grade) return a.grade; // nostar question — graded without STAR flags
  return "no transcript";
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
