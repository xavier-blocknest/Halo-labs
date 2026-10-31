# Halo Labs

Your personal training command center. It pulls in WHOOP and Strava, reads your exports (FitnessAI, Runna,
MacroFactor, lab, DEXA and VO₂ reports), makes a daily Hard / Easy / Rest call, tracks your roadmap to your next race,
and has an AI coach you can type or talk to.

It runs on your Mac in Docker. Your data is stored encrypted in this folder and never leaves the Mac, except the text the coach
sends to Claude and your voice going to ElevenLabs for transcription.

---

## 1. One-time setup (about 15 minutes)

**You need:**
- **Docker Desktop** ([docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)) or
  **OrbStack** ([orbstack.dev](https://orbstack.dev), lighter and faster on a Mac). Install one and open it once.
  In its settings, turn on **Start at login**, so Halo Labs comes back after a restart.
- This folder somewhere permanent, e.g. `~/halolabs`.

**Then, in Terminal:**

```sh
cd ~/halolabs
./halo setup
```

This writes your settings file, builds and starts Halo Labs, opens it in your browser, and prints a **setup code**.

After creating your passkey you can choose **Set up Halo Labs** or **Explore with sample data**. Sample data
fills every page with a made-up athlete's year, so you can see how it all works before connecting anything. Nothing
is saved in sample mode, and the **Set up Halo Labs** button on the banner starts the real setup whenever you're ready.

1. On the lock screen, enter the setup code and create a **passkey** (Touch ID; it's saved in iCloud Keychain).
2. A **setup guide** walks you through the rest: your name, where your data lives, the recovery key, which services
   to switch on (AI coach, WHOOP, Strava, voice) with step-by-step instructions for each key, your Quest lab PDFs,
   and anything else you track (DEXA, VO₂ max, MacroFactor, FitnessAI, Runna, a race plan).
3. **Download the recovery kit** when the guide offers it. Put the file in your password manager and delete it
   from Downloads. Without this key nobody (not even you) can read your data if the `.env` file is lost.

Skipped something? Everything is in **Settings** later, and Settings → APIs → **Run setup again** reopens the guide.

Open it any time at **http://localhost:8787** (or `./halo open`).

## 2. Your API keys (the setup guide, or Settings → APIs)

| Service | What for | Where to get it | Cost |
|---|---|---|---|
| **Claude** | the coach, morning brief, coach memory, journal formatting | [console.anthropic.com](https://console.anthropic.com) → API keys (add a few dollars of credit) | pay per use, typically cents a day |
| **ElevenLabs** | voice: hearing you (speech-to-text) and the coach's voice | [elevenlabs.io](https://elevenlabs.io) → Developers → API keys; then Voices → pick a voice → copy its **Voice ID** | free plan ≈ 10k characters/month; when it runs out the coach uses your device's built-in voice |
| **WHOOP** | live recovery, sleep, strain, workouts | [developer.whoop.com](https://developer.whoop.com) → create a team and an app | free |
| **Strava** | live runs, rides, swims | [strava.com/settings/api](https://www.strava.com/settings/api) → create an app | free |
| Backblaze B2 *(optional)* | nightly encrypted off-site backup | [backblaze.com](https://www.backblaze.com/cloud-storage) → a private bucket + application key | ~free at this size |

**WHOOP app settings:** scopes `read:recovery read:cycles read:workout read:sleep read:body_measurement` and `offline`;
redirect URL `http://localhost:8787/oauth/whoop/callback`.
**Strava app settings:** Authorization Callback Domain `localhost`.
Then **Settings → Sources → Connect**. History backfills in the background.

(Settings → Sources shows the exact redirect URL. If WHOOP refuses a `localhost` address, do step 4 first and use the
`https://…ts.net` address instead.)

Note on Strava: its API terms limit storing data and using it with AI. Halo Labs stores your Strava data and lets the
coach read it. That's your call; the alternative is to leave Strava disconnected and upload Strava's bulk export.

## 3. Adding data

- **Settings → Upload data**: drag in exports or PDFs (or a zip of them). Files are recognized by their content.
  See [docs/importing.md](docs/importing.md) for every supported format.
- **Roadmap**: on the Roadmap page, **Build your roadmap** (or **Edit roadmap** later) to set your goal race, the races
  and milestones on the way, a typical week and notes for the coach. Already have a roadmap file in Halo Labs' format
  ([docs/roadmap-template.json](docs/roadmap-template.json))? Upload it instead; you can still edit it in the app.
- **Coach**: Settings → Coach: keep the built-in **Coach** or **write your own** personality. Tell it things to
  remember ("remember I'm allergic to shellfish"); they show up under Settings → Coach memory.

## 4. Using it on your iPhone (optional)

The Mac address (`localhost`) only works on the Mac. For the iPhone (and the upload Shortcut):

1. Install **Tailscale** on the Mac and the iPhone ([tailscale.com/download](https://tailscale.com/download)), signed in to the same account.
2. In the Tailscale admin console → DNS, turn on **MagicDNS** and **HTTPS Certificates**.
3. Run `./halo phone`. Halo Labs moves to an address like `https://your-mac.tailXXXX.ts.net` on both devices.
   Passkeys are tied to the address, so you'll create a new one with a new setup code (printed for you).
4. Update the WHOOP and Strava redirect URLs to the new address and reconnect them.

It's private to your Tailscale account: nobody else can reach it. The Mac has to be awake for the phone to reach it.

## 5. Everyday commands

```
./halo start | stop | restart     ./halo status       ./halo logs
./halo open                       ./halo setup-code   ./halo reset-passkeys
./halo update
```

**Updates:** within about 15 minutes of a new version of Halo Labs coming out, a banner at the top of the page offers **Update now** (also in
Settings → Updates). The page reloads by itself when it's done; the × hides the banner until the next version. The rare update that installs new parts says to run
`./halo update` in Terminal instead. If the Halo Labs repository is private, add a GitHub token in Settings → APIs → GitHub.

Halo Labs keeps syncing while the browser is closed, as long as the Mac is awake and Docker is running. While the Mac
sleeps, syncing pauses and catches up when it wakes.

## 6. Changing the app with Claude

Claude (Claude Code, or Dispatch from your phone) can change this app: ask in plain words, for example "add a card that
shows my weekly running mileage". [CLAUDE.md](CLAUDE.md) gives Claude the map of the code and the rules.
Edits go live by themselves (no rebuild). The folder is a git repository, so every change can be undone:
`git log` to see changes, `git revert <id>` to undo one.

## 7. If something goes wrong

| Problem | Fix |
|---|---|
| The page doesn't load | `./halo status`; if not running, `./halo start`; still broken: `./halo logs` |
| Lost every passkey | `./halo reset-passkeys`, then use the new setup code |
| Coach says it's offline | Settings → APIs → Claude → Test (key wrong, or no credit left) |
| Voice doesn't work | Settings → APIs → ElevenLabs → Test; allow the microphone in the browser |
| WHOOP / Strava stopped syncing | Settings → Sources shows the error; Disconnect and Connect again |
| Settings → Updates says GitHub refused access | The repository is private: add a GitHub token in Settings → APIs → GitHub (read access to the repository's Contents) |
| Want to start over | Settings → **Delete all data** (bottom of the page): clears all your data and reopens the setup guide. Tick the boxes to also delete API keys and settings, or passkeys (you get a new setup code) |
| New Mac or broken disk | see [docs/operations.md](docs/operations.md) → Moving or restoring |

**Never delete or edit the `HALO_DB_KEY` line in `.env`.** Never share `.env` or the `data/` folder.
