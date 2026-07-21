"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Debrief } from "@/components/Debrief";
import { Drill, type DrillPhase } from "@/components/Drill";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Summary } from "@/components/Summary";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTimer } from "@/hooks/useTimer";
import { useVoice } from "@/hooks/useVoice";
import { fetchCritique, fetchVariant } from "@/lib/api-client";
import Link from "next/link";
import { recordAttempt } from "@/lib/history-store";
import { pickSession } from "@/lib/shuffle";
import { loadBank } from "@/lib/storage";
import {
  getServerSettings,
  getSettings,
  subscribeSettings,
  updateSettings,
} from "@/lib/settings-store";
import { RUNAWAY_MULTIPLIER, type Attempt, type Critique, type Question, type Settings } from "@/lib/types";
import styles from "./page.module.css";

type Stage =
  | "idle"
  | "loading_variant"
  | "ready"
  | "answering"
  | "debriefing"
  | "feedback"
  | "summary";

/** Below this we treat the transcript as absent and fall back to the self-check. §2 */
const MIN_TRANSCRIPT_CHARS = 10;

export default function Page() {
  const settings: Settings = useSyncExternalStore(
    subscribeSettings,
    getSettings,
    getServerSettings,
  );

  const [stage, setStage] = useState<Stage>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [asked, setAsked] = useState({ wording: "", rephrased: false });
  const [isFollowup, setIsFollowup] = useState(false);
  const [rootQuestion, setRootQuestion] = useState("");

  const [critique, setCritique] = useState<Critique | null>(null);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timeUsed, setTimeUsed] = useState(0);
  const [abandoned, setAbandoned] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const recorder = useMediaRecorder();
  const speech = useSpeechRecognition();
  const voice = useVoice(settings);

  // useTimer is constructed before `finish` exists, so route the runaway
  // callback through a ref rather than reordering the declarations.
  const finishRef = useRef<((abandonedRun: boolean) => void) | null>(null);
  const timer = useTimer({
    limitSec: settings.limitSec,
    onRunaway: () => finishRef.current?.(true),
  });

  const question = questions[index];

  const resetAnswerState = useCallback(() => {
    setCritique(null);
    setTranscript("");
    setAudioUrl(null);
    setAbandoned(false);
    setTimeUsed(0);
    recorder.release();
    timer.reset();
  }, [recorder, timer]);

  const presentQuestion = useCallback(
    async (q: Question) => {
      resetAnswerState();
      setIsFollowup(false);

      let wording = q.q;
      let rephrased = false;

      if (settings.rephrase) {
        setStage("loading_variant");
        const variant = await fetchVariant(q.q);
        wording = variant.question;
        rephrased = variant.rephrased;
      }

      setAsked({ wording, rephrased });
      setRootQuestion(wording);
      setStage("ready");
      void voice.speak(wording);
    },
    [resetAnswerState, settings.rephrase, voice],
  );

  const startSession = useCallback(() => {
    const session = pickSession(loadBank(), settings.questionsPerSession);
    setQuestions(session);
    setAttempts([]);
    setIndex(0);
    if (session.length > 0) void presentQuestion(session[0]);
  }, [settings.questionsPerSession, presentQuestion]);

  const begin = useCallback(async () => {
    // Hard-cancel the interviewer voice before touching the mic, or the TTS
    // bleeds in and gets transcribed as part of the answer. §2
    voice.cancel();

    const started = await recorder.start();
    if (!started) return; // recorder.error renders as a notice

    if (speech.supported) speech.start();
    timer.start();
    setStage("answering");
  }, [voice, recorder, speech, timer]);

  const logAttempt = useCallback((attempt: Attempt) => {
    // Session state feeds this run's summary; history persists across sessions
    // for the weakest-stories ranking and the history page. §7.
    setAttempts((prev) => [...prev, attempt]);
    recordAttempt(attempt);
  }, []);

  const finish = useCallback(
    async (abandonedRun: boolean) => {
      if (!question) return;

      timer.stop();
      setStage("debriefing");

      const used = abandonedRun
        ? settings.limitSec * RUNAWAY_MULTIPLIER
        : timer.elapsed;
      setTimeUsed(used);
      setAbandoned(abandonedRun);

      // Order matters: settle the transcript promise before the critique call.
      const finalTranscript = await speech.stop();
      const recording = await recorder.stop();

      setTranscript(finalTranscript);
      setAudioUrl(recording?.url ?? null);

      const overtime = used > settings.limitSec;
      const usable =
        !abandonedRun &&
        speech.supported &&
        finalTranscript.length >= MIN_TRANSCRIPT_CHARS;

      let result: Critique | null = null;
      if (usable) {
        result = await fetchCritique({
          questionAsked: asked.wording,
          transcript: finalTranscript,
          timeUsedSec: used,
          limitSec: settings.limitSec,
          nostar: question.nostar,
          originalQuestion: isFollowup ? rootQuestion : undefined,
          isFollowup,
        });
        setCritique(result);
      }

      logAttempt({
        questionId: question.id,
        askedWording: asked.wording,
        timestamp: Date.now(),
        timeUsedSec: used,
        overtime,
        transcript: finalTranscript,
        feedback: result?.feedback ?? [],
        followup: result?.followup,
        star: result?.star,
        grade: result?.grade,
        abandoned: abandonedRun || undefined,
      });

      setStage("feedback");
    },
    [
      question,
      timer,
      settings.limitSec,
      speech,
      recorder,
      asked.wording,
      isFollowup,
      rootQuestion,
      logAttempt,
    ],
  );

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  const advance = useCallback(() => {
    voice.cancel();
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) {
      resetAnswerState();
      setStage("summary");
      return;
    }
    setIndex(nextIndex);
    void presentQuestion(questions[nextIndex]);
  }, [voice, index, questions, resetAnswerState, presentQuestion]);

  const skip = useCallback(() => {
    if (!question) return;
    voice.cancel();
    // No transcript, no AI call — the sole feeder for §7's skip counts.
    logAttempt({
      questionId: question.id,
      askedWording: asked.wording,
      timestamp: Date.now(),
      timeUsedSec: 0,
      overtime: false,
      transcript: "",
      feedback: [],
      skipped: true,
    });
    advance();
  }, [question, voice, asked.wording, logAttempt, advance]);

  const answerFollowup = useCallback(() => {
    const followup = critique?.followup;
    if (!followup) return;
    voice.cancel();
    resetAnswerState();
    setIsFollowup(true);
    setAsked({ wording: followup, rephrased: false });
    setStage("ready");
    void voice.speak(followup);
  }, [critique, voice, resetAnswerState]);

  if (stage === "idle") {
    return (
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>surface</h1>
          <p className={styles.tagline}>
            same stories, different wording, honest critique.
          </p>
        </header>

        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          voices={voice.voices}
          onTestVoice={() =>
            void voice.speak("so, tell me about a time you had to make a call.")
          }
          voiceError={voice.error}
        />

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={startSession}>
            start session
          </button>
          <Link className="btn" href="/bank">
            edit bank
          </Link>
          <Link className="btn" href="/history">
            history
          </Link>
        </div>
      </main>
    );
  }

  if (stage === "summary") {
    return (
      <main className={styles.main}>
        <Summary attempts={attempts} onRestart={() => setStage("idle")} />
      </main>
    );
  }

  if (!question) return <main className={styles.main} />;

  const drillPhase: DrillPhase =
    stage === "loading_variant"
      ? "loading"
      : stage === "answering"
        ? "answering"
        : stage === "debriefing"
          ? "debriefing"
          : "ready";

  return (
    <main className={styles.main}>
      {stage !== "feedback" ? (
        <Drill
          key={`${question.id}:${asked.wording}`}
          question={question}
          askedWording={asked.wording}
          rephrased={asked.rephrased}
          phase={drillPhase}
          index={index}
          total={questions.length}
          isFollowup={isFollowup}
          progress={timer.progress}
          remaining={timer.remaining}
          overBy={timer.overBy}
          overtime={timer.overtime}
          speechSupported={speech.supported}
          micError={recorder.error ?? speech.error}
          onBegin={() => void begin()}
          onDone={() => void finish(false)}
          onSkip={skip}
        />
      ) : (
        <Debrief
          critique={critique}
          transcript={transcript}
          audioUrl={audioUrl}
          timeUsedSec={timeUsed}
          limitSec={settings.limitSec}
          overtime={timeUsed > settings.limitSec}
          abandoned={abandoned}
          isFollowup={isFollowup}
          isLastQuestion={index + 1 >= questions.length}
          onAnswerFollowup={answerFollowup}
          onNext={advance}
        />
      )}
    </main>
  );
}
