// Restore a Halo Labs backup from Backblaze B2. Never touches the live data: it unpacks into a folder you name.
//   node server/backup-restore.ts list
//   node server/backup-restore.ts get latest /tmp/halolabs-restore      (or a name from `list`)
// Needs .env with HALO_DB_KEY (the same key the backup was made with) plus B2_KEY_ID, B2_APP_KEY and B2_BUCKET
// (add them to .env for the restore: the copies saved in Settings live inside the database being restored).
// To put a restored copy into service: ./halo stop, move data/ aside, copy halolabs.db and imports/ from the
// restore folder into data/, ./halo start (see docs/operations.md → Restore).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decryptBackup, downloadBackup, listBackups } from './backup.ts'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
process.loadEnvFile(join(ROOT, '.env'))
const [cmd, which = 'latest', dest] = process.argv.slice(2)

if (cmd === 'list') {
  for (const f of await listBackups()) console.log(`${f.name}  ${(f.bytes / 1e6).toFixed(1)} MB  ${f.at}`)
} else if (cmd === 'get' && dest) {
  const out = resolve(dest)
  if (out.startsWith(join(ROOT, 'data'))) throw new Error('Restore into a separate folder, not the live data/')
  if (existsSync(out) && readdirSync(out).length) throw new Error(`${out} is not empty`)
  const list = await listBackups(), f = which === 'latest' ? list.at(-1) : list.find(x => x.name === which || x.name.endsWith(which))
  if (!f) throw new Error('No such backup (try `list`)')
  console.log(`downloading ${f.name} (${(f.bytes / 1e6).toFixed(1)} MB)…`)
  const tar = decryptBackup(await downloadBackup(f.name)) // fails loudly with the wrong key or a damaged file
  mkdirSync(out, { recursive: true, mode: 0o700 })
  writeFileSync(join(out, 'backup.tar.gz'), tar, { mode: 0o600 })
  execFileSync('tar', ['-xzf', join(out, 'backup.tar.gz'), '-C', out])
  console.log(`restored into ${out}: ${readdirSync(out).join(', ')}`)
} else {
  console.log('usage: node server/backup-restore.ts list | get <latest|name> <empty folder>')
}
