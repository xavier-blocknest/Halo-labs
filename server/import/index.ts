// Import pipeline. Drop files (or zips) anywhere under inbox/, or upload them from Settings: each file is
// recognized by content, parsed into canonical records (model.ts), merged into the database, and its
// original is archived encrypted under data/imports/. The inbox is left empty except for files that
// could not be recognized (inbox/_unrecognized) or failed to parse (inbox/_failed).
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { promisify } from 'node:util'
import { sealBytes } from '../crypto.ts'
import { findImport, logImport, upsertRecords } from '../db.ts'
import { benchmarkDexa } from './dexa.ts'
import { sniff, type Importer } from './files.ts'
import { fitnessSets, fitnessWorkouts } from './fitnessai.ts'
import { macroFactor, macroFactorQuick } from './macrofactor.ts'
import { dietRules } from './diet.ts'
import { macroFactorFoodLog } from './foodlog.ts'
import { formSwims } from './form.ts'
import { roadmap } from './plan.ts'
import { protocolDoc } from './protocol.ts'
import { questLabs } from './quest.ts'
import { runnaRuns } from './runna.ts'
import { stravaCsv } from './strava.ts'
import { vo2Report } from './vo2.ts'
import { whoopCycles, whoopJournal, whoopSleeps, whoopWorkouts } from './whoop.ts'

const run = promisify(execFile)

export const IMPORTERS: Importer[] = [
  whoopCycles, whoopSleeps, whoopWorkouts, whoopJournal, stravaCsv, fitnessWorkouts, fitnessSets, runnaRuns,
  macroFactor, macroFactorQuick, macroFactorFoodLog, questLabs, benchmarkDexa, vo2Report, roadmap, protocolDoc, dietRules,
  formSwims,
]

export type ImportResult = { file: string; status: 'imported' | 'duplicate' | 'unrecognized' | 'failed'; importer?: string; records?: number; detail?: string }

let ROOT = ''
export const inboxDir = () => join(ROOT, 'inbox')
const SETTLE_MS = 5000 // skip files still being written (e.g. an scp in progress)
const SKIP = (name: string) => name.startsWith('.') || name === '__MACOSX' || name === 'Thumbs.db'

export function initImports(root: string) {
  ROOT = root
  for (const d of ['inbox', 'inbox/_unrecognized', 'inbox/_failed', 'data/imports']) mkdirSync(join(root, d), { recursive: true, mode: 0o700 })
}

function moveAside(path: string, folder: '_unrecognized' | '_failed') {
  const dest = join(inboxDir(), folder, basename(path))
  renameSync(path, existsSync(dest) ? `${dest}.${Date.now()}` : dest)
}

/** Import one file. Zips are unpacked and each entry imported. */
export async function importFile(path: string, displayName = basename(path)): Promise<ImportResult[]> {
  const bytes = readFileSync(path)
  if (/\.zip$/i.test(displayName)) {
    const dir = mkdtempSync(join(tmpdir(), 'halolabs-zip-'))
    try {
      await run('unzip', ['-q', '-o', path, '-d', dir])
      const results = await importTree(dir, displayName)
      rmSync(path)
      return results
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const prior = findImport(sha256)
  if (prior?.status === 'imported') {
    rmSync(path)
    return [{ file: displayName, status: 'duplicate', detail: `same file already imported on ${prior.imported_at}` }]
  }

  let importer: Importer | undefined
  try {
    const f = await sniff(path, displayName, bytes)
    importer = IMPORTERS.find(i => i.detect(f))
    if (!importer) {
      logImport({ sha256, name: displayName, status: 'unrecognized', detail: 'No importer recognizes this file' })
      moveAside(path, '_unrecognized')
      return [{ file: displayName, status: 'unrecognized', detail: 'Not a format Halo Labs knows yet' }]
    }
    const rows = await importer.parse(f)
    const records = upsertRecords(rows)
    const archiveDir = join(ROOT, 'data', 'imports', importer.source)
    mkdirSync(archiveDir, { recursive: true, mode: 0o700 })
    // Named by date and hash only; the original name is kept (encrypted) in the import log.
    const archivedAs = join(archiveDir, `${new Date().toISOString().slice(0, 10)}-${sha256.slice(0, 16)}.${f.ext || 'bin'}.enc`)
    writeFileSync(archivedAs, sealBytes(bytes), { mode: 0o600 })
    rmSync(path)
    logImport({ sha256, name: displayName, source: importer.source, importer: importer.id, status: 'imported', records, archivedAs: relative(ROOT, archivedAs) })
    return [{ file: displayName, status: 'imported', importer: importer.label, records }]
  } catch (e) {
    const detail = String((e as Error).message ?? e)
    logImport({ sha256, name: displayName, source: importer?.source, importer: importer?.id, status: 'failed', detail })
    if (existsSync(path)) moveAside(path, '_failed')
    return [{ file: displayName, status: 'failed', importer: importer?.label, detail }]
  }
}

async function importTree(dir: string, label: string): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (const name of readdirSync(dir).sort()) {
    if (SKIP(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) results.push(...(await importTree(path, `${label}/${name}`)))
    else results.push(...(await importFile(path, `${label}/${name}`)))
  }
  return results
}

let scanning: Promise<ImportResult[]> | null = null

/** Import everything waiting in the inbox (except the _unrecognized/_failed holding folders). */
export function scanInbox(): Promise<ImportResult[]> {
  scanning ??= (async () => {
    const results: ImportResult[] = []
    const walk = async (dir: string) => {
      for (const name of readdirSync(dir).sort()) {
        if (SKIP(name) || (dir === inboxDir() && name.startsWith('_'))) continue
        const path = join(dir, name), st = statSync(path)
        if (st.isDirectory()) {
          await walk(path)
          if (readdirSync(path).filter(n => !SKIP(n)).length === 0) rmSync(path, { recursive: true, force: true })
        } else if (Date.now() - st.mtimeMs > SETTLE_MS) {
          results.push(...(await importFile(path, relative(inboxDir(), path))))
        }
      }
    }
    await walk(inboxDir())
    for (const r of results) console.log(`import ${r.status}: ${r.file}${r.records ? ` (${r.records} records)` : ''}${r.detail ? ` - ${r.detail}` : ''}`)
    return results
  })().finally(() => { scanning = null })
  return scanning
}

/** Save an uploaded file into the inbox and import it right away. */
/** ".xlsx", ".zip", ".pdf", ".json", ".csv" or ".txt" from the first bytes. */
function sniffExt(bytes: Buffer) {
  if (bytes.subarray(0, 4).toString('latin1') === 'PK\x03\x04') return bytes.includes('xl/workbook') ? '.xlsx' : '.zip'
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return '.pdf'
  const head = bytes.subarray(0, 2000).toString('utf8').replace(/^\uFEFF/, '').trimStart()
  if (/^[[{]/.test(head)) return '.json'
  if (/^#\s/.test(head)) return '.md'
  return head.split('\n')[0].split(',').length >= 3 ? '.csv' : '.txt'
}

export async function importUpload(name: string, bytes: Buffer): Promise<ImportResult[]> {
  let safe = basename(name).replace(/[^\w .()+-]/g, '_') || 'upload'
  // Files shared from an iPhone Shortcut can arrive without an extension: name it by its content.
  if (!/\.(csv|json|xlsx|pdf|zip|md|markdown|txt)$/i.test(safe)) safe += sniffExt(bytes)
  const dir = mkdtempSync(join(inboxDir(), 'upload-'))
  const path = join(dir, safe)
  writeFileSync(path, bytes, { mode: 0o600 })
  try {
    return await importFile(path, safe)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function startInboxWatcher(everyMs = 30_000) {
  const tick = () => scanInbox().catch(e => console.error('inbox scan failed:', e))
  setTimeout(tick, 3000)
  setInterval(tick, everyMs)
}
