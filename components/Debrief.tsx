"use client";

import { StarChips } from "./StarChips";
import type { Critique } from "@/lib/types";
import styles from "./Debrief.module.css";

/** Shown when there is no usable transcript — §2's fallback for non-Chromium. */
const SELF_CHECK = [
  "situation — was it a concrete setting? real people, a real system, a time and place?",
  "task — did you say what you personally owned, distinct from the team?",
  "action — did you say what you actually did, not what 'we decided'?",
  "result — was there an observable or measurable outcome?",
];

export type DebriefProps = {
  critique: Critique | null;
  transcript: string;
  audioUrl: string | null;
  timeUsedSec: number;
  limitSec: number;
  overtime: boolean;
  abandoned: boolean;
  isFollowup: boolean;
  isLastQuestion: boolean;
  onAnswerFollowup: () => void;
  onNext: () => void;
};

export function Debrief({
  critique,
  transcript,
  audioUrl,
  timeUsedSec,
  limitSec,
  overtime,
  abandoned,
  isFollowup,
  isLastQuestion,
  onAnswerFollowup,
  onNext,
}: DebriefProps) {
  // Max depth 1 — a follow-up's critique never offers another. §2.
  const followup = !isFollowup ? critique?.followup : undefined;

  return (
    <section className={styles.wrap}>
      <div className={styles.timeRow}>
        <span className="mono">
          {timeUsedSec}s used of {limitSec}s
        </span>
        {overtime && <span className={`mono ${styles.over}`}>over</span>}
      </div>

      {abandoned && (
        <p className="notice">
          recording ran past {limitSec * 3}s and was stopped. no critique for this one
          — the answer was almost certainly abandoned.
        </p>
      )}

      {critique?.star && (
        <div className={`card ${styles.starCard}`}>
          <StarChips star={critique.star} grade={critique.grade} />
        </div>
      )}

      {critique && (
        <div className={`card ${styles.critique}`}>
          {critique.degraded && (
            <p className={`mono ${styles.degraded}`}>critique degraded</p>
          )}
          <ul className={styles.points}>
            {critique.feedback.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {!critique && !abandoned && (
        <div className={`card ${styles.critique}`}>
          <p className={`mono ${styles.selfCheckLabel}`}>self-check</p>
          <ul className={styles.points}>
            {SELF_CHECK.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>
              on time? {timeUsedSec}s of {limitSec}s.
            </li>
          </ul>
        </div>
      )}

      {followup && (
        <div className={`card ${styles.followup}`}>
          <p className={`mono ${styles.followupLabel}`}>follow-up</p>
          <p className={styles.followupText}>{followup}</p>
        </div>
      )}

      {audioUrl && (
        <audio className={styles.audio} src={audioUrl} controls preload="metadata" />
      )}

      {transcript && (
        <details className={styles.transcript}>
          <summary className="mono">transcript</summary>
          <p>{transcript}</p>
        </details>
      )}

      <div className={styles.controls}>
        {followup && (
          <button className="btn btn-primary" onClick={onAnswerFollowup}>
            answer the follow-up
          </button>
        )}
        <button className={followup ? "btn" : "btn btn-primary"} onClick={onNext}>
          {isLastQuestion ? "finish session" : "next question"}
        </button>
      </div>
    </section>
  );
}
