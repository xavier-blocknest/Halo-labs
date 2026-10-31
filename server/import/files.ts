// File sniffing shared by the importers: each importer recognizes files by content, not by name.
import ExcelJS from 'exceljs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { RecordRow, Source } from '../db.ts'

const run = promisify(execFile)

export type Sniffed = {
  name: string
  path: string
  ext: string
  bytes: Buffer
  csv?: { header: string[]; rows: string[][] }
  json?: unknown
  pdfText?: string
  sheets?: string[]
  text?: string
}

export type Importer = {
  id: string
  source: Source
  label: string
  detect(f: Sniffed): boolean
  parse(f: Sniffed): Promise<RecordRow[]> | RecordRow[]
}

export async function sniff(path: string, name: string, bytes: Buffer): Promise<Sniffed> {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()
  const f: Sniffed = { name, path, ext, bytes }
  if (ext === 'csv') {
    const rows = parseCsv(bytes.toString('utf8').replace(/^﻿/, ''))
    f.csv = { header: rows[0] ?? [], rows: rows.slice(1).filter(r => r.some(c => c !== '')) }
  } else if (ext === 'md' || ext === 'txt' || ext === 'markdown') {
    f.text = bytes.toString('utf8').replace(/^\uFEFF/, '')
  } else if (ext === 'json') {
    try { f.json = JSON.parse(bytes.toString('utf8')) } catch { /* not JSON after all */ }
  } else if (ext === 'xlsx') {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(bytes as unknown as ArrayBuffer)
    f.sheets = wb.worksheets.map(w => w.name)
  } else if (ext === 'pdf') {
    const { stdout } = await run('pdftotext', ['-layout', path, '-'], { maxBuffer: 50 * 1024 * 1024 })
    f.pdfText = stdout
  }
  return f
}

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** Column accessor by header name. `nth` picks among duplicate headers (Strava repeats some). */
export function columns(header: string[]) {
  const idx = new Map<string, number[]>()
  header.forEach((h, i) => idx.set(h.trim(), [...(idx.get(h.trim()) ?? []), i]))
  return (row: string[], name: string, nth = 0): string | null => {
    const i = idx.get(name)?.[nth]
    const v = i === undefined ? undefined : row[i]?.trim()
    return v === undefined || v === '' ? null : v
  }
}

export const hasColumns = (f: Sniffed, ...names: string[]) => !!f.csv && names.every(n => f.csv!.header.some(h => h.trim() === n))
