# Adding data by hand

The easiest way is Settings → **Upload data** (drag files or a zip onto it). You can also drop files into the
`inbox/` folder inside your Halo Labs folder: loose, in any folders, or zipped.

The server checks the inbox every 30 seconds (and `POST /api/import` takes a single file directly).
Each file is recognized by its content, not its name or folder, converted to the standard records in
`server/model.ts`, merged into the database, and archived encrypted under `data/imports/`. The inbox
is then emptied.

| Recognized file | Becomes |
|---|---|
| WHOOP export: `physiological_cycles.csv`, `sleeps.csv`, `workouts.csv`, `journal_entries.csv` | `whoop/cycle`, `whoop/sleep` + `whoop/nap`, `whoop/workout`, `whoop/journal` |
| Strava bulk export: `activities.csv` | `strava/activity` |
| FORM Smart Swim goggles: per-swim CSV (`FORM_<date>_<time>.csv`; a swim header row, a blank line, then one row per length or rest) | `form/swim` (every length; glitchy lengths are flagged when read, not dropped). Auto makes FORM the swim source once imported |
| FitnessAI: `workout*.json`, `userexerciseset*.json` | `fitnessai/workout`, `fitnessai/set` |
| Runna: `activities*.json` | `runna/run` (runs mirrored from Strava are skipped unless linked to a plan workout) |
| MacroFactor export (`.xlsx`) | `macrofactor/day`, `macrofactor/target`, `macrofactor/measurements` |
| Quest Diagnostics lab report (PDF) | `labs/draw`, `labs/result` (one per marker) |
| Benchmark Body Metrics DEXA report (PDF) | `dexa/scan` |
| VO₂ max test report (PDF) | `vo2/test` |
| Nutrition protocol (Markdown `.md`: `# … Protocol` + `## Daily targets`, start date line like `Jan 5, 2027 · @Name`) | `plan/protocol` (Fuel page and coach) |
| Fitness roadmap (JSON with `primary_goal` and `milestones`; start from `docs/roadmap-template.json`; a target goal or checkpoint instead of a race: see below) | `plan/roadmap` (Roadmap and Week pages, coach) |
| Diet discipline rules (`.txt`: `Bacon: 1x week max` lines, optional `---` then uses `Burger: 10/25/26`) | `plan/diet` |

**Overlapping exports are fine.** Records are keyed by the real event (a cycle's start time, a Strava
activity id, a draw date + marker), so re-uploading a longer export updates rows instead of duplicating
them, and the WHOOP and Strava API syncs write to the same rows. Uploading the identical file twice is
skipped.

**Unknown or broken files** are never guessed at: they go to `inbox/_unrecognized/` or `inbox/_failed/`
and show up in the import log (`GET /api/sources` → `imports`). A new format needs a new importer in
`server/import/`, registered in `server/import/index.ts`.

## From the iPhone share sheet (iOS Shortcut)

Settings → **Upload from iPhone** → *Create an upload token* (shown once), then build a Shortcut:

1. New Shortcut *Send to Halo Labs*; in its details turn on **Show in Share Sheet**, accepting **Files**.
2. **Get Contents of URL**: `https://<your-mac>.<tailnet>.ts.net/hooks/import` (Settings shows the exact URL), method **POST**.
3. Headers: `Authorization: Bearer flu_…`, and `X-Filename` = Shortcut Input → Name.
4. Request Body: **File** → Shortcut Input. Then **Show Result** (the server answers with one line, e.g. "Imported: …").

The token can only import (no reading). Files without an extension are named by content (xlsx, zip, pdf, json, md, csv,
txt). Needs phone access (`./halo phone`, see the README) and Tailscale on on the phone. Ten bad tokens in ten minutes from one address are refused for ten minutes.


## Roadmap targets

A main goal can be a measurable target instead of a race: `"primary_goal": { "kind": "target", "event": "VO₂ max 50",
"date": "2027-06-01", "target": { "metric": "vo2max", "value": 50 } }`. A milestone becomes a checkpoint with
`"target": { "metric": "vo2max", "value": 47 }`. Metrics (`server/targets.ts`): `vo2max`, `weight` (lb), `body_fat` (%),
`lean_mass` (lb), `rhr`, `hrv` (WHOOP 7-day averages), `run_5k`, `run_10k`, `run_half` (seconds; Strava best efforts),
`lift` (lb, with `"of": "Bench Press"`, FitnessAI), `lab` (with `"of": "LDL CHOLESTEROL"`). When no data has a value
yet, the planner asks for the current one and stores it as `plan/reading` (labelled "you entered"); `target.start` is
filled in on save from the value at that moment, so progress counts from there.
