# Halo Labs: notes for Claude

A personal training dashboard for one athlete, running in Docker on his Mac. It merges WHOOP, Strava, FitnessAI,
Runna, MacroFactor, lab/DEXA/VO₂ reports, makes a daily Hard / Easy / Rest call, tracks a race roadmap, and has an AI
coach (Claude) you can type or talk to (ElevenLabs speech-to-text and voice).

The owner may ask for changes from his phone (Claude Dispatch) in a sentence or two. Keep changes small, finish
them, verify them, commit them, and tell him in one or two plain sentences what changed.

## Non-negotiable rules

1. **No made-up data.** Every number, date and sentence on a page comes from the database (`/api/dashboard`) or saved
   state. When a source has nothing, show an empty state ("No WHOOP data yet"), never a placeholder or sample value.
   The one exception is **sample mode** ("Explore with sample data" on first run): `server/sample.ts` generates a
   made-up athlete in its own process and throwaway database, `/api/sample/dashboard` serves the result, and the
   client (`src/sampleMode.ts`) blocks every write while it's on and shows a "Sample data" banner. Sample records must
   never be written to the real database, and nothing else may use made-up values.
2. **Health data stays on the Mac.** Never commit `data/`, `inbox/`, `.env` or any `*.db`; never upload, paste or
   print their contents. The only data that leaves the Mac: the text the coach sends to Claude, the audio sent to
   ElevenLabs for transcription, the reply text sent to ElevenLabs for speech, and (if set up) encrypted backups.
3. **Never touch the `HALO_DB_KEY` line in `.env`** and never print `.env`. It encrypts everything; losing it loses all data.
   Other `.env` lines (`PUBLIC_URL`, `HALO_TZ`) may be edited with care; restart afterwards.
4. **Everything is encrypted at rest.** New stored data goes through `upsertRecords` / `setState` / `setSecret`
   (`server/db.ts`), never raw SQLite writes. API keys live in Settings → APIs (`server/settings.ts`), never in code.
5. **Each workout counts once.** Never add up raw records from two apps; use `buildSessions()`
   (`server/dashboard/sessions.ts`) and its source-of-truth rules. The athlete picks the source per sport in Settings →
   Activity sources (`resolveSources()`); Auto = runs from Strava, swims from FORM goggles (absorbing
   FORM's Strava copy; earlier Strava swims still count) else Strava, rides from WHOOP, lifts from FitnessAI
   when those have data, else WHOOP (WHOOP only → everything WHOOP); walks and the rest = WHOOP. WHOOP supplies heart
   rate, strain and calories when it isn't the source. With Strava for runs, a WHOOP run with no Strava match is a
   treadmill run (no distance).
6. **Locked by default.** Every `/api/*` and `/oauth/*` route sits behind the passkey session check in
   `server/index.ts`. New data routes go *after* that check. Only `/auth/*`, `/api/health` and `/hooks/import`
   (upload-only token) are reachable without signing in.
7. **The browser bundle must never contain personal data**: it is served before login.
8. **Verify before saying it's done** (below). If something fails, say so plainly.

## How it runs

- `docker-compose.yml` runs one container, `halolabs`, with this folder mounted at `/app` and published on
  `127.0.0.1:8787` (Mac only). `scripts/start.sh` builds the browser app, then keeps it live: **vite rebuilds `dist/`
  when `src/` changes, and node restarts the server when `server/` changes.** Edits apply on their own; no rebuild needed.
- Restart after editing `.env`: `./halo restart`. Rebuild only after changing the `Dockerfile`: `./halo rebuild`.
- Node 24 runs `server/*.ts` directly (type stripping): **only erasable TypeScript in server code**: no enums, no
  parameter properties, no namespaces (`tsconfig.server.json` enforces `erasableSyntaxOnly`).
- Time zone: `HALO_TZ` in `.env`. "Day" always means the athlete's local calendar day.
- The coach model is `COACH_MODEL` in `server/index.ts`.

## Verify a change

```sh
./halo check                      # typecheck (client + server) and build, inside the container
./halo logs 50                    # server restarted cleanly? no errors?
curl -s localhost:8787/api/health # {"ok":true}
```

If Docker isn't available to you, `npm ci && npm run build` on the Mac does the same checks. For UI changes, check
the page at 390 px wide (iPhone) and desktop width. Data routes need a signed-in session, so test them through the
app in the browser, not with curl.

## Commit

The folder is a git repo; commit each finished change so it can be undone. Updates merge the new version from GitHub
(origin/main) into this folder and refuse while there are uncommitted changes, so always commit:

```sh
git add -A && git diff --cached --name-only   # must not list data/, inbox/, .env or *.db
git commit -m "Short description of the change"
```

## Map

```
server/
  index.ts          HTTP routes, session gate, coach (/api/complete), speech (/api/transcribe, /api/tts), settings routes
  settings.ts       Settings → APIs: keys and name, encrypted; setting('ID') reads one (saved value, else .env)
  auth.ts           passkeys (WebAuthn), sessions, idle auto-lock, setup code (data/setup-code)
  crypto.ts db.ts   AES-256-GCM sealing; SQLite schema and helpers (records, state, secrets, imports, sync_runs)
  model.ts          canonical record types: every importer and connector writes exactly these
  oauth.ts sync.ts connectors/   WHOOP and Strava OAuth, polling scheduler, API clients
  import/           one importer per file format (detected by content); index.ts registers them
  dashboard/        GET /api/dashboard: one module per page (sessions, training, body, whoop, nutrition, plan, tests…);
                    bests.ts = Training → Personal bests (Strava best efforts, swim/ride bests, heaviest FitnessAI sets)
  memory.ts         coach memory: notes (+ optional recall with OLLAMA_URL)
  sample.ts         sample-mode generator (separate process, throwaway database; never touches data/)
  update.ts         new-version check (git fetch origin main) and one-click update (merge); Settings → Updates
  journal.ts calendar.ts (Calendar events + roadmap/protocol dates; PUT|DELETE /api/calendar/:id) weekPlan.ts backup.ts uploadTokens.ts
  push.ts           notifications (Web Push, node:crypto only, no npm package): today's call, calendar reminders, sync
                    problems; devices/keys/switches in secrets push-*; Settings → Notifications (src/app/Notifications.tsx, public/sw.js)
  priorities.ts     coach's update_priorities tool: its own Overview priorities + edits/hides of the data-driven ones (plan/priority)
src/
  app/              React components: App (auth gate, onboarding gate, data loading), LockScreen, Onboarding (first-run
                    wizard; state in /api/onboarding), DataPage (Settings), ApiKeys,
                    RecoveryKit, CoachPicker, CoachMemory, Uploader, RoadmapView, RoadmapPlanner (builds/edits the
                    whole roadmap; /api/roadmap/doc), DeleteAll (Settings → Delete all data; POST /api/wipe), FuelView, JournalPage, CalendarPage (+ UpcomingCard on Overview: next 14 days), WeekPlan, …
  legacy/           logic.tsx (shell: nav, layout, boot sequence, chat UI; plain JS, @ts-nocheck),
                    builders.tsx (every page's view model + voice + coach prompts), View.tsx (page layout, reads only v.*)
  coachPersona.ts   coach personalities (Coach, the athlete's own)
  claude.ts voice.ts sync.ts   coach client, microphone capture, localStorage ↔ server sync for shared keys
  sampleMode.ts     sample mode flag + write guard
docs/               importing.md (formats), connectors.md (WHOOP/Strava API notes), operations.md, roadmap-template.json
```

## Adding or changing a card

1. Compute the numbers on the server (`server/dashboard/*.ts`) and return compact, display-ready values.
2. Build the view model in `src/legacy/builders.tsx`. Always return arrays/objects even when empty: `View.tsx` reads
   nested fields, and a missing object crashes the page.
3. Add the JSX in `src/legacy/View.tsx` (or a component in `src/app/`) with the existing style vocabulary: cards
   `borderRadius 18px`, background `oklch(0.185 0.018 262 / 0.9)`, border `1px solid oklch(1 0 0 / 0.07)`, padding
   24px; text colors `T1`/`T2`/`T3`, accent `A`, good `G`, warning `W`, alert `R` (constants in logic.tsx). Fonts:
   Space Grotesk for headings and numbers, IBM Plex Sans for text.
4. No literal data in JSX: every number, date or name comes from `v.…`.

## New file format

Add an importer in `server/import/` (see an existing one: `detect` by content, `parse` into the record types in
`server/model.ts`), register it in `server/import/index.ts`, add the source to `SOURCES` in `src/app/DataPage.tsx`
if it's new, and document it in `docs/importing.md`. Test with the real file through Settings → Upload data.
