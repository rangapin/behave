"use client";

import type { Grade, StarFlags } from "@/lib/types";
import styles from "./StarChips.module.css";

const COMPONENTS: ReadonlyArray<{ key: keyof StarFlags; letter: string }> = [
  { key: "situation", letter: "S" },
  { key: "task", letter: "T" },
  { key: "action", letter: "A" },
  { key: "result", letter: "R" },
];

const GRADE_COLOR: Record<Grade, string> = {
  // --alert is reserved for the rec dot and never appears here. §8.
  weak: "var(--amber)",
  adequate: "var(--mist)",
  strong: "var(--kelp)",
};

export function StarChips({ star, grade }: { star: StarFlags; grade?: Grade }) {
  return (
    <div className={styles.row}>
      <div className={styles.chips}>
        {COMPONENTS.map(({ key, letter }) => {
          const present = star[key];
          return (
            <span
              key={key}
              className={`${styles.chip} ${present ? styles.present : styles.missing}`}
              // A gap should read as a flag, not as absence.
              title={`${key}: ${present ? "present" : "missing"}`}
            >
              {letter}
              <span className={styles.srOnly}>
                {` ${key} ${present ? "present" : "missing"}`}
              </span>
            </span>
          );
        })}
      </div>

      {grade && (
        <span className={styles.grade} style={{ color: GRADE_COLOR[grade] }}>
          {grade}
        </span>
      )}
    </div>
  );
}
