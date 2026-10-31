// Journal: the athlete's own entries and documents he pastes in (letters from his doctor, …), stored encrypted as
// journal/entry records. "Format as document" sends one entry's text to Claude, which returns a title, sender, tags,
// a TL;DR and the text split into sections; the sections must be the document's own wording (checked below), so a
// formatted letter never says something the original didn't. Only that entry's text leaves the machine.
import type Anthropic from '@anthropic-ai/sdk'
import { deleteRecord, readRecords, upsertRecords } from './db.ts'
import type { JournalBlock, JournalEntry } from './model.ts'

export const JOURNAL_ID = /^[a-z0-9-]{4,40}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_TEXT = 60_000

export function journalEntries() {
  return readRecords<JournalEntry>('journal', 'entry')
    .map(r => ({ id: r.id, ...r.data }))
    .sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')) || b.updated.localeCompare(a.updated))
}

const find = (id: string) => journalEntries().find(e => e.id === id) ?? null

/** Create or update an entry from the page. A changed body drops an old formatting (it no longer matches). */
export function saveEntry(id: string, input: Partial<JournalEntry>) {
  const prev = find(id)
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
  const date = typeof input.date === 'string' && DAY.test(input.date) ? input.date : prev?.date
  if (!date) throw new Error('An entry needs a date.')
  const body = text(input.body, MAX_TEXT) ?? prev?.body ?? ''
  const entry: JournalEntry = {
    date, time: text(input.time, 20) ?? prev?.time ?? null,
    title: text(input.title, 300) ?? prev?.title ?? '', body, note: text(input.note, MAX_TEXT) ?? prev?.note ?? '',
    doc: prev?.doc && body === prev.body ? prev.doc : null, updated: new Date().toISOString(),
  }
  // The merge keeps fields a row leaves null; an explicit null doc must win, so write it whole.
  if (prev) deleteRecord('journal', 'entry', id)
  upsertRecords([{ source: 'journal', kind: 'entry', id, day: date, data: entry }])
  return { id, ...entry }
}

export const deleteEntry = (id: string) => deleteRecord('journal', 'entry', id)

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'from', 'date', 'tags', 'tldr', 'blocks'],
  properties: {
    title: { type: 'string' }, from: { type: 'string' }, date: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    tldr: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['k', 'v'], properties: { k: { type: 'string' }, v: { type: 'string' } } } },
    blocks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type', 't', 'lead'],
      properties: { type: { type: 'string', enum: ['h', 'p', 'sig'] }, t: { type: 'string' }, lead: { type: 'string' } } } },
  },
} as const

const SYSTEM = `You format a document the athlete pasted into his training journal, usually a letter from his doctor or another clinician. Return the JSON the schema asks for.

blocks: the document's full text, in order and word for word, split into headings (type "h"), paragraphs ("p") and the closing sign-off and contact details ("sig", keep its line breaks as \\n). Never reword, shorten, merge or drop anything. When a paragraph opens with a run-in label such as "Hydration:", put the label in lead and the rest in t; otherwise lead is "".
title: the document's subject line or heading; if it has none, a short plain description (under 10 words).
from: the sender's name and organization as written in the document.
date: the date the document gives for itself as YYYY-MM-DD, or "" if it gives none.
tags: 1 to 4 short topic labels, one or two words each (for example Doctor, Labs, Supplements, Nutrition).
tldr: 3 to 6 points. k is a one-word label ending in a colon (for example Progress:, Goals:, Diet:, Supplements:, Next:). v is one sentence that uses only facts and numbers stated in the document.`

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The share of the original's words that the blocks reproduce verbatim, and whether every block is verbatim. */
function faithful(body: string, blocks: JournalBlock[]) {
  const src = norm(body)
  const parts = blocks.map(b => norm(`${b.lead ?? ''} ${b.t}`)).filter(Boolean)
  const verbatim = parts.filter(p => src.includes(p))
  return { allVerbatim: verbatim.length === parts.length, coverage: verbatim.join(' ').length / Math.max(1, src.length) }
}

export async function formatEntry(client: Anthropic, model: string, id: string) {
  const e = find(id)
  if (!e) throw new Error('No such entry.')
  if (e.body.trim().length < 80) throw new Error('Paste the full document first.')
  const res = await client.beta.messages.create({
    model, max_tokens: 16000, output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    system: SYSTEM, messages: [{ role: 'user', content: e.body }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming)
  if (res.stop_reason === 'refusal') throw new Error("Claude couldn't format this one.")
  if (res.stop_reason === 'max_tokens') throw new Error('The document is too long to format in one go.')
  const text = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
  const out = JSON.parse(text) as { title: string; from: string; date: string; tags: string[]; tldr: { k: string; v: string }[]; blocks: JournalBlock[] }
  const blocks = out.blocks.map(b => ({ type: b.type, t: b.t, ...(b.lead ? { lead: b.lead } : {}) }))
  const f = faithful(e.body, blocks)
  if (!f.allVerbatim || f.coverage < 0.95) throw new Error("The formatted version didn't match the original word for word, so it wasn't saved. Try again.")
  const { id: _same, ...prev } = e
  const entry: JournalEntry = {
    ...prev, title: e.title.trim() || out.title.trim(), date: DAY.test(out.date) && !e.title.trim() ? out.date : e.date,
    doc: { from: out.from.trim(), tags: out.tags.slice(0, 4), tldr: out.tldr.slice(0, 6), blocks }, updated: new Date().toISOString(),
  }
  deleteRecord('journal', 'entry', id)
  upsertRecords([{ source: 'journal', kind: 'entry', id, day: entry.date, data: entry }])
  return { id, ...entry }
}
