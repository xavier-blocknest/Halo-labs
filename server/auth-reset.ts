// Recovery: remove every passkey and session, then restart the server to get a new setup code.
// Run:  ./halo reset-passkeys   (or inside the container: node server/auth-reset.ts, then restart)
import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const db = new DatabaseSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'halolabs.db'))
const has = (t: string) => !!db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(t)
const keys = has('passkeys') ? db.prepare('DELETE FROM passkeys').run().changes : 0
const sessions = has('sessions') ? db.prepare('DELETE FROM sessions').run().changes : 0
console.log(`Removed ${keys} passkeys and ${sessions} sessions. Restart Halo Labs; it will write a new setup code to data/setup-code.`)
