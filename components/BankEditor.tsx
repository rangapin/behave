"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getBank,
  getServerBank,
  setBank,
  subscribeBank,
} from "@/lib/bank-store";
import type { Question } from "@/lib/types";
import styles from "./BankEditor.module.css";

/** New rows need a stable, collision-free id — the bank is keyed by it. */
function newId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Math.floor(Math.random() * 1e9));
  return `custom-${rand}`;
}

const BLANK: Omit<Question, "id"> = { q: "", hint: "" };

export function BankEditor() {
  const bank = useSyncExternalStore(subscribeBank, getBank, getServerBank);

  // Every mutation writes straight through the store — single user, no save
  // button. §7 lists "edit in place" as the whole interaction.
  function patch(id: string, fields: Partial<Question>) {
    setBank(bank.map((q) => (q.id === id ? { ...q, ...fields } : q)));
  }

  function remove(id: string) {
    setBank(bank.filter((q) => q.id !== id));
  }

  function add() {
    setBank([{ id: newId(), ...BLANK }, ...bank]);
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <Link className={styles.back} href="/">
            ← surface
          </Link>
          <h1 className={styles.title}>question bank</h1>
        </div>
        <button className="btn" onClick={add}>
          add question
        </button>
      </header>

      <p className={styles.note}>
        edits save as you type. deleting every question re-seeds the bank on reload.
      </p>

      {bank.length === 0 ? (
        <p className="notice">bank is empty — reload to restore the seed bank.</p>
      ) : (
        <ol className={styles.list}>
          {bank.map((q) => (
            <li key={q.id} className={`card ${styles.item}`}>
              <div className={styles.itemHead}>
                <span className={`mono ${styles.id}`}>{q.id}</span>
                <button
                  className={styles.delete}
                  onClick={() => remove(q.id)}
                  aria-label={`delete ${q.id}`}
                >
                  delete
                </button>
              </div>

              <label className={styles.field}>
                <span className="mono">question</span>
                <textarea
                  className={styles.textarea}
                  value={q.q}
                  rows={2}
                  onChange={(e) => patch(q.id, { q: e.target.value })}
                />
              </label>

              <label className={styles.field}>
                <span className="mono">hint</span>
                <textarea
                  className={styles.textarea}
                  value={q.hint}
                  rows={2}
                  onChange={(e) => patch(q.id, { hint: e.target.value })}
                />
              </label>

              <div className={styles.flags}>
                <FlagToggle
                  label="no story"
                  title="no prepared story yet — flagged amber in the drill"
                  on={!!q.nostory}
                  onToggle={() => patch(q.id, { nostory: !q.nostory })}
                />
                <FlagToggle
                  label="no star"
                  title="opinion/process question — exempt from STAR grading (§3)"
                  on={!!q.nostar}
                  onToggle={() => patch(q.id, { nostar: !q.nostar })}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FlagToggle({
  label,
  title,
  on,
  onToggle,
}: {
  label: string;
  title: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`${styles.flag} ${on ? styles.flagOn : ""}`}
      aria-pressed={on}
      title={title}
      onClick={onToggle}
    >
      {label}: {on ? "on" : "off"}
    </button>
  );
}
