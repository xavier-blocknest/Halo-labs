# Operations

## What lives where

| Path (in the Halo Labs folder) | What | Back it up? |
|---|---|---|
| `.env` | `HALO_DB_KEY` (encrypts everything), `HALO_TZ`, `PUBLIC_URL` | the key: yes, via the recovery kit in a password manager |
| `data/halolabs.db` | all records, settings, API keys, OAuth tokens, encrypted | yes (Time Machine and/or B2) |
| `data/imports/` | encrypted copies of every file you uploaded | yes |
| `data/setup-code` | one-time code, exists only until the first passkey | no |
| `inbox/` | drop folder for files; emptied after import | no |
| everything else | the code (git) | git |

The database is useless without the key, and the key is useless without the database: keep them in different places.

## Backups

- **Time Machine** covers the folder automatically if it's on, including `data/`. The database is encrypted, so the
  backup is too. (A copy taken while the app writes is almost always fine; B2 backups are always consistent.)
- **Backblaze B2** (optional, Settings → APIs): nightly around 3 AM, a consistent snapshot, encrypted on the Mac
  before upload. Keeps 14 nightly, 8 weekly and 12 monthly copies. "Back up now" in Settings → Backups.

## Moving to a new Mac

1. Install Docker Desktop or OrbStack. Copy the whole Halo Labs folder (including the hidden `.env` and `data/`) to the
   new Mac, e.g. with AirDrop as a zip, or `git clone` the code and copy `.env` and `data/` separately.
2. `./halo start`. Passkeys from iCloud Keychain keep working (same address).

## Restoring

From Time Machine: `./halo stop`, restore `data/` (and `.env` if it's gone), `./halo start`.

If `.env` is lost: create `.env` with the `HALO_DB_KEY=…` line from your recovery kit, then `./halo setup`.

From Backblaze B2 (needs the key, plus `B2_KEY_ID`, `B2_APP_KEY` and `B2_BUCKET` lines in `.env` for the restore):

```sh
docker compose run --rm halolabs node server/backup-restore.ts list
docker compose run --rm halolabs node server/backup-restore.ts get latest /app/restore
./halo stop
mv data data-old && mkdir data && cp restore/halolabs.db data/ && cp -R restore/imports data/
./halo start
```

Once it works, delete `restore/` and `data-old/`.

## Passkeys

- Passkeys belong to the address you open: `http://localhost:8787` and the Tailscale `https://…ts.net` address are
  different, so a passkey made for one doesn't work on the other. `./halo phone` handles the switch.
- Lost them all: `./halo reset-passkeys`, then use the new setup code.
- Auto-lock after inactivity: Settings → Passkeys.

## Logs and health

- `./halo logs` follows the server log (imports, syncs, coach errors, client errors from the browser).
- `./halo status` shows the container and whether `/api/health` answers.
- Docker's own health check marks the container unhealthy if the server stops answering; `restart: unless-stopped`
  brings it back after crashes and reboots (Docker Desktop must start at login).

## Updating packages

Change `package.json`, run `npm install` once to update `package-lock.json` (or let Claude do it), then
`./halo restart`: the container reinstalls packages when `package-lock.json` changes.
