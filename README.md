# surface

personal behavioral-interview drill. shuffles a fixed bank of ~22 questions,
rephrases each with ai so answers can't be recited, records a spoken answer
against a hard timer, transcribes it, and returns a skeptical critique graded on
star (situation / task / action / result) plus one adaptive follow-up.

single user, no auth, no accounts. `specs.md` is the source of truth for behavior
and prompts; `CLAUDE.md` carries the working conventions.

## setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev                  # http://localhost:3000
```

## env vars

set these in `.env.local` (never committed). copy the shape from `.env.example`.

| var | needed | notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | server-only, powers `/api/ai` (rephrase + critique). |
| `ELEVENLABS_API_KEY` | optional | server-only, powers `/api/tts`. without it, browser voice still works. |
| `NEXT_PUBLIC_SURFACE_SECRET` | yes | any long random string. shared guard on both api routes. deliberately `NEXT_PUBLIC_` — the client sends it, so it's readable in devtools. it stops drive-by use of a public url, nothing more. it is not auth. |

keys stay server-side: all anthropic and elevenlabs calls go through `/app/api/*`
route handlers. never expose either with `NEXT_PUBLIC_`.

## commands

```bash
npm run dev          # local dev
npm run build        # production build — must pass before a commit is done
npm run lint         # eslint, must be clean
npm run test         # vitest — pure logic only (parser, shuffle, summary)
npm run test:watch   # vitest watch mode
```

## browser notes

- **speech recognition is chromium-only.** in firefox/safari there's no
  transcript, so no ai critique — but the timer and recording playback still
  work, with a visible notice. the app never hard-crashes on a missing api.
- **mic access needs a user gesture and https (or localhost).** recording only
  starts on an explicit button click.
- **state lives in localstorage**, namespaced `surface:*` — question bank,
  settings, and attempt history. clearing site data resets everything to the
  seed bank.

## deploy

standard next.js app router build — `npm run build` then `npm run start`, or any
host that runs next.js. set the three env vars above in the host's environment;
the repo carries none of them. mic permissions require https in production.
