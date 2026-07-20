"use client";

import { useState } from "react";
import { DiveTimer, type TimerLabel } from "./DiveTimer";
import type { Question } from "@/lib/types";
import styles from "./Drill.module.css";

export type DrillPhase = "loading" | "ready" | "answering" | "debriefing";

export type DrillProps = {
  question: Question;
  askedWording: string;
  rephrased: boolean;
  phase: DrillPhase;
  index: number;
  total: number;
  isFollowup: boolean;
  progress: number;
  remaining: number;
  overBy: number;
  overtime: boolean;
  speechSupported: boolean;
  micError: string | null;
  onBegin: () => void;
  onDone: () => void;
  onSkip: () => void;
};

function labelFor(phase: DrillPhase, overtime: boolean): TimerLabel {
  if (phase === "answering") return overtime ? "SURFACE" : "ANSWERING";
  if (phase === "debriefing") return "DONE";
  return "READY";
}

export function Drill({
  question,
  askedWording,
  rephrased,
  phase,
  index,
  total,
  isFollowup,
  progress,
  remaining,
  overBy,
  overtime,
  speechSupported,
  micError,
  onBegin,
  onDone,
  onSkip,
}: DrillProps) {
  // A revealed hint must not carry over into the next question — the caller
  // keys this component per question, which resets the state for free.
  const [hintOpen, setHintOpen] = useState(false);

  const answering = phase === "answering";

  return (
    <section className={styles.wrap}>
      <div className={styles.meta}>
        <span className="mono">
          {isFollowup ? "follow-up" : `question ${index + 1} / ${total}`}
        </span>
        {question.nostory && !isFollowup && (
          <span className={`mono ${styles.nostory}`}>no story yet</span>
        )}
      </div>

      <div className={`card ${styles.card}`}>
        <h1 className={styles.question}>{askedWording}</h1>

        {rephrased && !isFollowup && (
          <p className={`mono ${styles.original}`}>
            rephrased · original: {question.q}
          </p>
        )}

        {!isFollowup && (
          <div className={styles.hint}>
            <button
              className={`mono ${styles.hintToggle}`}
              onClick={() => setHintOpen((v) => !v)}
              aria-expanded={hintOpen}
            >
              {hintOpen ? "hide hint" : "show hint"}
            </button>
            {hintOpen && <p className={styles.hintText}>{question.hint}</p>}
          </div>
        )}
      </div>

      <div className={styles.timerRow}>
        <DiveTimer
          progress={progress}
          remaining={remaining}
          overBy={overBy}
          overtime={overtime}
          label={labelFor(phase, overtime)}
        />
        {answering && (
          <span className={styles.rec}>
            <span className={styles.recDot} aria-hidden="true" />
            <span className="mono">recording</span>
          </span>
        )}
      </div>

      {!speechSupported && (
        <p className="notice">
          no speech recognition in this browser — timer and playback work, but there
          will be no transcript and no critique. use chrome for the full drill.
        </p>
      )}

      {micError && <p className="notice">{micError}</p>}

      <div className={styles.controls}>
        {phase === "ready" && (
          <>
            <button className="btn btn-primary" onClick={onBegin}>
              begin answer
            </button>
            {/* Skip lives here and disappears once answering starts — it is the
                sole feeder for the weakest-stories ranking. §2. */}
            {!isFollowup && (
              <button className="btn" onClick={onSkip}>
                skip
              </button>
            )}
          </>
        )}

        {answering && (
          <button className="btn btn-primary" onClick={onDone}>
            done answering
          </button>
        )}

        {phase === "loading" && <span className="mono">rephrasing…</span>}
        {phase === "debriefing" && <span className="mono">reading it back…</span>}
      </div>
    </section>
  );
}
