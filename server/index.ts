// Halo Labs server: serves the app, stores data encrypted in SQLite, syncs WHOOP and Strava, runs the coach.
// Runs in Docker on the owner's Mac (docker-compose.yml publishes it on 127.0.0.1:8787 only).
// Run: node server/index.ts   (Node 24 runs TypeScript directly)
import Anthropic from '@anthropic-ai/sdk'
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib'
import { AuthError, deletePasskey, resetPasskeys, initAuth, listPasskeys, loginOptions, loginVerify, logout, ping, registerOptions, registerVerify, session, setIdleMinutes, status } from './auth.ts'
import { loadKey } from './crypto.ts'
import { backupStatus, runBackup, startBackups } from './backup.ts'
import { backfillEmbeddings, embedStatus, forgetHistory, historyStats, initMemory, listNotes, memoryBlock, NOTE_KINDS, putNote, removeNote, saveTurn, seedFromChat, type NoteKind } from './memory.ts'
import { checkUploadToken, createUploadToken, listUploadTokens, revokeUploadToken, throttled } from './uploadTokens.ts'
import { verifyKey, wipeData, deleteSource, getSecret, setSecret, upsertRecords, getState, lastError, lastRuns, openDb, recentImports, setState, sourceSummary } from './db.ts'
import { dashboard } from './dashboard/index.ts'
import { buildSessions, SOURCE_CHOICES, SOURCE_SPORTS, SOURCES_KEY, sourcePrefs, type SourcePrefs } from './dashboard/sessions.ts'
import { parseWhen, roadmapDoc, roadmapEdits, SCHEDULE_DAYS, STATUSES, type MilestoneEdit, type RoadmapEdits } from './dashboard/plan.ts'
import { today } from './dashboard/time.ts'
import { deleteEntry, formatEntry, JOURNAL_ID, journalEntries, saveEntry } from './journal.ts'
import { SAVE_WEEK_PLAN_TOOL, saveWeekPlan } from './weekPlan.ts'
import { importUpload, initImports, scanInbox, startInboxWatcher } from './import/index.ts'
import { authorizeUrl, disconnect, handleCallback, isConfigured, isConnected, onLocalhost, publicUrl, redirectUri, type Provider } from './oauth.ts'
import { isSyncing, startScheduler, syncIfStale, syncNow } from './sync.ts'
import { listSettings, onSettingsChange, saveSettings, setting } from './settings.ts'
import { applyUpdate, checkForUpdate, startUpdateChecks, updateStatus } from './update.ts'
import { TZ } from './model.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
process.umask(0o077) // health data: every file the server creates is readable by this user only
const ENV = join(ROOT, '.env')
if (existsSync(ENV)) process.loadEnvFile(ENV)
loadKey(ENV, join(ROOT, 'data', 'halolabs.db'))

const PORT = Number(process.env.PORT ?? 8787)
// Docker sets HOST=0.0.0.0 inside the container; the compose file only publishes the port on the Mac's loopback.
const HOST = process.env.HOST ?? '127.0.0.1'
const DIST = join(ROOT, 'dist')
const COACH_MODEL = 'claude-sonnet-5-5'
const MAX_BODY = 1_000_000
const MAX_UPLOAD = 200_000_000
// Speech-to-text and the coach's voice: ElevenLabs (key and voice in Settings → APIs).
const ELEVEN_URL = process.env.ELEVENLABS_URL ?? 'https://api.elevenlabs.io'
const ELEVEN_STT_MODEL = process.env.ELEVENLABS_STT_MODEL ?? 'scribe_v1'
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5'
const MAX_AUDIO = 10_000_000 // ~5 minutes of 16 kHz mono WAV
const PROVIDERS: Provider[] = ['whoop', 'strava']

mkdirSync(join(ROOT, 'data'), { recursive: true, mode: 0o700 })
openDb(join(ROOT, 'data', 'halolabs.db'))
verifyKey()
initImports(ROOT)
initAuth(join(ROOT, 'data'))
const STATE_KEY = /^im[34]-[a-z]+$/

// The coach client follows the key in Settings → APIs (or .env); rebuilt whenever settings change.
let coach: Anthropic | null = null
const buildCoach = () => {
  const key = setting('ANTHROPIC_API_KEY')
  coach = key ? new Anthropic({ apiKey: key }) : null
  initMemory(coach, COACH_MODEL)
}
onSettingsChange(buildCoach)
const NO_KEY = 'Coach is offline: add your Claude API key in Settings → APIs.'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

function redirect(res: ServerResponse, to: string) {
  res.writeHead(302, { Location: to, 'Cache-Control': 'no-store' })
  res.end()
}

async function readBytes(req: IncomingMessage, limit: number): Promise<Buffer> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

const readBody = async (req: IncomingMessage) => (await readBytes(req, MAX_BODY)).toString('utf8')

const isProvider = (p: string | undefined): p is Provider => PROVIDERS.includes(p as Provider)

const REFUSED = "I can't help with that one. Try asking another way."

/** POST /api/complete. With stream: true the reply arrives as NDJSON while Claude writes it ({"d": text} per chunk,
 *  then {"done": true, "text": full} or {"error": message}), so voice can start speaking after the first sentence. */
async function complete(req: IncomingMessage, res: ServerResponse) {
  if (!coach) return send(res, 503, { error: NO_KEY })
  const { system, messages, memory, page, stream, quick } = JSON.parse(await readBody(req)) as { system?: string; messages: Anthropic.Beta.BetaMessageParam[]; memory?: boolean; page?: string; stream?: boolean; quick?: boolean }
  // Chat and voice ask for memory: lasting notes + relevant past exchanges go into the system prompt, and the
  // exchange is saved afterwards. (The morning brief doesn't use it.)
  const textOf = (m: Anthropic.Beta.BetaMessageParam) => (typeof m.content === 'string' ? m.content : '')
  const q = memory ? textOf(messages.at(-1) ?? { role: 'user', content: '' }) : ''
  const block = memory && q ? await memoryBlock(q, messages.filter(m => m.role === 'user').map(textOf)).catch(e => (console.error('memory:', e), '')) : ''
  const params = {
    model: COACH_MODEL,
    max_tokens: 16000, // thinking counts toward this; the prompts keep replies short
    output_config: { effort: 'low' as const },
    // Voice (quick): no thinking, so the first words arrive in ~0.8 s instead of ~3 s.
    ...(quick ? { thinking: { type: 'between_tools' as const } } : {}),
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default' as const,
    system: block ? `${system ?? ''}\n\n${block}` : system,
    messages: messages.slice(-12),
  }
  const textOfReply = (m: Anthropic.Beta.BetaMessage) => m.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim()
  const save = (text: string) => { if (memory && q && text) setTimeout(() => saveTurn(q, text, String(page ?? '').slice(0, 40)).catch(e => console.error('memory: save failed:', e)), 2_000) }
  // Chat and voice can save week plans (save_week_plan): run the tool, hand the result back, let the coach finish.
  const tools = memory ? [SAVE_WEEK_PLAN_TOOL] : undefined
  const runTools = (m: Anthropic.Beta.BetaMessage, onSaved: (start: string) => void): Anthropic.Beta.BetaToolResultBlockParam[] =>
    m.content.flatMap(b => {
      if (b.type !== 'tool_use') return []
      if (b.name !== 'save_week_plan') return [{ type: 'tool_result' as const, tool_use_id: b.id, is_error: true, content: `Unknown tool ${b.name}` }]
      try {
        const plan = saveWeekPlan(b.input as Record<string, unknown>, 'coach'); onSaved(plan.start)
        console.log(`coach: saved week ${plan.start} (${Object.keys(plan.days).length} days, ${Object.values(plan.days).flat().length} sessions)`)
        return [{ type: 'tool_result' as const, tool_use_id: b.id, content: `Saved the week of ${plan.start} (${Object.keys(plan.days).length} days planned). It now shows on the Week page.` }]
      } catch (e) { console.log(`coach: week plan rejected: ${(e as Error).message}`); return [{ type: 'tool_result' as const, tool_use_id: b.id, is_error: true, content: (e as Error).message }] }
    })
  let convo = params.messages
  const parts: string[] = []
  try {
    if (stream) {
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
      for (let turn = 0; ; turn++) {
        if (parts.length) res.write(JSON.stringify({ d: '\n\n' }) + '\n') // the text after a tool call starts a new paragraph
        const s = coach.beta.messages.stream({ ...params, messages: convo, ...(tools ? { tools } : {}) })
        s.on('text', d => { res.write(JSON.stringify({ d }) + '\n') })
        const m = await s.finalMessage()
        // A refusal after the fallback chain: the client replaces whatever partial text it showed.
        if (m.stop_reason === 'refusal') { res.end(JSON.stringify({ done: true, text: REFUSED, refusal: true }) + '\n'); return }
        const t = textOfReply(m); if (t) parts.push(t)
        if (m.stop_reason !== 'tool_use' || turn >= 3) break
        const results = runTools(m, start => res.write(JSON.stringify({ plan: start }) + '\n'))
        convo = [...convo, { role: 'assistant', content: m.content }, { role: 'user', content: results }]
      }
      const text = parts.join('\n\n')
      res.end(JSON.stringify({ done: true, text }) + '\n')
      save(text)
      return
    }
    for (let turn = 0; ; turn++) {
      const m = await coach.beta.messages.create({ ...params, messages: convo, ...(tools ? { tools } : {}) })
      if (m.stop_reason === 'refusal') return send(res, 200, { text: REFUSED })
      const t = textOfReply(m); if (t) parts.push(t)
      if (m.stop_reason !== 'tool_use' || turn >= 3) break
      convo = [...convo, { role: 'assistant', content: m.content }, { role: 'user', content: runTools(m, () => {}) }]
    }
    const text = parts.join('\n\n')
    send(res, 200, { text })
    save(text)
  } catch (error) {
    const msg = error instanceof Anthropic.AuthenticationError ? 'Claude rejected the API key: check it in Settings → APIs.'
      : error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message) ? 'The Anthropic account has no API credits. Add credits under Plans & Billing in the Claude Console.'
      : error instanceof Anthropic.RateLimitError ? 'Coach is rate limited, try again shortly'
      : error instanceof Anthropic.APIError ? `Coach error ${error.status}` : null
    if (res.headersSent) { console.error('complete (stream):', msg ?? error); return res.end(JSON.stringify({ error: msg ?? 'Coach stopped unexpectedly' }) + '\n') }
    if (!msg) throw error
    return send(res, error instanceof Anthropic.AuthenticationError || /credits/.test(msg) ? 503 : error instanceof Anthropic.RateLimitError ? 429 : 502, { error: msg })
  }
}

/** POST /api/transcribe: a WAV from the browser -> ElevenLabs speech-to-text -> { text }. */
async function transcribe(req: IncomingMessage, res: ServerResponse) {
  const key = setting('ELEVENLABS_API_KEY')
  if (!key) return send(res, 503, { error: 'Voice needs an ElevenLabs API key: add it in Settings → APIs.' })
  const wav = await readBytes(req, MAX_AUDIO)
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'speech.wav')
  form.append('model_id', ELEVEN_STT_MODEL)
  form.append('language_code', 'en')
  form.append('tag_audio_events', 'false')
  let r: Response
  try { r = await fetch(`${ELEVEN_URL}/v1/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': key }, body: form, signal: AbortSignal.timeout(60_000) }) }
  catch { return send(res, 502, { error: 'ElevenLabs speech-to-text didn\'t answer.' }) }
  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    const why = `ElevenLabs speech-to-text ${r.status}: ` + (/"message":"([^"]+)"/.exec(detail)?.[1] ?? detail.slice(0, 160))
    console.error('transcribe:', why)
    return send(res, 502, { error: why })
  }
  const text = String(((await r.json()) as { text?: string }).text ?? '')
    .replace(/\[[^\]]*\]|\((?:music|silence|inaudible)\)/gi, '').replace(/\s+/g, ' ').trim()
  send(res, 200, { text })
}

// Coach voice: ElevenLabs text-to-speech (only the reply text is sent). After an ElevenLabs refusal (no credits,
// bad key) it pauses for 10 minutes and the browser falls back to the device voice.
let ttsPausedUntil = 0, ttsWhy = ''
const ttsReady = () => !!(setting('ELEVENLABS_API_KEY') && setting('ELEVENLABS_VOICE_ID')) && Date.now() > ttsPausedUntil
onSettingsChange(() => { ttsPausedUntil = 0; ttsWhy = '' })

async function tts(req: IncomingMessage, res: ServerResponse) {
  const body = JSON.parse(await readBody(req)) as { text?: string }
  const text = String(body.text ?? '').trim().slice(0, 2500)
  if (!text) return send(res, 400, { error: 'no text' })
  if (!ttsReady()) return send(res, 503, { error: ttsWhy || 'ElevenLabs isn\'t set up: add the API key and a voice ID in Settings → APIs.' })
  let r: Response
  try {
    r = await fetch(`${ELEVEN_URL}/v1/text-to-speech/${encodeURIComponent(setting('ELEVENLABS_VOICE_ID'))}/stream?output_format=mp3_44100_64`, {
      method: 'POST', headers: { 'xi-api-key': setting('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: ELEVEN_MODEL }), signal: AbortSignal.timeout(30_000) })
  } catch { return send(res, 502, { error: 'ElevenLabs didn\'t answer.' }) }
  if (!r.ok || !r.body) {
    const detail = await r.text().catch(() => '')
    ttsWhy = `ElevenLabs ${r.status}: ` + (/"message":"([^"]+)"/.exec(detail)?.[1] ?? detail.slice(0, 160))
    if ([401, 402, 403, 429].includes(r.status)) ttsPausedUntil = Date.now() + 10 * 60_000
    console.error('tts:', ttsWhy)
    return send(res, 502, { error: ttsWhy })
  }
  ttsWhy = ''
  res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' })
  const reader = r.body.getReader()
  for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value) }
  res.end()
}

/** Sample data for "Explore with sample data": server/sample.ts runs in its own process with a throwaway database
 *  (it never sees the real one, or its key, or any API key) and prints the dashboard. Cached for the day. */
let sample: { day: string; data: unknown } | null = null
async function sampleDashboard() {
  const day = new Date().toDateString()
  if (sample?.day === day) return sample.data
  const env = { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', TMPDIR: process.env.TMPDIR ?? '', HALO_TZ: TZ, HALO_NAME: setting('HALO_NAME') || 'Alex' }
  const out = await new Promise<string>((resolve, reject) => execFile(process.execPath, [join(ROOT, 'server', 'sample.ts')], { env, maxBuffer: 20e6, timeout: 60_000 },
    (err, stdout, stderr) => (err ? reject(new Error(`sample data: ${stderr.split('\n').filter(Boolean).at(-1) ?? err.message}`)) : resolve(stdout))))
  sample = { day, data: JSON.parse(out) }
  return sample.data
}

/** Settings → APIs: list (no secret values), save, and a quick check that a key works. */
async function settingsRoutes(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (url.pathname === '/api/settings' && req.method === 'GET') return send(res, 200, { settings: listSettings() })
  if (url.pathname === '/api/settings' && req.method === 'PUT') {
    try { saveSettings(JSON.parse(await readBody(req)) as Record<string, unknown>) } catch (e) { throw new AuthError((e as Error).message) }
    return send(res, 200, { settings: listSettings() })
  }
  if (url.pathname === '/api/settings/voices' && req.method === 'GET') {
    // The ElevenLabs voices this key can use, with ElevenLabs' public sample clips, for the voice picker.
    const key = setting('ELEVENLABS_API_KEY')
    if (!key) return send(res, 200, { voices: [], error: 'Save an ElevenLabs API key first.' })
    try {
      const r = await fetch(`${ELEVEN_URL}/v1/voices`, { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(15_000) })
      if (!r.ok) return send(res, 200, { voices: [], error: r.status === 401 ? 'ElevenLabs rejected the key (it needs Voices read access).' : `ElevenLabs error ${r.status}` })
      const j = await r.json() as { voices?: { voice_id: string; name: string; category?: string; preview_url?: string; labels?: Record<string, string> }[] }
      return send(res, 200, { voices: (j.voices ?? []).map(v => ({ id: v.voice_id, name: v.name, category: v.category ?? '', preview: v.preview_url ?? null,
        about: [v.labels?.gender, v.labels?.accent, v.labels?.description ?? v.labels?.descriptive].filter(Boolean).join(' · ') })) })
    } catch { return send(res, 200, { voices: [], error: 'ElevenLabs didn\'t answer.' }) }
  }
  const t = /^\/api\/settings\/test\/(claude|elevenlabs)$/.exec(url.pathname)
  if (t && req.method === 'POST') {
    try {
      if (t[1] === 'claude') {
        if (!coach) return send(res, 200, { ok: false, detail: 'No Claude API key saved.' })
        const m = await coach.models.retrieve(COACH_MODEL)
        return send(res, 200, { ok: true, detail: `Key works. Coach model: ${m.display_name ?? COACH_MODEL}.` })
      }
      const key = setting('ELEVENLABS_API_KEY')
      if (!key) return send(res, 200, { ok: false, detail: 'No ElevenLabs API key saved.' })
      const voice = setting('ELEVENLABS_VOICE_ID')
      const r = await fetch(`${ELEVEN_URL}/v1/voices/${encodeURIComponent(voice || 'none')}`, { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(15_000) })
      if (r.status === 401) return send(res, 200, { ok: false, detail: 'ElevenLabs rejected the key (or it lacks Voices read access).' })
      if (!voice) return send(res, 200, { ok: false, detail: 'Key saved. Add a voice ID too.' })
      if (!r.ok) return send(res, 200, { ok: false, detail: `ElevenLabs couldn't find voice ${voice} (${r.status}).` })
      const v = await r.json() as { name?: string }
      return send(res, 200, { ok: true, detail: `Key works. Voice: ${v.name ?? voice}.` })
    } catch (e) {
      const err = e as Error & { status?: number }
      return send(res, 200, { ok: false, detail: err instanceof Anthropic.AuthenticationError ? 'Claude rejected the key.' : `Check failed: ${err.status ?? ''} ${err.message}`.trim() })
    }
  }
  return send(res, 404, { error: 'not found' })
}

/** PUT /api/roadmap/edits: the whole edit set from the roadmap editor, validated field by field. */
async function saveRoadmapEdits(req: IncomingMessage, res: ServerResponse) {
  const body = JSON.parse(await readBody(req)) as Partial<RoadmapEdits>
  const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
  const text = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max
  const clean = (e: Record<string, unknown>): MilestoneEdit => {
    const out: MilestoneEdit = {}
    if (e.date !== undefined) { if (!day(e.date)) throw new AuthError('Dates must look like 2027-03-07.'); out.date = e.date as string }
    if (e.date_range !== undefined) { if (!text(e.date_range, 60)) throw new AuthError('Date range is too long.'); out.date_range = (e.date_range as string).trim() }
    if (e.status !== undefined) { if (!STATUSES.includes(e.status as string)) throw new AuthError('Unknown status.'); out.status = e.status as string }
    if (e.target_time !== undefined) { if (e.target_time !== null && !text(e.target_time, 20)) throw new AuthError('Target time is too long.'); out.target_time = e.target_time as string | null }
    if (e.registered_on !== undefined) { if (e.registered_on !== null && !day(e.registered_on)) throw new AuthError('Registration date must look like 2026-10-29.'); out.registered_on = e.registered_on as string | null }
    if (e.hidden !== undefined) out.hidden = e.hidden === true
    return out
  }
  const edits: RoadmapEdits['edits'] = {}
  for (const [name, e] of Object.entries(body.edits ?? {})) { if (!text(name, 120)) throw new AuthError('Bad milestone name.'); edits[name] = clean(e as Record<string, unknown>) }
  const added = (body.added ?? []).map(a => {
    if (!text(a.name, 120)) throw new AuthError('Give the new milestone a name.')
    const e = clean(a as Record<string, unknown>)
    if (!e.date && !e.date_range) throw new AuthError(`"${a.name}" needs a date.`)
    return { name: a.name.trim(), ...e }
  })
  // Answers are optional: the editor doesn't send them, and the field-by-field merge keeps the stored ones.
  let answers: Record<string, string> | undefined
  if (body.answers !== undefined) {
    answers = {}
    for (const [q, a] of Object.entries(body.answers ?? {})) { if (!text(q, 200) || !text(a, 300)) throw new AuthError('Bad answer.'); answers[q] = (a as string).trim() }
  }
  let hard75: RoadmapEdits['hard75']
  if (body.hard75 !== undefined && body.hard75 !== null) {
    const h = body.hard75
    if (!Array.isArray(h.rules) || h.rules.length > 30 || !h.rules.every(r => text(r, 200)) || !day(h.start) || !Number.isInteger(h.days) || h.days < 1 || h.days > 366) throw new AuthError('Bad 75 Hard settings.')
    hard75 = { rules: h.rules.map(r => r.trim()), start: h.start, days: h.days }
  }
  if (Object.keys(edits).length > 200 || added.length > 100 || Object.keys(answers ?? {}).length > 100) throw new AuthError('Too many edits.')
  upsertRecords([{ source: 'plan', kind: 'roadmap-edits', id: 'current', day: null, data: { edits, added, answers, hard75 } }])
  send(res, 200, { ok: true })
}

/** PUT /api/roadmap/doc: the whole roadmap from the planner. Fields the planner edits are validated; anything else the
 *  athlete's uploaded file had (swim phases, bike setup…) comes back untouched. Saved as the newest roadmap, with the
 *  in-app edits folded in, so the edit overlay starts empty again (open-question answers and 75 Hard stay). */
async function saveRoadmapDoc(req: IncomingMessage, res: ServerResponse) {
  const doc = JSON.parse(await readBody(req)) as Record<string, any>
  const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
  const text = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max
  const opt = (s: unknown, max: number) => s == null || s === '' || text(s, max)
  const list = (xs: unknown, n: number, max: number) => Array.isArray(xs) && xs.length <= n && xs.every(x => text(x, max))
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new AuthError('Bad roadmap.')
  if (!opt(doc.title, 80)) throw new AuthError('The title is too long.')
  const g = doc.primary_goal
  if (!g || !text(g.event, 120)) throw new AuthError('Give your main goal a name.')
  if (!(g.date == null || g.date === '' || day(g.date))) throw new AuthError('The goal date must look like 2027-06-01.')
  if (!opt(g.location, 120) || !opt(g.objective, 500)) throw new AuthError('The goal location or description is too long.')
  if (!(g.registered_on == null || day(g.registered_on))) throw new AuthError('Registration date must look like 2026-10-29.')
  if (g.distances != null && (typeof g.distances !== 'object' || !Object.values(g.distances).every(v => typeof v === 'number' && v > 0 && v < 1000))) throw new AuthError('Race distances must be positive numbers.')
  const ms = doc.milestones
  if (!Array.isArray(ms) || ms.length > 150) throw new AuthError('Too many milestones.')
  const names = new Set<string>()
  for (const m of ms) {
    if (!m || !text(m.name, 120)) throw new AuthError('Every race or milestone needs a name.')
    if (names.has(m.name.trim())) throw new AuthError(`"${m.name}" is on the roadmap twice.`)
    names.add(m.name.trim())
    if (!(m.date == null || day(m.date))) throw new AuthError(`"${m.name}": dates must look like 2027-03-07.`)
    if (!opt(m.date_range, 60)) throw new AuthError(`"${m.name}": the "when" text is too long.`)
    if (!m.date && !m.date_range) throw new AuthError(`"${m.name}" needs a date, or a "when" like "spring 2027".`)
    if (!STATUSES.includes(m.status) && !text(m.status, 30)) throw new AuthError(`"${m.name}": unknown status.`) // a file's own status words are kept
    if (!opt(m.target_time, 20)) throw new AuthError(`"${m.name}": the goal time is too long.`)
    if (!(m.registered_on == null || day(m.registered_on))) throw new AuthError(`"${m.name}": bad registration date.`)
    if (m.race != null && typeof m.race !== 'boolean') throw new AuthError(`"${m.name}": bad race flag.`)
  }
  const sch = doc.current_training_schedule ?? {}
  if (typeof sch !== 'object' || !SCHEDULE_DAYS.every(k => sch[k] == null || list(sch[k], 10, 120)) || !opt(sch.note, 300)) throw new AuthError('Each day can have up to 10 sessions of up to 120 characters.')
  for (const k of ['planning_principles', 'recovery_priorities']) if (doc[k] != null && !list(doc[k], 30, 200)) throw new AuthError('Keep notes to 30 lines of up to 200 characters.')

  // Date order, undated "when" text by its start; the original order breaks ties.
  const at = (m: Record<string, any>) => parseWhen(m.date ?? m.date_range)?.start ?? '9999'
  doc.milestones = ms.map((m, i) => ({ m, i })).sort((a, b) => at(a.m).localeCompare(at(b.m)) || a.i - b.i).map(x => x.m)
  // Saved as the newest roadmap: today, or the uploaded file's own date when that is later (same id: replaces it).
  const newest = roadmapDoc()?.day ?? '', d = newest > today() ? newest : today()
  upsertRecords([{ source: 'plan', kind: 'roadmap', id: d, day: d, data: { ...doc, as_of_date: d } }])
  const e = roadmapEdits()
  upsertRecords([{ source: 'plan', kind: 'roadmap-edits', id: 'current', day: null, data: { edits: {}, added: [], answers: e.answers, hard75: e.hard75 } }])
  send(res, 200, { ok: true })
}

/** POST /api/wipe {confirm: 'DELETE', keys?, passkeys?}: Settings → Delete all data. Removes every record (workouts, recovery, labs,
 *  food, journal, roadmap, week plans, coach memory and chat), saved state, WHOOP/Strava connections, the import log,
 *  archived uploads and anything waiting in the inbox, and reopens the setup guide. Keeps what lets him back in and
 *  saves retyping: passkeys and sessions, API keys and settings, upload links, the idle lock, and the database key.
 *  `keys` also clears every API key and setting (and the name); `passkeys` also removes every passkey, session and
 *  upload link and returns a new setup code. Off-site backups (and the database key) are never touched. */
async function wipeAll(req: IncomingMessage, res: ServerResponse) {
  const { confirm, keys, passkeys } = JSON.parse(await readBody(req) || '{}') as { confirm?: string; keys?: boolean; passkeys?: boolean }
  if (confirm !== 'DELETE') throw new AuthError('Type DELETE to confirm.')
  if (isSyncing('whoop') || isSyncing('strava')) throw new AuthError('A sync is running. Try again in a minute.')
  wipeData(['settings', 'auth:idleMinutes', 'recovery:downloaded', ...(passkeys === true ? [] : ['upload-tokens']), ...(keys === true ? [] : [SOURCES_KEY])])
  if (keys === true) saveSettings(Object.fromEntries(listSettings().map(r => [r.id, '']))) // through settings.ts, so its listeners hear it
  forgetHistory() // resets the coach memory's in-process cache
  for (const dir of [join(ROOT, 'data', 'imports'), join(ROOT, 'inbox')])
    for (const f of existsSync(dir) ? readdirSync(dir) : []) rmSync(join(dir, f), { recursive: true, force: true })
  initImports(ROOT)
  console.log(`All data deleted from Settings${keys === true ? ', with API keys' : ''}${passkeys === true ? ', with passkeys' : ''}.`)
  send(res, 200, { ok: true, setupCode: passkeys === true ? resetPasskeys() : null })
}

async function hookImport(req: IncomingMessage, res: ServerResponse) {
  const text = (status: number, msg: string) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(msg) }
  if (req.method !== 'POST') return text(405, 'Send the file with POST.')
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim()
  if (throttled(ip)) return text(429, 'Too many failed attempts. Try again in 10 minutes.')
  if (!checkUploadToken(req.headers.authorization, ip)) { console.warn(`hook import: bad token from ${ip}`); return text(401, 'This upload token isn\'t valid. Make a new one in Halo Labs → Settings.') }
  const bytes = await readBytes(req, MAX_UPLOAD)
  if (!bytes.length) return text(400, 'No file came through. Share the export file itself to the Shortcut.')
  const name = decodeURIComponent(String(req.headers['x-filename'] ?? '')).trim() || 'upload'
  const results = await importUpload(name, bytes)
  console.log(`hook import: ${results.map(r => `${r.status}${r.importer ? ' ' + r.importer : ''}${r.records != null ? ' (' + r.records + ')' : ''}`).join(', ')}`)
  const line = (r: (typeof results)[number]) => r.status === 'imported' ? `Imported: ${r.importer} (${r.records} records).`
    : r.status === 'duplicate' ? 'Already imported, nothing new.' : r.status === 'unrecognized' ? 'Halo Labs doesn\'t recognize this file.' : `Import failed: ${r.detail ?? 'unknown error'}`
  text(results.some(r => r.status === 'failed') ? 500 : 200, results.map(line).join('\n'))
}

/** Coach memory for Settings: notes (list/add/edit/delete) and the conversation history (stats/forget). */
async function memoryRoutes(req: IncomingMessage, res: ServerResponse, url: URL) {
  const body = async () => JSON.parse((await readBody(req)) || '{}') as { text?: string; kind?: string }
  const kind = (k: unknown): NoteKind => ((NOTE_KINDS as readonly string[]).includes(String(k)) ? k as NoteKind : 'fact')
  if (url.pathname === '/api/memory' && req.method === 'GET') return send(res, 200, { notes: listNotes(), history: historyStats(), embeddings: embedStatus(), kinds: NOTE_KINDS })
  if (url.pathname === '/api/memory/history' && req.method === 'DELETE') return send(res, 200, { deleted: forgetHistory() })
  if (url.pathname === '/api/memory/notes' && req.method === 'POST') {
    const b = await body(); if (!b.text?.trim()) throw new AuthError('Write the note first.')
    return send(res, 200, { id: putNote(null, b.text, kind(b.kind), 'user') })
  }
  const m = url.pathname.match(/^\/api\/memory\/notes\/([0-9a-f]{12})$/)
  if (m && req.method === 'PUT') { const b = await body(); if (!b.text?.trim()) throw new AuthError('A note can\'t be empty.'); putNote(m[1], b.text, kind(b.kind), 'user'); return send(res, 200, { ok: true }) }
  if (m && req.method === 'DELETE') return send(res, removeNote(m[1]) ? 200 : 404, { ok: true })
  return send(res, 404, { error: 'not found' })
}

async function state(req: IncomingMessage, res: ServerResponse, key: string | undefined) {
  if (!key && req.method === 'GET') return send(res, 200, getState())
  if (!key || !STATE_KEY.test(key)) return send(res, 400, { error: 'bad key' })
  if (req.method === 'PUT') { setState(key, await readBody(req)); return send(res, 200, { ok: true }) }
  if (req.method === 'DELETE') { setState(key, null); return send(res, 200, { ok: true }) }
  send(res, 405, { error: 'method not allowed' })
}

function sources() {
  const ok = Object.fromEntries(lastRuns().map(r => [r.source, r.last_ok]))
  const counts = sourceSummary()
  return {
    connectors: PROVIDERS.map(p => ({
      id: p, configured: isConfigured(p), connected: isConnected(p), syncing: isSyncing(p),
      lastSync: ok[p] ?? null, lastError: lastError(p) ?? null, redirectUri: redirectUri(p),
    })),
    records: counts,
    imports: recentImports(),
  }
}

async function connectors(req: IncomingMessage, res: ServerResponse, url: URL) {
  let m = url.pathname.match(/^\/api\/connect\/(\w+)$/)
  if (m && isProvider(m[1])) {
    const p = m[1]
    if (req.method === 'GET') return redirect(res, authorizeUrl(p))
    if (req.method === 'DELETE') {
      await disconnect(p)
      const removed = url.searchParams.get('purge') === '1' ? deleteSource(p) : 0
      return send(res, 200, { ok: true, removed })
    }
  }
  m = url.pathname.match(/^\/oauth\/(\w+)\/callback$/)
  if (m && isProvider(m[1])) {
    const p = m[1]
    try {
      await handleCallback(p, url)
      syncNow(p).catch(() => {}) // first run backfills history in the background
      return redirect(res, `/?connected=${p}`)
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
      return res.end(`<p style="font-family:system-ui">Couldn't connect ${p}: ${String((e as Error).message).replace(/</g, '&lt;')}</p><p><a href="/">Back to Halo Labs</a></p>`)
    }
  }
  m = url.pathname.match(/^\/api\/sync\/(\w+)$/)
  if (m && isProvider(m[1]) && req.method === 'POST') {
    try { return send(res, 200, { ok: true, records: await syncNow(m[1]) }) }
    catch (e) { return send(res, 502, { ok: false, error: String((e as Error).message) }) }
  }
  return false
}

function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  let file = join(DIST, path)
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html')
  if (!existsSync(file)) { res.writeHead(503); return res.end('App not built yet: run npm run build') }
  const hashed = file.startsWith(join(DIST, 'assets')), type = MIME[extname(file)] ?? 'application/octet-stream'
  const headers: Record<string, string> = { 'Content-Type': type, 'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache', Vary: 'Accept-Encoding' }
  let body: Buffer = readFileSync(file)
  // Compress text (JS, CSS, HTML, SVG): the app bundle is ~4x smaller over the phone's connection. Cached per file.
  const enc = /\bbr\b/.test(String(req.headers['accept-encoding'] ?? '')) ? 'br' : /\bgzip\b/.test(String(req.headers['accept-encoding'] ?? '')) ? 'gzip' : null
  if (enc && body.length > 1024 && /javascript|css|html|svg|json/.test(type)) {
    const key = `${enc}:${file}:${statSync(file).mtimeMs}`
    let z = COMPRESSED.get(key)
    if (!z) {
      z = enc === 'br' ? brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 9 } }) : gzipSync(body, { level: 9 })
      if (COMPRESSED.size > 64) COMPRESSED.clear()
      COMPRESSED.set(key, z)
    }
    body = z; headers['Content-Encoding'] = enc
  }
  res.writeHead(200, headers)
  res.end(body)
}
const COMPRESSED = new Map<string, Buffer>()

async function authRoutes(req: IncomingMessage, res: ServerResponse, url: URL) {
  const json = async () => JSON.parse((await readBody(req)) || '{}')
  if (url.pathname === '/auth/status') return send(res, 200, status(req))
  if (req.method !== 'POST') return false
  switch (url.pathname) {
    case '/auth/register/options': return send(res, 200, await registerOptions(req, await json()))
    case '/auth/register/verify': return send(res, 200, await registerVerify(req, res, await json()))
    case '/auth/login/options': return send(res, 200, await loginOptions())
    case '/auth/login/verify': return send(res, 200, await loginVerify(res, await json()))
    case '/auth/logout': return send(res, 200, logout(req, res))
    case '/auth/ping': return send(res, 200, ping(req))
  }
  return false
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x')
    // Pages opened at 127.0.0.1 move to localhost: passkeys and the session cookie only work there.
    // The health check and the iPhone upload hook keep working at 127.0.0.1.
    if (/^127\.0\.0\.1(:\d+)?$/.test(req.headers.host ?? '') && onLocalhost() && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/hooks/'))
      return redirect(res, publicUrl() + url.pathname + url.search)
    if (url.pathname.startsWith('/auth/')) {
      if ((await authRoutes(req, res, url)) !== false) return
      return send(res, 404, { error: 'not found' })
    }
    if (url.pathname === '/api/health') return send(res, 200, { ok: true })
    // Upload-only hook for the iPhone Shortcut: its own token, import only, answers with a one-line summary.
    if (url.pathname === '/hooks/import') return await hookImport(req, res)
    // Everything with data behind it needs a signed-in session. The app shell itself holds no data.
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/oauth/')) {
      if (!session(req, res)) {
        if (url.pathname.startsWith('/oauth/')) return redirect(res, '/')
        return send(res, 401, { error: 'locked' })
      }
    }
    if (url.pathname === '/api/passkeys' && req.method === 'GET') return send(res, 200, listPasskeys(req))
    if (url.pathname === '/api/client-error' && req.method === 'POST') {
      const e = JSON.parse(await readBody(req)) as Record<string, string>
      console.error(`client error (${e.kind}) on ${e.url}: ${e.message}\n  ${e.stack?.split('\n').slice(0, 4).join('\n  ')}\n  ${e.ua}${e.extra ? '\n  component: ' + e.extra.split('\n').slice(0, 3).join(' <') : ''}`)
      return send(res, 200, { ok: true })
    }
    if (url.pathname === '/api/auth/settings' && req.method === 'PUT') return send(res, 200, setIdleMinutes(Number(JSON.parse(await readBody(req)).idleMinutes)))
    const pk = url.pathname.match(/^\/api\/passkeys\/([^/]+)$/)
    if (pk && req.method === 'DELETE') return send(res, 200, deletePasskey(decodeURIComponent(pk[1])))
    if (url.pathname === '/api/complete' && req.method === 'POST') return await complete(req, res)
    if (url.pathname === '/api/transcribe' && req.method === 'POST') return await transcribe(req, res)
    if (url.pathname === '/api/tts' && req.method === 'POST') return await tts(req, res)
    if (url.pathname === '/api/voice') return send(res, 200, { ready: !!setting('ELEVENLABS_API_KEY'), tts: ttsReady() })
    if (url.pathname.startsWith('/api/settings')) return await settingsRoutes(req, res, url)
    if (url.pathname === '/api/onboarding') {
      // First-run setup (src/app/Onboarding.tsx): done flag plus the answers (services picked, data he has), encrypted.
      if (req.method === 'GET') return send(res, 200, getSecret('onboarding') ?? { done: false })
      if (req.method === 'PUT') {
        const b = JSON.parse(await readBody(req)) as { done?: boolean; services?: unknown; have?: unknown; mode?: unknown }
        const list = (x: unknown) => (Array.isArray(x) ? x.filter(v => typeof v === 'string' && v.length < 40).slice(0, 20) : [])
        // mode 'sample': exploring with sample data (first-run choice); cleared when setup starts or finishes.
        const o = { done: b.done === true, at: new Date().toISOString(), services: list(b.services), have: list(b.have), mode: b.mode === 'sample' && b.done !== true ? 'sample' : null }
        setSecret('onboarding', o)
        return send(res, 200, o)
      }
    }
    if (url.pathname === '/api/sample/dashboard') return send(res, 200, await sampleDashboard())
    if (url.pathname === '/api/recovery-kit/status') return send(res, 200, { downloaded: getSecret<string>('recovery:downloaded') })
    if (url.pathname === '/api/recovery-kit' && req.method === 'GET') {
      const at = new Date().toISOString()
      setSecret('recovery:downloaded', at)
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="halolabs-recovery-kit.txt"' })
      return res.end(`Halo Labs recovery kit (${at.slice(0, 10)})

Keep this in a password manager. It is the only key that can read your Halo Labs data and backups.

To recover: put this line in the .env file of a fresh Halo Labs folder (replacing any HALO_DB_KEY line there),
copy your old data/ folder (or a restored backup) next to it, and start Halo Labs.

HALO_DB_KEY=${process.env.HALO_DB_KEY}
`)
    }
    const m = url.pathname.match(/^\/api\/state(?:\/([^/]+))?$/)
    if (m) return await state(req, res, m[1])
    if (url.pathname === '/api/sources') return send(res, 200, sources())
    if (url.pathname === '/api/backups' && req.method === 'GET') return send(res, 200, backupStatus())
    if (url.pathname === '/api/backups/run' && req.method === 'POST') {
      const s = await runBackup(ROOT, 'manual').catch(e => ({ ok: false, error: (e as Error).message }))
      return send(res, s.ok ? 200 : 502, s)
    }
    if (url.pathname.startsWith('/api/memory')) return await memoryRoutes(req, res, url)
    if (url.pathname === '/api/upload-tokens') {
      if (req.method === 'POST') return send(res, 200, createUploadToken(String((JSON.parse((await readBody(req)) || '{}') as { label?: string }).label ?? '')))
      return send(res, 200, listUploadTokens())
    }
    const ut = url.pathname.match(/^\/api\/upload-tokens\/([0-9a-f]{12})$/)
    if (ut && req.method === 'DELETE') return send(res, revokeUploadToken(ut[1]) ? 200 : 404, { ok: true })
    if (url.pathname === '/api/roadmap/edits' && req.method === 'PUT') return await saveRoadmapEdits(req, res)
    if (url.pathname === '/api/update/status') return send(res, 200, await updateStatus())
    if (url.pathname === '/api/update/check' && req.method === 'POST') return send(res, 200, await checkForUpdate())
    if (url.pathname === '/api/update' && req.method === 'POST') {
      try { return send(res, 200, await applyUpdate()) } catch (e) { return send(res, 400, { error: (e as Error).message }) }
    }
    if (url.pathname === '/api/activity-sources') {
      // Settings → Activity sources: which app defines each sport's workouts (Auto, or a fixed app). See sessions.ts.
      if (req.method === 'PUT') {
        const body = JSON.parse(await readBody(req)) as Partial<SourcePrefs>, next = sourcePrefs()
        for (const k of SOURCE_SPORTS) if (body[k] !== undefined) {
          if (body[k] !== 'auto' && !SOURCE_CHOICES[k].includes(body[k] as never)) throw new AuthError(`Unknown source for ${k}.`)
          next[k] = body[k]!
        }
        setSecret(SOURCES_KEY, next)
      }
      return send(res, 200, { prefs: sourcePrefs(), effective: buildSessions().sources, choices: SOURCE_CHOICES })
    }
    if (url.pathname === '/api/wipe' && req.method === 'POST') return await wipeAll(req, res)
    if (url.pathname === '/api/roadmap/doc' && req.method === 'GET') return send(res, 200, { doc: roadmapDoc()?.doc ?? null })
    if (url.pathname === '/api/roadmap/doc' && req.method === 'PUT') return await saveRoadmapDoc(req, res)
    const wp = /^\/api\/week-plan\/(\d{4}-\d{2}-\d{2})$/.exec(url.pathname)
    if (wp && req.method === 'PUT') {
      try { return send(res, 200, { plan: saveWeekPlan({ ...JSON.parse(await readBody(req)), week_start: wp[1] }, 'you') }) }
      catch (e) { return send(res, 400, { error: (e as Error).message }) }
    }
    if (url.pathname === '/api/journal' && req.method === 'GET') return send(res, 200, { entries: journalEntries() })
    const jm = /^\/api\/journal\/([^/]+)(\/format)?$/.exec(url.pathname)
    if (jm) {
      const id = jm[1]
      if (!JOURNAL_ID.test(id)) return send(res, 400, { error: 'Bad entry id.' })
      try {
        if (jm[2] && req.method === 'POST') {
          if (!coach) return send(res, 503, { error: NO_KEY })
          return send(res, 200, { entry: await formatEntry(coach, COACH_MODEL, id) })
        }
        if (!jm[2] && req.method === 'PUT') return send(res, 200, { entry: saveEntry(id, JSON.parse(await readBody(req))) })
        if (!jm[2] && req.method === 'DELETE') { deleteEntry(id); return send(res, 200, { ok: true }) }
      } catch (e) { return send(res, 400, { error: (e as Error).message }) }
    }
    if (url.pathname === '/api/refresh' && req.method === 'POST') {
      // Opening the app syncs WHOOP if the last sync is over 2 minutes old (waits up to 20 s).
      const job = syncIfStale('whoop', 2 * 60_000)
      if (!job) return send(res, 200, { synced: false })
      const ok = await Promise.race([job.then(() => true, () => false), new Promise<false>(r => setTimeout(() => r(false), 20_000))])
      return send(res, 200, { synced: ok })
    }
    if (url.pathname === '/api/dashboard') return send(res, 200, dashboard(url.searchParams.get('day') ?? undefined))
    if (url.pathname === '/api/import' && req.method === 'POST') {
      // Raw file body; the original file name in X-Filename (URI-encoded).
      const name = decodeURIComponent(String(req.headers['x-filename'] ?? 'upload'))
      return send(res, 200, { results: await importUpload(name, await readBytes(req, MAX_UPLOAD)) })
    }
    if (url.pathname === '/api/import/scan' && req.method === 'POST') return send(res, 200, { results: await scanInbox() })
    if ((await connectors(req, res, url)) !== false) return
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' })
    serveStatic(req, res)
  } catch (error) {
    if (error instanceof AuthError) return send(res, 400, { error: error.message })
    console.error(error)
    if (!res.headersSent) send(res, 500, { error: String((error as Error).message ?? 'server error') })
  }
}).listen(PORT, HOST, () => {
  buildCoach()
  console.log(`Halo Labs on http://${HOST}:${PORT} (coach ${coach ? 'on' : 'off: add a Claude API key in Settings → APIs'})`)
  startScheduler()
  startBackups(ROOT)
  startUpdateChecks(ROOT)
  seedFromChat().then(backfillEmbeddings).catch(e => console.error('memory: startup failed:', e))
  startInboxWatcher()
})
