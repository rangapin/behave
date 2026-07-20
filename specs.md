# specs.md — Surface (Interview Drill)

## 1. Problem & principle

Rehearsing fixed answers to fixed questions produces recitation, which collapses the
moment an interviewer deviates. Surface trains **story retrieval**: same underlying
story bank, different phrasing every session, forced time limit, adaptive follow-up
probes, and honest critique. The user should never hear a question worded the same
way twice.

Single user. Desktop-first, usable on mobile. Chromium browsers get the full
experience; others degrade gracefully (see constraints in CLAUDE.md).

## 2. Core loop

```
idle ─▶ question (rephrased, spoken aloud)
     ─▶ [Begin answer] mic on, timer counts down, transcript accumulates
        │ [Skip] no attempt, no AI call, straight to next
     ─▶ [Done answering] recording stops
     ─▶ debrief: STAR chips + grade, 3 critique points, 1 follow-up probe,
        playback + transcript
     ─▶ [Answer the follow-up] (one level deep, then next) │ [Next question]
     ─▶ session summary
```

### States
`idle → loading_variant → ready → answering → debriefing → feedback → (followup: ready → answering → debriefing → feedback) → next | summary`

### Skip
`ready` state only — a **Skip** control sits on the question card, available before
you start answering and gone once you do. It logs an attempt with `skipped: true`,
no transcript and no `timeUsedSec`, makes no AI call, and advances. This is the sole
feeder for §7's skip counts and the "weakest stories" ranking, so it is not optional
UI. Four bank entries are `nostory: true` and stay in the shuffle — skipping them is
the expected, honest outcome, not a failure state. Once answering has begun there is
no bail-out short of the ceiling below.

### Timer ("dive timer" — the signature element)
- Circular SVG ring, 190px, depletes clockwise over the limit (default 120s;
  options 90/120/150).
- On overtime: ring turns amber, label flashes `SURFACE`, count shows `+m:ss`.
  Recording does NOT auto-stop — going over is data, and the critique is told the
  time used.
- **Runaway ceiling:** a single hard stop at 3× the limit (6 min at the 120s default).
  This is a safety net for a walked-away tab, not a second timer — you will never
  reach it while genuinely talking, and nothing in the UI counts down to it. On hit:
  force-stop recording and recognition, mark the attempt `abandoned: true`, skip the
  critique call entirely, and say so plainly in the debrief. Without it, MediaRecorder
  and the recognition restart loop below run unbounded.
- Labels cycle: READY → ANSWERING → SURFACE (overtime) → DONE.

### Recording & transcription
- MediaRecorder captures audio (webm) for playback in the debrief.
- SpeechRecognition (`continuous: true, interimResults: false, lang: en-US`) runs in
  parallel; concatenate final results. Resolve a promise on `recognition.onend`
  before sending the critique request (no arbitrary timeouts).
- **`onend` is not a reliable end-of-answer signal.** Chrome fires it spontaneously
  on long silences even with `continuous: true`, so resolving on the first one
  truncates the transcript whenever you pause to think — and the critique then grades
  a half-answer as missing its Result, which is wrong *and* invisible. Gate it:
  `[Done answering]` sets `stopRequested = true` before calling `stop()`. Inside
  `onend`, if the flag is false, restart recognition and keep accumulating into the
  same buffer; only when it is true does the final-transcript promise resolve. A
  restart can clip a word at the seam — acceptable; silent truncation is not.
- Beginning an answer hard-cancels any in-flight interviewer voice
  (`speechSynthesis.cancel()`, or pause + reset the ElevenLabs audio element) before
  `getUserMedia`. Otherwise TTS bleeds through the mic and the interviewer's own
  phrasing lands in the transcript and gets graded as yours.
- If transcript < ~10 chars or recognition unsupported: skip critique, show
  self-check checklist instead — the STAR components as questions (concrete
  situation? what did you personally own? what did you actually do? measurable
  outcome?) plus on time?

### Follow-up probes
- The critique response includes one follow-up question targeting the weakest part
  of the answer. User may answer it (same record/critique loop, but the follow-up
  critique returns no further follow-up — max depth 1). Then next question.

## 3. AI calls

All via `POST /api/ai` route handler → Anthropic Messages API, model
`claude-sonnet-4-6`. Two operations, discriminated by request body `{op, payload}`.

### Route guard

`/api/ai` and `/api/tts` are unauthenticated public routes proxying paid API keys, and
Phase 4 puts them on a guessable Vercel URL. Both require a shared secret
(`NEXT_PUBLIC_SURFACE_SECRET`, sent by the client as an `x-surface-secret` header) and
enforce a simple per-instance in-memory request cap; a miss returns 401 without
touching upstream.

The `NEXT_PUBLIC_` prefix is deliberate and is not a violation of CLAUDE.md's key rule
— that rule protects `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY`, which stay
server-only. The guard secret must reach the client to be sent, so naming it publicly
is honest rather than pretending it's hidden.

This is **not auth** and does not violate §10 — no accounts, no users, no sessions. Be
clear-eyed about what it buys: the secret ships to the client, so anyone reading the
network tab has it. It stops crawlers and drive-by use of a public URL, nothing more.
The in-memory cap is per serverless instance and therefore leaky by design; real
limiting would need a KV store, which is infrastructure this project doesn't want. If
a genuine seal is ever needed, that's Vercel deployment protection, at the cost of a
login before every drill.

### op: "variant" — rephrase a question
max_tokens 200. Prompt (verbatim, tuned — keep):

> Rephrase this behavioral interview question so it asks for the same underlying
> story but with different wording and angle, as a real hiring manager for a
> technical support role at an AI startup would phrase it conversationally. Return
> ONLY the rephrased question, nothing else.
>
> Question: "{question}"

Client validates: 15 < length < 400, else falls back to the original wording.
Show `rephrased · original: {original}` as a small note under the question.

### op: "critique" — debrief an answer
max_tokens 700. Prompt (verbatim, tuned — keep; `{context}` is empty for first
answers, or `This was a follow-up probe after their initial answer to "{originalQ}".`):

> You are a skeptical, experienced hiring manager evaluating a candidate for a
> technical Product Support role at an AI startup. You give calibrated, honest
> critique — never generic praise. {context}
>
> Question asked: "{questionAsked}"
> Candidate's spoken answer (raw transcript, may have transcription errors — judge
> substance, not typos): "{transcript}"
> Time used: {timeUsed} seconds (limit was {limit}). {overtimeNote}
>
> Grade this answer against STAR. A behavioral answer that skips a component is
> incomplete no matter how fluent it sounded:
> - Situation: a specific, concrete setting — real people, a real system, a time and
>   place. "At my last job we often had..." is NOT a situation.
> - Task: what THEY personally owned, distinct from what the team owned.
> - Action: the specific steps they personally took. "We decided" is not an action;
>   "I did X" is.
> - Result: an observable or measurable outcome. "It went better" is not a result.
>
> Also: did they ramble or front-load context too long?
>
> Respond ONLY with valid JSON, no markdown fences:
> {"star":{"situation":true,"task":false,"action":true,"result":false},
> "grade":"weak","feedback":["point 1","point 2","point 3"],"followup":"one sharp
> adaptive follow-up question a real interviewer would ask to probe the weakest part
> of this answer"}
>
> Set each star field true ONLY if that component was genuinely present and specific
> — default to false when in doubt. grade must follow the flags: "weak" if two or
> more are false, "adequate" if exactly one is false, "strong" only if all four are
> true AND the content is genuinely good. Never award "strong" to compensate for
> confident delivery. Keep each feedback point under 25 words, direct, specific to
> what they said, and name the missing STAR components explicitly. If the answer was
> genuinely strong, say what made it strong — but never inflate.

Parsing: strip ```json fences, JSON.parse in try/catch, validate shape
(`star: {situation,task,action,result: boolean}`, `grade: "strong"|"adequate"|"weak"`,
`feedback: string[]`, `followup: string`). On failure show fallback critique line and
continue — never block the session on a parse error. If `star` is missing or
malformed but `feedback` parsed, render the feedback without the STAR chips rather
than discarding the whole critique.

### Non-STAR questions

Three bank entries are not story questions and must NOT be STAR-graded — doing so
would produce nonsense critique. Marked `nostar: true` in the bank (`great-support`,
`problem-process`, `why-dust`). For these, omit the STAR block from the prompt
entirely and grade on clarity, specificity, and concision instead; the response omits
`star` and `grade` but still carries `feedback` and `followup`.

max_tokens 700. Prompt (verbatim, tuned — keep). Derived from the critique prompt
above: persona, input block, ramble check and closer are unchanged; only the STAR
bullets and the JSON contract differ.

> You are a skeptical, experienced hiring manager evaluating a candidate for a
> technical Product Support role at an AI startup. You give calibrated, honest
> critique — never generic praise. {context}
>
> Question asked: "{questionAsked}"
> Candidate's spoken answer (raw transcript, may have transcription errors — judge
> substance, not typos): "{transcript}"
> Time used: {timeUsed} seconds (limit was {limit}). {overtimeNote}
>
> This is NOT a story question. Do not ask for a past example and do not grade it
> against STAR. Judge it on:
> - Clarity: is there a clear point of view, stated early, that you could repeat back
>   after hearing it once?
> - Specificity: does it commit to something concrete — real practices, real
>   tradeoffs, real reasons — or would it be interchangeable with what any candidate
>   would say?
> - Concision: does it get there directly, or circle the same idea?
>
> Also: did they ramble or front-load context too long?
>
> Respond ONLY with valid JSON, no markdown fences:
> {"feedback":["point 1","point 2","point 3"],"followup":"one sharp adaptive follow-up
> question a real interviewer would ask to probe the weakest part of this answer"}
>
> Keep each feedback point under 25 words, direct, and specific to what they actually
> said. The main failure mode here is an answer that sounds reasonable but could have
> come from any candidate — name that explicitly when you see it. Never inflate;
> confident delivery is not a substitute for a real point of view.

STAR is named in order to be forbidden: staying silent would leave a model primed as a
hiring manager free to reach for a past example anyway. Specificity carries the weight
because for `great-support` and `problem-process` the failure mode isn't incoherence,
it's a fluent generic answer.

## 4. Voice output (interviewer voice)

Priority order, selectable in settings:
1. **ElevenLabs** via `POST /api/tts` (server route, key from env): body
   `{text, voiceId}`, upstream `model_id: eleven_turbo_v2_5`,
   `voice_settings {stability:.5, similarity_boost:.75}`; stream/return audio blob.
   Default voiceId `EXAVITQu4vr4xnSDxMaL` (Sarah), overridable in settings.

   **Use a premade voice, not a library voice.** This spec originally defaulted to
   Rachel (`21m00Tcm4TlvDq8ikWAM`); on a free-tier key that returns
   `402 paid_plan_required` — "Free users cannot use library voices via the API."
   Premade voices work on every tier. `GET /v1/voices` lists what a given key can
   actually use; anything with `category: "premade"` is safe.
2. **Browser speechSynthesis** with a voice picker: list English voices ranked
   Natural > Google > Premium/Enhanced > rest; persist choice.
3. **Off** — questions display as text only.

"Test voice" button in settings speaks a sample line. On ElevenLabs failure, show
the error inline and fall back to browser voice for the rest of the session.

**Refinement to "rest of the session":** the fallback latches on the *voice id* that
failed, not on ElevenLabs as a whole. Editing the voice id in settings retries — an
edit is an explicit correction, and fixing a typo only to still hear the browser voice
reads as the fix not working. A rejected or missing key (401/403/503) latches hard: no
UI edit can fix that, so retrying only burns calls.

## 5. Question bank

Stored in localStorage (`surface:bank`), seeded from `lib/seed-bank.ts` on first run.
Editable in-app (phase 3): add / edit / delete / mark story-ready.

The localStorage layer lands in **phase 1**, not phase 3 — phase 3 then adds only CRUD
UI on top, with no data-layer migration. Alongside it, `surface:bankVersion` holds the
seed's version; when the constant in `seed-bank.ts` outruns the stored value, re-seed.
Without this, editing the seed during phases 1–2 leaves your browser silently serving
the old bank, which reads as a phantom bug.

Schema:
```ts
type Question = {
  id: string;
  q: string;          // canonical wording
  hint: string;       // story-bank notes, revealed on demand
  nostory?: boolean;  // flagged amber in UI — no prepared story yet
  nostar?: boolean;   // not a story question — skip STAR grading (see §3)
  tags?: string[];
};
```

Seed data (current Dust bank — keep verbatim):

```json
[
 {"id":"upset-customer","q":"Tell me about a time you helped a frustrated or upset customer. How did you handle it?","hint":"PokerStars — BB story. Start from a template answer, then make it highly tailored. Keep a high standard in CX at all times."},
 {"id":"great-support","q":"What does great support look like to you?","hint":"Fast response, genuine conversation, issue solved effectively. Great CX = the customer feeling heard and understood, not just the fix.","nostar":true},
 {"id":"say-no","q":"Tell me about a time you had to say no to a customer. How did you handle it?","hint":"⚠ No story yet — pick one before the interview.","nostory":true},
 {"id":"critical-feedback","q":"Tell me about a time you got critical feedback. What did you do with it?","hint":"⚠ No story yet — pick one before the interview.","nostory":true},
 {"id":"complex-technical","q":"Describe a complex technical problem you troubleshot. Walk me through how you found the root cause.","hint":"Quable — API. Beats needed: which customer, what broke, what you checked first, actual root cause, outcome + prevention (education). Tell it as a story, not a framework."},
 {"id":"problem-process","q":"Describe your process for solving problems.","hint":"Owning the customer relationship at Quable. Identify → collect data → root cause → generate options → select → implement → review & document.","nostar":true},
 {"id":"explain-nontechnical","q":"Tell me about a time you had to explain something technical to someone who wasn't technical.","hint":"Quable — Patricia, RBAC, product unavailable for user. Analogy tailored to her world. Outcome: no more confusion, no more product issue for her team."},
 {"id":"work-with-eng","q":"Tell me about a time you worked with engineering or product to get something fixed.","hint":"Quable — recurrent data-sync bug the tech team dismissed. Tracked each case, reproduced, Loomed them. Outcome: issue mostly solved / far less frequent."},
 {"id":"automation","q":"Tell me about a time you built a tool, automation, or process that eliminated repetitive work.","hint":"Quable — FAQ. Analyzed previous errors, drafted very specific FAQ entries, automated Level 1."},
 {"id":"learn-fast","q":"Describe a time you had to learn a new technical domain or product quickly. How did you go about it?","hint":"Time off — learning Claude Code by using Claude Code. Built a project. A system that lets me learn anything."},
 {"id":"initiative","q":"Describe a time you went above and beyond or took the initiative.","hint":"Quable — response time. 24h RT was 'fine' but I identified the pain point, worked a solution with the manager. RT: ~24h → ~30min."},
 {"id":"priorities","q":"Tell me about a time you juggled competing priorities or high ticket volume. How did you decide what to do first?","hint":"Quable — huge bug hitting most active users. 100 tickets: tag, dedicated queue, communicate the critical error. Fixed same afternoon, clean next day."},
 {"id":"time-management","q":"Describe an occasion when you had to manage your time to complete a task.","hint":"Freediving — 1h30 in the water. Personal discipline angle."},
 {"id":"mistake","q":"Tell me about a mistake or failure. What did you learn from it?","hint":"Achilleus — marketed on known channels instead of real market research. Learned: identify the need before enjoying the build. Alt: picking several questions from same chat / dry training Nicaragua."},
 {"id":"conflict","q":"Tell me about a time you disagreed with a teammate or your manager. How did you handle it?","hint":"Lucien picking up my Level 1 tickets on my box. ⚠ No beats yet — write them.","nostory":true},
 {"id":"influence","q":"Tell me about a time you influenced others.","hint":"The sync issue — proving the bug was real to the tech team (same story as engineering/product, different framing)."},
 {"id":"leadership","q":"Describe a time you used your leadership skills to motivate your team or colleagues.","hint":"Ryanair story."},
 {"id":"resilience","q":"Tell me about a time you showed resilience under pressure.","hint":"PokerStars Q1."},
 {"id":"career-goal","q":"Share an example of a career goal you had. What steps did you take to achieve it?","hint":"Becoming a Responsible Gaming specialist."},
 {"id":"difficult-decision","q":"Give an example of a time you had to make a difficult decision. How did you handle it?","hint":"Deciding to live in Poland."},
 {"id":"ambiguity","q":"Tell me about a time you worked in ambiguity, with no clear process, and made progress anyway.","hint":"⚠ No story yet — Limens or MPC build could work. Decide before the interview.","nostory":true},
 {"id":"why-dust","q":"Why Dust, and why this support role specifically?","hint":"Your answer, not a story — but have the two-sentence version cold.","nostar":true}
]
```

## 6. Settings (persist to `surface:settings`)

- Answer limit: 90 / 120 / 150s (default 120)
- Questions per session: 5 / 8 / 12 / all (default 5)
- Rephrase questions: on/off (default on)
- Read aloud: on/off (default on)
- Voice mode: browser voice (with picker) / ElevenLabs (voiceId field) / off
- ElevenLabs key is NOT stored client-side — it lives only in the server env.

## 7. Session history (phase 3)

Persist per answered question to `surface:history`:
```ts
type StarFlags = { situation: boolean; task: boolean; action: boolean; result: boolean };

type Attempt = {
  questionId: string; askedWording: string; timestamp: number;
  timeUsedSec: number; overtime: boolean;
  transcript: string; feedback: string[]; followup?: string;
  star?: StarFlags;                              // absent for nostar questions
  grade?: "strong" | "adequate" | "weak";        //   and for parse failures
  skipped?: boolean;                             // Skip pressed before answering
  abandoned?: boolean;                           // hit the 3× runaway ceiling (§2)
}
```
Summary screen shows: answered/skipped counts, average time used, and the 3 question
ids with the most skips + overtimes across all history ("weakest stories — rewrite
these"). Also show a **STAR miss breakdown** — which of the four components you drop
most often across all attempts — since that's the pattern this drill exists to
surface. A single line is enough: `most dropped: Result (7 of 12 answers)`. A simple
history page lists past attempts grouped by question, showing each attempt's grade
and lit/dark STAR chips, so progress on a story is visible over time. No charts
needed; a table is fine.

## 8. Design tokens

Dark "under the surface" theme. The dive-timer ring is the one signature element;
everything else stays quiet.

```css
--ink:#0E2233;    /* base bg (page uses vertical gradient #0B1B29 → #123049) */
--sea:#16405B;
--mid:#2E5E7E;
--foam:#F2F7F9;   /* primary text */
--mist:#DCE8ED;   /* secondary text */
--amber:#FFB454;  /* overtime, warnings, no-story flags */
--kelp:#5FD3BC;   /* accent, ring, actions */
--alert:#E8604C;  /* rec dot */
```

STAR chips: four small monospace `S T A R` boxes in the debrief. Present = `--kelp`
text on a faint kelp wash; missing = `--amber` with a struck-through letter, so a
gap reads as a flag rather than as absence. Grade label sits beside them in
monospace uppercase — `weak` in `--amber`, `adequate` in `--mist`, `strong` in
`--kelp`. Never use `--alert` here; that stays reserved for the rec dot.

Type: monospace (SF Mono / ui-monospace stack) for labels, counters, meta — set in
uppercase with wide letter-spacing; system sans for questions and body. Question
text 22px/600. Cards: `rgba(foam,.05)` bg, 1px `rgba(foam,.12)` border, 14px radius.
Respect `prefers-reduced-motion`. Visible keyboard focus (`--kelp` outline).

## 9. Build plan — execute in order, stop between phases

**Phase 1 — build from this spec.**
(Originally "port the prototype" — the prototype is lost, so this spec is the source
of truth. See CLAUDE.md § Reference.)
Scaffold Next.js + TS. `/api/ai` and `/api/tts` route handlers. Components:
Idle/Settings, Drill (question card, hint reveal, dive timer, controls), Debrief
(STAR chips + grade, critique list, follow-up, transcript details, playback),
Summary. Seed bank hardcoded from `lib/seed-bank.ts`. Use a promise on
`recognition.onend` for the final transcript — never a timeout. Everything works
end-to-end locally.
*Verify manually:* full 2-question session in Chrome; graceful degrade in Firefox;
keys absent from client bundle (`grep` the build output); an answer deliberately
missing its Result comes back graded `weak` with `result:false`.

**Phase 2 — settings persistence + ElevenLabs.**
localStorage-backed settings incl. browser-voice choice. `/api/tts` wired with
fallback chain. Test-voice button.
*Verify:* reload keeps settings; bad voiceId falls back with visible notice.

**Phase 3 — bank editing + history.**
Bank CRUD UI (list view, edit in place, nostory toggle), seeded on first run.
Attempt logging, summary stats, history page with weakest-stories callout.
*Verify:* edits survive reload; history accumulates across sessions.

**Phase 4 — deploy.**
Vercel project, env vars set, production smoke test on https (mic permissions).
`README.md` with setup (env vars, dev, deploy) — written for future-Richard, short.

## 10. Non-goals

Auth, accounts, sharing, mobile apps, scoring gamification/streaks, question
marketplaces, multi-language. If a feature isn't in this spec, ask before building.