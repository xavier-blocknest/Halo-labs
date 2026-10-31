// Coach memory:
// - Every chat/voice exchange is kept (coach/turn, encrypted). Optional: with OLLAMA_URL set (a local Ollama running
//   nomic-embed-text), each exchange also gets an embedding, so a new question recalls the most relevant past
//   exchanges (RAG). Without it, memory works from the notes alone.
// - A short list of lasting notes (coach/note: injuries, preferences, decisions, goals, follow-ups) goes into every
//   answer. The coach updates them after a conversation goes quiet, or right away when the athlete says
//   "remember…"/"forget…". The athlete can see, edit and delete them in Settings → Coach memory.
import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'node:crypto'
import { deleteKind, deleteRecord, getSecret, getState, readRecords, setSecret, upsertRecords } from './db.ts'
import { today } from './dashboard/time.ts'
import { TZ } from './model.ts'

const OLLAMA = process.env.OLLAMA_URL ?? ''
const EMBED_MODEL = process.env.HALO_EMBED_MODEL ?? 'nomic-embed-text'
// nomic-embed-text cosine scores on this history: related exchanges ~0.66+, unrelated ~0.55-0.62.
const MIN_SCORE = 0.64
const NEAR_BEST = 0.08 // also keep only matches close to the best one
const RECALL = 5
const QUIET_MS = 8 * 60_000 // update notes once a conversation has been quiet this long

export const NOTE_KINDS = ['injury', 'preference', 'decision', 'goal', 'follow-up', 'fact'] as const
export type NoteKind = (typeof NOTE_KINDS)[number]
/** vec: base64 float32 embedding; null = not embedded yet; '' = small talk, kept but never recalled. */
export type Turn = { at: string; page: string; q: string; a: string; vec: string | null }
export type Note = { text: string; kind: NoteKind; created: string; updated: string; source: 'auto' | 'user' }

// ---- embeddings -------------------------------------------------------------------------------------------

const toB64 = (v: Float32Array) => Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('base64')
const fromB64 = (s: string) => new Float32Array(Uint8Array.from(Buffer.from(s, 'base64')).buffer)
const unit = (v: number[]) => { const n = Math.hypot(...v) || 1; return Float32Array.from(v, x => x / n) }
const dot = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

let embedOk: boolean | null = null
/** Unit vectors for the texts, or null if the local model isn't reachable (memory then works without recall). */
async function embed(texts: string[], mode: 'query' | 'document'): Promise<Float32Array[] | null> {
  if (!OLLAMA) { embedOk = null; return null } // recall is off unless a local embedding model is configured
  try {
    const r = await fetch(`${OLLAMA}/api/embed`, {
      method: 'POST', signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ model: EMBED_MODEL, input: texts.map(t => `search_${mode}: ${t.slice(0, 2000)}`), keep_alive: -1, options: { num_gpu: 0 } }),
    })
    if (!r.ok) throw new Error(`embed ${r.status}`)
    const j = await r.json() as { embeddings: number[][] }
    embedOk = true
    return j.embeddings.map(unit)
  } catch (e) {
    if (embedOk !== false) console.warn('memory: embeddings unavailable:', (e as Error).message)
    embedOk = false
    return null
  }
}
export const embedStatus = () => embedOk

// ---- turns (conversation history) ----------------------------------------------------------------------

type Cached = { id: string; at: string; page: string; q: string; a: string; v: Float32Array | null; skip: boolean }
/** "Okay, thank you." or "Hello." carries nothing worth recalling (and the long answer it got would match anything). */
const smallTalk = (q: string) => { const w = q.trim().split(/\s+/).length
  return w < 3 || (w <= 6 && /^(hi|hello|hey|yo|thanks?|thank you|ok(ay)?|cool|great|nice|perfect|got it|sounds good|good (morning|afternoon|evening|night)|bye|how'?s it going|how are (we|you)( doing)?)\b/i.test(q.trim())) }
let cache: Cached[] | null = null
const turns = () => (cache ??= readRecords<Turn>('coach', 'turn').map(r => ({ id: r.id, at: r.data.at, page: r.data.page, q: r.data.q, a: r.data.a, v: r.data.vec ? fromB64(r.data.vec) : null, skip: r.data.vec === '' || smallTalk(r.data.q) }))
  .sort((a, b) => a.at.localeCompare(b.at)))
const turnText = (q: string, a: string) => `Athlete: ${q}\nCoach: ${a}`

export async function saveTurn(q: string, a: string, page: string, at = new Date().toISOString()) {
  const small = smallTalk(q), [v] = small ? [null] : (await embed([turnText(q, a)], 'document')) ?? [null]
  const id = `${at}-${randomBytes(3).toString('hex')}`
  upsertRecords([{ source: 'coach', kind: 'turn', id, day: today(), data: { at, page, q, a, vec: small ? '' : v ? toB64(v) : null } satisfies Turn }])
  cache = null
  scheduleNotes(q)
}

/** Past exchanges relevant to the question, oldest first, skipping ones still in the visible conversation. */
export async function recall(question: string, skip: Set<string>, k = RECALL) {
  const list = turns().filter(t => t.v && !t.skip && !skip.has(t.q.trim()))
  if (!list.length) return []
  const [qv] = (await embed([question], 'query')) ?? [null]
  if (!qv) return []
  const now = Date.now()
  const scored = list.map(t => ({ t, s: dot(qv, t.v!) + 0.03 * Math.exp(-(now - Date.parse(t.at)) / (30 * 864e5)) })).sort((a, b) => b.s - a.s)
  const best = scored[0]?.s ?? 0
  return scored.filter(x => x.s >= MIN_SCORE && x.s >= best - NEAR_BEST).slice(0, k)
    .sort((a, b) => a.t.at.localeCompare(b.t.at)).map(x => ({ ...x.t, score: Math.round(x.s * 100) / 100 }))
}

/** Re-embed turns saved while the local model was down. */
export async function backfillEmbeddings() {
  const missing = turns().filter(t => !t.v && !t.skip)
  for (let i = 0; i < missing.length; i += 32) {
    const batch = missing.slice(i, i + 32), vs = await embed(batch.map(t => turnText(t.q, t.a)), 'document')
    if (!vs) return
    upsertRecords(batch.map((t, j) => ({ source: 'coach', kind: 'turn', id: t.id, day: t.at.slice(0, 10), data: { vec: toB64(vs[j]) } })))
  }
  if (missing.length) { cache = null; console.log(`memory: embedded ${missing.length} earlier turns`) }
}

/** First run: the chat history the app already had (shared state im4-chat) becomes the start of the memory. */
export async function seedFromChat() {
  if (turns().length) return
  let msgs: { role: string; content: string; page?: string; err?: boolean }[] = []
  try { msgs = JSON.parse(getState()['im4-chat'] ?? '[]') } catch { return }
  const pairs: { q: string; a: string; page: string }[] = []
  for (let i = 0; i < msgs.length - 1; i++)
    if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant' && !msgs[i + 1].err) pairs.push({ q: msgs[i].content, a: msgs[i + 1].content, page: msgs[i].page ?? '' })
  if (!pairs.length) return
  const vs = await embed(pairs.map(p => turnText(p.q, p.a)), 'document')
  const base = Date.now() - pairs.length * 60_000
  upsertRecords(pairs.map((p, i) => { const at = new Date(base + i * 60_000).toISOString()
    return { source: 'coach', kind: 'turn', id: `${at}-seed${i}`, day: at.slice(0, 10), data: { at, page: p.page, q: p.q, a: p.a, vec: vs ? toB64(vs[i]) : null } } }))
  cache = null
  console.log(`memory: started from ${pairs.length} earlier chat exchanges`)
  scheduleNotes('', 30_000)
}

export function forgetHistory() {
  const n = deleteKind('coach', 'turn'); cache = null
  setSecret('coach:memory', { cursor: new Date().toISOString() })
  return n
}

// ---- notes ------------------------------------------------------------------------------------------------

export const listNotes = () => readRecords<Note>('coach', 'note').map(r => ({ id: r.id, ...r.data }))
  .sort((a, b) => NOTE_KINDS.indexOf(a.kind) - NOTE_KINDS.indexOf(b.kind) || b.updated.localeCompare(a.updated))

export function putNote(id: string | null, text: string, kind: NoteKind, source: Note['source']) {
  const now = new Date().toISOString(), prev = id ? listNotes().find(n => n.id === id) : undefined
  const nid = id ?? randomBytes(6).toString('hex')
  upsertRecords([{ source: 'coach', kind: 'note', id: nid, day: null, data: { text: text.trim().slice(0, 300), kind, created: prev?.created ?? now, updated: now, source: prev?.source ?? source } satisfies Note }])
  return nid
}
export const removeNote = (id: string) => deleteRecord('coach', 'note', id) > 0

// ---- the memory block that goes into the coach's system prompt ------------------------------------------

const short = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })

export async function memoryBlock(question: string, recentUserTexts: string[]) {
  const notes = listNotes(), past = await recall(question, new Set(recentUserTexts.map(t => t.trim())))
  if (!notes.length && !past.length) return ''
  const lines = ['COACH MEMORY (from earlier conversations with the athlete; the data above is newer if they conflict; use it when relevant, don\'t recite it):']
  if (notes.length) lines.push('Lasting notes:', ...notes.map(n => `- [${n.kind}, ${short(n.updated)}] ${n.text}`))
  if (past.length) lines.push('Relevant past exchanges:', ...past.map(t => `[${short(t.at)}${t.page ? ', ' + t.page : ''}] Athlete: ${t.q.slice(0, 300)}\nCoach: ${t.a.slice(0, 500)}`))
  return lines.join('\n')
}

// ---- keeping the notes up to date ----------------------------------------------------------------------

let client: Anthropic | null = null, model = ''
export function initMemory(c: Anthropic | null, m: string) { client = c; model = m }

let timer: NodeJS.Timeout | null = null
function scheduleNotes(q: string, ms = QUIET_MS) {
  if (timer) clearTimeout(timer)
  const now = /\b(remember|don'?t forget|note that|keep in mind|forget)\b/i.test(q)
  timer = setTimeout(() => { timer = null; updateNotes().catch(e => console.error('memory: note update failed:', e)) }, now ? 500 : ms)
}

const NOTES_PROMPT = `You maintain the long-term memory notes of a personal endurance/strength coach. Read the new conversation turns and the current notes, then decide what to change.

Keep only things that will still matter in weeks: injuries and pain (with side and since when), health conditions, food and training preferences or dislikes, decisions and commitments, goals and targets, equipment, schedule constraints, and things to follow up on. Do NOT store numbers the dashboard already tracks (recovery, HRV, sleep, weights, lab values, workouts) or one-off small talk.
- If the athlete says "remember …", store it. If they say something is resolved or ask to forget it, remove or update that note.
- Merge duplicates; update a note rather than adding a near-copy. Each note: one plain sentence, max 25 words, written about the athlete ("Left knee sore after long runs since Oct 12").
- Kinds: injury, preference, decision, goal, follow-up, fact.
Return ONLY JSON: {"add":[{"kind":"…","text":"…"}],"update":[{"id":"…","kind":"…","text":"…"}],"remove":["id"]}. Use empty arrays when nothing changes.`

export async function updateNotes() {
  if (!client) return
  const state = getSecret<{ cursor: string }>('coach:memory') ?? { cursor: '' }
  const fresh = turns().filter(t => t.at > state.cursor).slice(-30)
  if (!fresh.length) return
  const notes = listNotes()
  const input = `Current notes:\n${notes.length ? notes.map(n => `${n.id} [${n.kind}] ${n.text}`).join('\n') : '(none)'}\n\nNew conversation turns:\n` +
    fresh.map(t => `[${short(t.at)}] Athlete: ${t.q}\nCoach: ${t.a}`).join('\n\n')
  const r = await client.beta.messages.create({ model, max_tokens: 4000, output_config: { effort: 'low' }, system: NOTES_PROMPT, messages: [{ role: 'user', content: input }] })
  const text = r.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('')
  let ops: { add?: { kind: string; text: string }[]; update?: { id: string; kind?: string; text: string }[]; remove?: string[] }
  try { ops = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch { console.warn('memory: note update was not JSON'); return }
  const kind = (k: string | undefined, d: NoteKind): NoteKind => (NOTE_KINDS as readonly string[]).includes(k ?? '') ? k as NoteKind : d
  const ids = new Set(notes.map(n => n.id))
  for (const id of ops.remove ?? []) if (ids.has(id)) removeNote(id)
  for (const u of ops.update ?? []) { const n = notes.find(x => x.id === u.id); if (n && u.text?.trim()) putNote(n.id, u.text, kind(u.kind, n.kind), 'auto') }
  for (const a of ops.add ?? []) if (a.text?.trim()) putNote(null, a.text, kind(a.kind, 'fact'), 'auto')
  setSecret('coach:memory', { cursor: fresh.at(-1)!.at })
  const n = (ops.add?.length ?? 0) + (ops.update?.length ?? 0) + (ops.remove?.length ?? 0)
  if (n) console.log(`memory: notes updated (+${ops.add?.length ?? 0} ~${ops.update?.length ?? 0} -${ops.remove?.length ?? 0})`)
}

export const historyStats = () => { const t = turns(); return { turns: t.length, first: t[0]?.at ?? null, last: t.at(-1)?.at ?? null, embedded: t.filter(x => x.v).length } }
