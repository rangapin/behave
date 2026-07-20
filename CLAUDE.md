# CLAUDE.md — Surface (Interview Drill)

## What this is

Surface is a personal behavioral-interview practice app. It drills a fixed story bank
of ~22 questions: shuffles them, rephrases them with AI so answers can't be recited,
records the user's spoken answer against a hard timer, transcribes it, and returns a
skeptical hiring-manager critique plus one adaptive follow-up probe.

**Answers are graded against STAR.** Every story question is scored on Situation /
Task / Action / Result, and a missing component docks the grade — a fluent answer
with no measurable Result is "weak", not "strong". The model is told to default a
component to absent when uncertain; a drill that flatters you is worthless. Three
bank entries are opinion/process questions, not stories, and are exempt via
`nostar: true` — see `specs.md` §3.

Single user (Richard), deployed on Vercel. Not a SaaS. No auth, no multi-tenancy,
no billing. Resist any temptation to add them.

Read `specs.md` in full before writing any code. It contains the feature spec, the
question bank data, the exact AI prompts (already tuned — do not rewrite them without
being asked), design tokens, and the phased build plan. Build phase by phase; do not
skip ahead.

## Stack

- Next.js 14+ (App Router), TypeScript, deployed on Vercel
- No CSS framework — plain CSS modules or a single global stylesheet using the design
  tokens in specs.md. Do NOT introduce Tailwind.
- No component library. No state management library — React state is enough.
- Anthropic API (claude-sonnet-4-6) via a server route. ElevenLabs TTS via a server route.
- Browser APIs client-side: MediaRecorder, Web Speech API (SpeechRecognition +
  speechSynthesis fallback), localStorage.

## Critical constraints

1. **API keys never reach the client.** The prototype called `api.anthropic.com`
   directly with no key — that ONLY works inside Claude.ai artifacts, and is the one
   pattern most likely to get copied by reflex. In this repo, all Anthropic and
   ElevenLabs calls go through
   `/app/api/*` route handlers reading `process.env.ANTHROPIC_API_KEY` and
   `process.env.ELEVENLABS_API_KEY`. Never expose either with `NEXT_PUBLIC_`.
2. **SpeechRecognition is Chromium-only.** The app must degrade gracefully: no
   transcript → no AI critique, but timer + recording playback still work, with a
   visible notice. Never hard-crash on missing browser APIs.
3. **MediaRecorder/getUserMedia require user gesture + https or localhost.** Keep all
   mic access behind explicit button clicks.
4. **localStorage is allowed and expected here** (unlike the artifact prototype) —
   use it for the question bank, settings, and session history. Namespace keys
   `surface:*`.

## Current state

Nothing is scaffolded yet — the repo holds only this file and `specs.md`, and is not
a git repo. Phase 1 starts with `npx create-next-app` and `git init`; the commands
below don't exist until then.

## Commands

```bash
npm run dev        # local dev
npm run build      # must pass before any commit is considered done
npm run lint       # eslint, must be clean
```

```bash
npm run test       # vitest, pure logic only
```

Phase 1 carries a deliberately narrow Vitest suite: the critique-response parser and
the session-shuffle logic (pure functions in `lib/`). Nothing else — not the browser
API wrappers, not the route handlers. The parser's defensive branches (fenced JSON,
malformed JSON, missing `star` with valid `feedback`, the `nostar` shape) cannot be
exercised by hand, which is the whole reason they're tested.

## Conventions

- Small files. One component per file. Pure logic (shuffle, scoring, prompt builders,
  JSON parsing of model output) lives in `lib/` and stays framework-free.
- Model output parsing must be defensive: strip markdown fences, try/catch JSON.parse,
  always have a fallback UI path. The model WILL occasionally return malformed JSON.
- Copy tone: terse, lowercase-calm, no exclamation marks. The app talks like a dive
  computer, not a cheerleader.
- Commits: conventional-ish, one logical change each (`feat: session timer ring`,
  `fix: final transcript race on stop`).
- When a phase in specs.md is complete, stop and summarize what was built and what to
  verify manually before starting the next phase.

## Reference

There was a working single-file prototype (`prototype/interview-drill.html`). **It is
lost** — it lived as a Claude.ai artifact and was never committed. `specs.md` is
therefore the sole source of truth: build from it directly rather than hunting for
the prototype. It carries the states, timer behavior, verbatim prompts, seed bank,
and design tokens; what it can't carry is UX feel, so where the spec is silent,
choose the quiet obvious thing and flag the choice.

Three known prototype bugs are recorded here because the port must not reintroduce
them — treat as requirements, not history:
- Final SpeechRecognition results were collected via a ~400ms `setTimeout` race after
  stop. Use a promise on `recognition.onend` instead — but resolving on the *first*
  `onend` reintroduces the same bug by another route, because Chrome fires `onend`
  spontaneously on long silences even with `continuous: true`. Gate it on an explicit
  `stopRequested` flag; see `specs.md` §2.
- Voice settings reset on reload — persist to localStorage.
- No session history — that's phase 3.

## Skills

Process skills come from `mattpocock-skills@mattpocock` (installed globally).
Superpowers was uninstalled on 2026-07-20 and is deliberately gone — don't reach for
`superpowers:*`; those skills no longer exist on this machine.

- `/grill-me` before any substantial build decision — it interviews you until the
  open branches resolve. This replaces what `superpowers:brainstorming` did.
- `diagnosing-bugs` for debugging, `tdd` for test loops, `code-review` before a phase
  is called done, `to-spec` / `to-tickets` for breaking work down.