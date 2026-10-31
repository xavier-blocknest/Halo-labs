import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { BUILT_IN, setCoach } from '../coachPersona'
import { getSources, uploadFile, type ImportResult, type Sources } from './api'
import './onboarding.css'

// First-run setup, shown once after the first passkey is created. Everything it collects is saved on the server in
// the encrypted SQLite database: name and keys through /api/settings, files through the importers (/api/import),
// the answers and the "done" flag through /api/onboarding. The step lives in localStorage so the page can reload
// (e.g. coming back from the WHOOP or Strava sign-in) and continue where it was.

type ServiceId = 'claude' | 'elevenlabs' | 'whoop' | 'strava'
type HaveId = 'dexa' | 'vo2' | 'macrofactor' | 'fitnessai' | 'runna' | 'history' | 'roadmap'
type Saved = { step: string; services: ServiceId[]; have: HaveId[] }
type Setting = { id: string; set: boolean; value: string | null; last4: string | null }
type Voice = { id: string; name: string; category: string; preview: string | null; about: string }

const STORE = 'halo-onboarding'
const load = (): Saved => {
  try { return { step: 'welcome', services: ['claude'], have: [], ...JSON.parse(localStorage.getItem(STORE) ?? '{}') } }
  catch { return { step: 'welcome', services: ['claude'], have: [] } }
}

const SERVICES: { id: ServiceId; name: string; what: string; note: string; icon: ReactNode }[] = [
  { id: 'claude', name: 'AI coach', what: 'Claude reads your numbers and coaches you in chat, voice and a morning brief.', note: 'Recommended · Claude API key', icon: <IconSpark /> },
  { id: 'whoop', name: 'WHOOP', what: 'Recovery, HRV, sleep, strain and workouts, synced all day.', note: 'Free WHOOP developer app', icon: <IconPulse /> },
  { id: 'strava', name: 'Strava', what: 'Runs, rides and swims with distance, pace and gear.', note: 'Free Strava API app', icon: <IconRoute /> },
  { id: 'elevenlabs', name: 'Voice', what: 'Talk to your coach and hear it answer, powered by ElevenLabs.', note: 'ElevenLabs API key · free plan works', icon: <IconWave /> },
]

const HAVE: { id: HaveId; name: string; what: string; accept: string; how: ReactNode }[] = [
  { id: 'dexa', name: 'DEXA scans', what: 'Body fat, lean mass, bone density', accept: '.pdf',
    how: <>The PDF report from your scan provider (Benchmark Body Metrics reports are read today; other providers may need a new importer).</> },
  { id: 'vo2', name: 'VO₂ max tests', what: 'VO₂ max, thresholds, heart-rate zones', accept: '.pdf',
    how: <>The PDF report from your test. Its heart-rate zones become your training zones.</> },
  { id: 'macrofactor', name: 'MacroFactor', what: 'Food log, macros, weight trend, expenditure', accept: '.xlsx,.csv,.zip',
    how: <>In MacroFactor, export your data (the <b>XLSX</b> export) and, for meal-level detail, the <b>food log CSV</b>. Upload both.</> },
  { id: 'fitnessai', name: 'FitnessAI', what: 'Strength workouts, sets, muscle load', accept: '.json,.zip',
    how: <>Export your data from FitnessAI and upload the <b>workout</b> and <b>exercise set</b> JSON files (or the zip).</> },
  { id: 'runna', name: 'Runna', what: 'Planned runs and splits', accept: '.json,.zip', how: <>Your Runna activities export (JSON).</> },
  { id: 'history', name: 'WHOOP or Strava history', what: 'Years of history in one go', accept: '.csv,.zip',
    how: <>Connecting WHOOP or Strava already pulls history, but a full export goes back further. <b>WHOOP</b>: request a data export in the WHOOP app (CSV files). <b>Strava</b>: strava.com → Settings → My Account → download your data (<code>activities.csv</code>).</> },
  { id: 'roadmap', name: 'A race plan', what: 'Goal race, milestones, weekly schedule', accept: '.json',
    how: <>A roadmap file in Halo Labs' format: start from <code>docs/roadmap-template.json</code> in your Halo Labs folder. No file yet? Skip it and ask your coach to help you build one later.</> },
]

async function getSettings(): Promise<Setting[]> { return (await (await fetch('/api/settings')).json()).settings }
async function putSettings(values: Record<string, string>) {
  const r = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Couldn\'t save.')
}
async function testKey(kind: 'claude' | 'elevenlabs'): Promise<{ ok: boolean; detail: string }> {
  return fetch(`/api/settings/test/${kind}`, { method: 'POST' }).then(r => r.json()).catch(() => ({ ok: false, detail: 'Couldn\'t reach Halo Labs.' }))
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [st, setSt] = useState<Saved>(load)
  const [settings, setSettings] = useState<Setting[]>([])
  const [sources, setSources] = useState<Sources | null>(null)
  const [dir, setDir] = useState<1 | -1>(1)

  const refresh = useCallback(() => {
    getSettings().then(setSettings).catch(() => {})
    getSources().then(setSources).catch(() => {})
  }, [])
  useEffect(refresh, [refresh])
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(st)) } catch { /* private mode */ } }, [st])
  // Back from a WHOOP/Strava sign-in: drop ?connected=… from the address and reload the status.
  useEffect(() => { if (location.search) { history.replaceState(null, '', location.pathname); refresh() } }, [refresh])

  const steps = ['welcome', 'privacy', 'services', ...SERVICES.filter(s => st.services.includes(s.id)).map(s => s.id), 'labs', 'more',
    ...(st.services.includes('claude') ? ['coach'] : []), 'done']
  const at = Math.max(0, steps.indexOf(st.step))
  const go = (d: 1 | -1) => { setDir(d); setSt(s => ({ ...s, step: steps[Math.min(steps.length - 1, Math.max(0, at + d))] })); window.scrollTo({ top: 0 }) }
  const next = () => go(1), back = () => go(-1)
  const val = (id: string) => settings.find(s => s.id === id)
  const name = val('HALO_NAME')?.value ?? ''

  async function finish() {
    await fetch('/api/onboarding', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: true, services: st.services, have: st.have }) })
    try { localStorage.removeItem(STORE) } catch { /* private mode */ }
    window.dispatchEvent(new Event('halolabs:data'))
    onDone()
  }

  const key = st.step
  let body: ReactNode
  if (key === 'welcome') body = <Welcome name={name} onNext={async n => { await putSettings({ HALO_NAME: n }); refresh(); next() }} />
  else if (key === 'privacy') body = <Privacy onNext={next} onBack={back} />
  else if (key === 'services') body = <Services picked={st.services} onChange={services => setSt(s => ({ ...s, services }))} onNext={next} onBack={back} />
  else if (key === 'claude') body = <ClaudeStep saved={val('ANTHROPIC_API_KEY')} onSaved={refresh} onNext={next} onBack={back} />
  else if (key === 'elevenlabs') body = <VoiceStep saved={val('ELEVENLABS_API_KEY')} voiceId={val('ELEVENLABS_VOICE_ID')?.value ?? ''} onSaved={refresh} onNext={next} onBack={back} />
  else if (key === 'whoop' || key === 'strava') body = <OAuthStep id={key} sources={sources} settings={settings} onSaved={refresh} onNext={next} onBack={back} />
  else if (key === 'labs') body = <Labs onUploaded={refresh} onNext={next} onBack={back} />
  else if (key === 'more') body = <More have={st.have} onChange={have => setSt(s => ({ ...s, have }))} onUploaded={refresh} onNext={next} onBack={back} />
  else if (key === 'coach') body = <CoachStep onNext={next} onBack={back} />
  else body = <Done name={name} services={st.services} settings={settings} sources={sources} onFinish={finish} onBack={back} />

  return (
    <div className="onb">
      <div className="onb-glow" aria-hidden />
      <header className="onb-top">
        <div className="onb-brand"><span className="onb-ring" aria-hidden /><span>HALO<small>LABS</small></span></div>
        <div className="onb-progress" aria-label={`Step ${at + 1} of ${steps.length}`}>
          {steps.map((s, i) => <span key={s} className={i < at ? 'done' : i === at ? 'now' : ''} />)}
        </div>
        {key !== 'done' && <button className="onb-skip" onClick={() => { if (confirm('Skip the rest of setup? Everything can be set up later in Settings.')) void finish() }}>Skip setup</button>}
      </header>
      <main className={`onb-stage ${dir > 0 ? 'fwd' : 'bwd'}`} key={key}>{body}</main>
    </div>
  )
}

// ---- building blocks ---------------------------------------------------------------------------------------

function Step({ eyebrow, title, lead, children, foot }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; foot: ReactNode }) {
  return (
    <section className="onb-step">
      <p className="onb-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {lead && <p className="onb-lead">{lead}</p>}
      {children}
      <footer className="onb-foot">{foot}</footer>
    </section>
  )
}

function Nav({ onBack, onNext, next = 'Continue', disabled, skip }: { onBack?: () => void; onNext: () => void; next?: string; disabled?: boolean; skip?: string }) {
  return (
    <>
      {onBack ? <button className="onb-btn ghost" onClick={onBack}>Back</button> : <span />}
      <div className="onb-foot-right">
        {skip && <button className="onb-btn ghost" onClick={onNext}>{skip}</button>}
        <button className="onb-btn primary" disabled={disabled} onClick={onNext}>{next}</button>
      </div>
    </>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return <label className="onb-field"><span className="onb-label">{label}</span>{children}{hint && <span className="onb-hint">{hint}</span>}</label>
}

function Copy({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <span className="onb-copy">
      <code>{text}</code>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500) }) }}>{ok ? 'Copied' : 'Copy'}</button>
    </span>
  )
}

function Status({ r }: { r: { ok: boolean; detail: string } | null | 'busy' }) {
  if (!r) return null
  if (r === 'busy') return <p className="onb-status busy">Checking…</p>
  return <p className={`onb-status ${r.ok ? 'ok' : 'bad'}`}>{r.ok ? '✓ ' : ''}{r.detail}</p>
}

function SecretInput({ saved, value, onChange, placeholder }: { saved?: Setting; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="onb-input" type="password" autoComplete="off" spellCheck={false} value={value} onChange={e => onChange(e.target.value)}
    placeholder={saved?.set ? `Saved · ends in ${saved.last4 ?? '••••'} (type to replace)` : placeholder} />
}

// ---- steps -------------------------------------------------------------------------------------------------

function Welcome({ name, onNext }: { name: string; onNext: (name: string) => Promise<void> }) {
  const [n, setN] = useState(name)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (name && !n) setN(name) }, [name]) // eslint-disable-line react-hooks/exhaustive-deps
  const go = async () => { if (!n.trim()) return; setBusy(true); try { await onNext(n.trim()) } finally { setBusy(false) } }
  return (
    <Step eyebrow="Welcome" title={<>Let's set up your <span className="onb-accent">training command center</span>.</>}
      lead="A few minutes now and Halo Labs will know your recovery, your training and your goals, with a coach that reads all of it."
      foot={<Nav onNext={go} next={busy ? 'Saving…' : 'Continue'} disabled={!n.trim() || busy} />}>
      <Field label="What should your coach call you?">
        <input className="onb-input big" autoFocus value={n} onChange={e => setN(e.target.value)} placeholder="First name" maxLength={40}
          onKeyDown={e => { if (e.key === 'Enter') void go() }} />
      </Field>
    </Step>
  )
}

function Privacy({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [ok, setOk] = useState(false)
  const [kit, setKit] = useState(false)
  useEffect(() => { fetch('/api/recovery-kit/status').then(r => r.json()).then(d => setKit(!!d.downloaded)).catch(() => {}) }, [])
  return (
    <Step eyebrow="Your data, your Mac" title="Everything stays on this computer."
      lead="Halo Labs isn't a cloud service. There's no account and no company server: it runs on your Mac, for you only."
      foot={<Nav onBack={onBack} onNext={onNext} disabled={!ok} />}>
      <ul className="onb-facts">
        <li><IconLock /><div><b>Stored locally, encrypted.</b> Your health data lives in the <code>data</code> folder of your Halo Labs folder, encrypted with AES-256. Without your key it's unreadable, even to someone with the file.</div></li>
        <li><IconOut /><div><b>What leaves the Mac, and only when you use it:</b> questions and the relevant numbers go to Claude (Anthropic) when you ask the coach; your voice goes to ElevenLabs to be transcribed and the reply comes back as speech; WHOOP and Strava send your data here, not the other way round.</div></li>
        <li><IconShield /><div><b>Locked by your passkey.</b> Nobody can open the dashboard without your Touch ID or iPhone, and it locks itself when you're away.</div></li>
        <li><IconHeart /><div><b>Not medical advice.</b> The coach is software that reads your numbers. Talk to your doctor about anything medical.</div></li>
      </ul>
      <div className="onb-kit">
        <div>
          <b>Save your recovery key</b>
          <p>One file holds the key to all your data. Keep it in your password manager (not next to the app). If the key is lost, the data can't be recovered.</p>
        </div>
        <a className="onb-btn" href="/api/recovery-kit" download onClick={() => setTimeout(() => setKit(true), 800)}>{kit ? '✓ Downloaded' : 'Download recovery kit'}</a>
      </div>
      <label className="onb-check">
        <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
        <span>I understand my data is stored on this Mac and I'm responsible for keeping the recovery key safe.</span>
      </label>
    </Step>
  )
}

function Services({ picked, onChange, onNext, onBack }: { picked: ServiceId[]; onChange: (p: ServiceId[]) => void; onNext: () => void; onBack: () => void }) {
  const flip = (id: ServiceId) => onChange(picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id])
  return (
    <Step eyebrow="Connections" title="What do you want to switch on?"
      lead="Pick what you use. Each one gets a short guided step next; you can add the rest any time in Settings → APIs."
      foot={<Nav onBack={onBack} onNext={onNext} next={picked.length ? 'Set them up' : 'Continue without'} />}>
      <div className="onb-tiles">
        {SERVICES.map(s => (
          <button key={s.id} className={`onb-tile${picked.includes(s.id) ? ' on' : ''}`} onClick={() => flip(s.id)} aria-pressed={picked.includes(s.id)}>
            <span className="onb-tile-icon">{s.icon}</span>
            <span className="onb-tile-name">{s.name}</span>
            <span className="onb-tile-what">{s.what}</span>
            <span className="onb-tile-note">{s.note}</span>
            <span className="onb-tick" aria-hidden>✓</span>
          </button>
        ))}
      </div>
    </Step>
  )
}

function ClaudeStep({ saved, onSaved, onNext, onBack }: { saved?: Setting; onSaved: () => void; onNext: () => void; onBack: () => void }) {
  const [k, setK] = useState('')
  const [res, setRes] = useState<{ ok: boolean; detail: string } | null | 'busy'>(null)
  const save = async () => {
    setRes('busy')
    try { if (k.trim()) await putSettings({ ANTHROPIC_API_KEY: k.trim() }); setK(''); onSaved(); setRes(await testKey('claude')) }
    catch (e) { setRes({ ok: false, detail: (e as Error).message }) }
  }
  const ok = res && res !== 'busy' && res.ok
  return (
    <Step eyebrow="AI coach · Claude" title="Give your coach a brain."
      lead="Your coach runs on Claude. Use your own API key: you pay Anthropic directly, usually a few cents a day."
      foot={<Nav onBack={onBack} onNext={onNext} skip={ok ? undefined : 'Later'} disabled={!ok && !saved?.set} />}>
      <ol className="onb-how">
        <li>Open <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com → API keys</a> and sign in.</li>
        <li>Add a little credit under <b>Billing</b> (the coach won't answer without it).</li>
        <li>Create a key named “Halo Labs” and paste it here.</li>
      </ol>
      <Field label="Claude API key">
        <div className="onb-row">
          <SecretInput saved={saved} value={k} onChange={setK} placeholder="sk-ant-…" />
          <button className="onb-btn" disabled={res === 'busy' || (!k.trim() && !saved?.set)} onClick={save}>{k.trim() ? 'Save & test' : 'Test'}</button>
        </div>
      </Field>
      <Status r={res} />
    </Step>
  )
}

function VoiceStep({ saved, voiceId, onSaved, onNext, onBack }: { saved?: Setting; voiceId: string; onSaved: () => void; onNext: () => void; onBack: () => void }) {
  const [k, setK] = useState('')
  const [res, setRes] = useState<{ ok: boolean; detail: string } | null | 'busy'>(null)
  const [voices, setVoices] = useState<Voice[] | null>(null)
  const [pick, setPick] = useState(voiceId)
  const [playing, setPlaying] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const loadVoices = useCallback(async () => {
    const d = await fetch('/api/settings/voices').then(r => r.json()).catch(() => ({ voices: [], error: 'Couldn\'t reach Halo Labs.' }))
    setVoices(d.voices); if (d.error) setRes({ ok: false, detail: d.error })
  }, [])
  useEffect(() => { if (saved?.set) void loadVoices() }, [saved?.set, loadVoices])
  useEffect(() => () => audio.current?.pause(), [])
  const save = async () => {
    setRes('busy')
    try { await putSettings({ ELEVENLABS_API_KEY: k.trim() }); setK(''); onSaved(); setRes(null); await loadVoices() }
    catch (e) { setRes({ ok: false, detail: (e as Error).message }) }
  }
  const choose = async (id: string) => { setPick(id); await putSettings({ ELEVENLABS_VOICE_ID: id }); onSaved(); setRes(await testKey('elevenlabs')) }
  const play = (v: Voice) => {
    audio.current?.pause()
    if (playing === v.id || !v.preview) { setPlaying(null); return }
    audio.current = new Audio(v.preview); audio.current.onended = () => setPlaying(null); void audio.current.play(); setPlaying(v.id)
  }
  const list = (voices ?? []).slice().sort((a, b) => (a.category === 'premade' ? 0 : 1) - (b.category === 'premade' ? 0 : 1)).slice(0, 24)
  return (
    <Step eyebrow="Voice · ElevenLabs" title="Talk to your coach."
      lead="Hold the mic and ask. ElevenLabs turns your voice into text and gives the coach a real voice. The free plan covers light use; when it runs out, your device's voice takes over."
      foot={<Nav onBack={onBack} onNext={onNext} skip={pick ? undefined : 'Later'} disabled={!pick} />}>
      <ol className="onb-how">
        <li>Sign up at <a href="https://elevenlabs.io" target="_blank" rel="noreferrer">elevenlabs.io</a>, then open <b>Developers → API keys</b>.</li>
        <li>Create a key with access to <b>Text to Speech</b>, <b>Speech to Text</b> and <b>Voices (read)</b>, and paste it here.</li>
      </ol>
      <Field label="ElevenLabs API key">
        <div className="onb-row">
          <SecretInput saved={saved} value={k} onChange={setK} />
          <button className="onb-btn" disabled={res === 'busy' || !k.trim()} onClick={save}>Save</button>
        </div>
      </Field>
      {list.length > 0 && (
        <>
          <p className="onb-label" style={{ marginTop: 18 }}>Pick your coach's voice</p>
          <div className="onb-voices">
            {list.map(v => (
              <div key={v.id} className={`onb-voice${pick === v.id ? ' on' : ''}`}>
                <button className="onb-play" onClick={() => play(v)} disabled={!v.preview} aria-label={`Play ${v.name}`}>{playing === v.id ? '❚❚' : '▶'}</button>
                <button className="onb-voice-main" onClick={() => void choose(v.id)}>
                  <span className="onb-voice-name">{v.name.split(' - ')[0]}</span>
                  <span className="onb-voice-about">{v.about || v.category}</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <Status r={res} />
    </Step>
  )
}

function OAuthStep({ id, sources, settings, onSaved, onNext, onBack }: { id: 'whoop' | 'strava'; sources: Sources | null; settings: Setting[]; onSaved: () => void; onNext: () => void; onBack: () => void }) {
  const W = id === 'whoop', NAME = W ? 'WHOOP' : 'Strava', P = W ? 'WHOOP' : 'STRAVA'
  const conn = sources?.connectors.find(c => c.id === id) as (Sources['connectors'][number] & { redirectUri?: string }) | undefined
  const savedId = settings.find(s => s.id === `${P}_CLIENT_ID`), savedSecret = settings.find(s => s.id === `${P}_CLIENT_SECRET`)
  const [cid, setCid] = useState('')
  const [secret, setSecret] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { if (savedId?.value && !cid) setCid(savedId.value) }, [savedId?.value]) // eslint-disable-line react-hooks/exhaustive-deps
  const redirect = conn?.redirectUri ?? `${location.origin}/oauth/${id}/callback`
  const domain = new URL(redirect).hostname
  const save = async () => {
    setErr(null)
    try { await putSettings({ [`${P}_CLIENT_ID`]: cid.trim(), ...(secret.trim() ? { [`${P}_CLIENT_SECRET`]: secret.trim() } : {}) }); setSecret(''); onSaved() }
    catch (e) { setErr((e as Error).message) }
  }
  const ready = !!(savedId?.set && savedSecret?.set)
  const records = sources?.records.filter(r => r.source === id).reduce((n, r) => n + r.n, 0) ?? 0
  return (
    <Step eyebrow={`Connection · ${NAME}`} title={conn?.connected ? `${NAME} is connected.` : `Connect ${NAME}.`}
      lead={W ? 'WHOOP shares your data through a free developer app that you own. It takes about five minutes, once.'
        : 'Strava shares your activities through a free API app that you own. It takes about three minutes, once.'}
      foot={<Nav onBack={onBack} onNext={onNext} skip={conn?.connected ? undefined : 'Later'} disabled={!conn?.connected} />}>
      {conn?.connected ? (
        <div className="onb-connected"><IconCheck /><div><b>Syncing in the background.</b> {records ? `${records.toLocaleString()} records so far; history keeps arriving for a while.` : 'History is arriving now; it can take a few minutes.'}</div></div>
      ) : (<>
        <ol className="onb-how">
          {W ? (<>
            <li>Open the <b>WHOOP Developer Dashboard</b> (linked from <a href="https://developer.whoop.com/docs/developing/getting-started" target="_blank" rel="noreferrer">WHOOP's getting-started guide</a>), sign in with your WHOOP account and create a <b>Team</b>.</li>
            <li>Create an <b>App</b> (any name, e.g. “Halo Labs”). Turn on every <b>read</b> scope: recovery, cycles, workout, sleep, body measurement.</li>
            <li>Add this <b>Redirect URL</b>: <Copy text={redirect} /></li>
            <li>Copy the app's <b>Client ID</b> and <b>Client Secret</b> into the fields below.</li>
          </>) : (<>
            <li>Open <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">strava.com/settings/api</a> and create an app (any name and website, e.g. “Halo Labs” and <code>http://localhost</code>).</li>
            <li>Set <b>Authorization Callback Domain</b> to: <Copy text={domain} /></li>
            <li>Copy the <b>Client ID</b> and <b>Client Secret</b> into the fields below.</li>
          </>)}
        </ol>
        <div className="onb-grid2">
          <Field label="Client ID"><input className="onb-input" value={cid} onChange={e => setCid(e.target.value)} autoComplete="off" spellCheck={false} /></Field>
          <Field label="Client secret"><SecretInput saved={savedSecret} value={secret} onChange={setSecret} /></Field>
        </div>
        <div className="onb-row" style={{ marginTop: 14 }}>
          <button className="onb-btn" disabled={!cid.trim() || (!secret.trim() && !savedSecret?.set)} onClick={save}>{ready ? 'Update keys' : 'Save keys'}</button>
          {ready && <a className="onb-btn primary" href={`/api/connect/${id}`}>Connect {NAME} →</a>}
        </div>
        {ready && <p className="onb-hint" style={{ marginTop: 10 }}>You'll sign in on {NAME}'s site and come straight back here.</p>}
        {conn?.lastError && <p className="onb-status bad">Last attempt failed: {conn.lastError.detail}</p>}
        {err && <p className="onb-status bad">{err}</p>}
        {W && <p className="onb-hint" style={{ marginTop: 10 }}>If WHOOP won't accept a <code>localhost</code> redirect URL, finish setup, run <code>./halo phone</code> for an HTTPS address, and connect WHOOP from Settings.</p>}
      </>)}
    </Step>
  )
}

function Dropzone({ accept, hint, onUploaded }: { accept: string; hint: string; onUploaded: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [items, setItems] = useState<{ name: string; p: number; res?: ImportResult[]; err?: string }[]>([])
  const add = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    setItems(it => [...list.map(f => ({ name: f.name, p: 0 })), ...it])
    for (const f of list) {
      const set = (patch: object) => setItems(it => it.map(x => (x.name === f.name && !x.res && !x.err ? { ...x, ...patch } : x)))
      try { set({ res: await uploadFile(f, p => set({ p })) }) } catch (e) { set({ err: (e as Error).message }) }
    }
    onUploaded()
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); void add(e.dataTransfer.files) }
  return (
    <div>
      <button className={`onb-drop${over ? ' over' : ''}`} onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
        <IconUp /><span><b>Drop files here</b> or click to choose</span><small>{hint}</small>
      </button>
      <input ref={input} type="file" multiple accept={accept} hidden onChange={e => { void add(e.target.files); e.target.value = '' }} />
      {items.length > 0 && (
        <ul className="onb-files">
          {items.map((it, i) => {
            const r = it.res?.[0], good = it.res?.every(x => x.status === 'imported' || x.status === 'duplicate')
            return (
              <li key={i} className={it.err || (it.res && !good) ? 'bad' : it.res ? 'ok' : ''} title={it.res?.map(x => x.detail).filter(Boolean).join('\n') || undefined}>
                <span className="onb-file-name">{it.name}</span>
                <span className="onb-file-state">
                  {it.err ? it.err : !it.res ? `${Math.round(it.p * 100)}%`
                    : it.res.map(x => x.status === 'imported' ? `✓ ${x.importer} · ${x.records} records` : x.status === 'duplicate' ? '✓ Already imported'
                      : x.status === 'unrecognized' ? 'Not a format Halo Labs reads yet' : 'Couldn\'t read this file. Is it the original export or PDF?').join(' · ')}
                  {!it.err && !it.res && <span className="onb-bar"><span style={{ width: `${it.p * 100}%` }} /></span>}
                </span>
                {r?.status === 'unrecognized' && <span className="onb-hint">Ask Claude (with CLAUDE.md) to add an importer for it, or skip it.</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Labs({ onUploaded, onNext, onBack }: { onUploaded: () => void; onNext: () => void; onBack: () => void }) {
  return (
    <Step eyebrow="Bloodwork" title="Do you have lab results from Quest?"
      lead="Upload your Quest Diagnostics PDFs and Halo Labs tracks every marker over time, flags what's out of range, and lets the coach read it."
      foot={<Nav onBack={onBack} onNext={onNext} skip="I don't have any" />}>
      <ol className="onb-how">
        <li>In the <b>MyQuest</b> app or at <a href="https://myquest.questdiagnostics.com" target="_blank" rel="noreferrer">myquest.questdiagnostics.com</a>, open a result and download the <b>PDF</b>.</li>
        <li>Drop one PDF per blood draw below. Several at once is fine; older draws build the trend.</li>
      </ol>
      <Dropzone accept=".pdf,.zip" hint="Quest Diagnostics PDF reports" onUploaded={onUploaded} />
    </Step>
  )
}

function More({ have, onChange, onUploaded, onNext, onBack }: { have: HaveId[]; onChange: (h: HaveId[]) => void; onUploaded: () => void; onNext: () => void; onBack: () => void }) {
  const flip = (id: HaveId) => onChange(have.includes(id) ? have.filter(x => x !== id) : [...have, id])
  return (
    <Step eyebrow="Your history" title="Anything else you've been tracking?"
      lead="Tap what you have. Each one opens with how to export it, and a place to drop the files. Everything can also be added later from Settings."
      foot={<Nav onBack={onBack} onNext={onNext} next={have.length ? 'Continue' : 'Nothing else'} />}>
      <div className="onb-chips">
        {HAVE.map(h => <button key={h.id} className={`onb-chip${have.includes(h.id) ? ' on' : ''}`} onClick={() => flip(h.id)} aria-pressed={have.includes(h.id)}>{have.includes(h.id) ? '✓ ' : '+ '}{h.name}</button>)}
      </div>
      {HAVE.filter(h => have.includes(h.id)).map(h => (
        <div key={h.id} className="onb-panel">
          <div className="onb-panel-head"><b>{h.name}</b><span>{h.what}</span></div>
          <p className="onb-panel-how">{h.how}</p>
          <Dropzone accept={h.accept} hint={h.accept.replace(/\./g, '').toUpperCase().replace(/,/g, ' · ')} onUploaded={onUploaded} />
        </div>
      ))}
    </Step>
  )
}

function CoachStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [id, setId] = useState<string>(() => { try { return localStorage.getItem('im4-coach') ?? 'coach' } catch { return 'coach' } })
  const pick = (c: string) => { setId(c); setCoach(c as 'coach' | 'tough') }
  return (
    <Step eyebrow="Your coach" title="How should your coach talk to you?"
      lead="Same data, same rules, different personality. You can switch any time, or write your own coach in Settings."
      foot={<Nav onBack={onBack} onNext={onNext} />}>
      <div className="onb-tiles two">
        {BUILT_IN.map(c => (
          <button key={c.id} className={`onb-tile${id === c.id ? ' on' : ''}`} onClick={() => pick(c.id)} aria-pressed={id === c.id}>
            <span className="onb-tile-icon">{c.id === 'tough' ? <IconFlame /> : <IconSpark />}</span>
            <span className="onb-tile-name">{c.name}</span>
            <span className="onb-tile-what">{c.blurb}</span>
            <span className="onb-quote">{c.id === 'tough' ? '“Short night and you want a hard day? No. Easy spin, then bed early. Tomorrow you earn it.”' : '“Recovery is low, so today stays easy: Zone 2, nothing more. Tomorrow we push.”'}</span>
            <span className="onb-tick" aria-hidden>✓</span>
          </button>
        ))}
      </div>
    </Step>
  )
}

function Done({ name, services, settings, sources, onFinish, onBack }: { name: string; services: ServiceId[]; settings: Setting[]; sources: Sources | null; onFinish: () => Promise<void>; onBack: () => void }) {
  const [busy, setBusy] = useState(false)
  const set = (id: string) => !!settings.find(s => s.id === id)?.set
  const conn = (id: string) => !!sources?.connectors.find(c => c.id === id)?.connected
  const rows: [string, boolean, string][] = [
    ['AI coach', set('ANTHROPIC_API_KEY'), set('ANTHROPIC_API_KEY') ? 'Ready' : 'Add a Claude key in Settings → APIs'],
    ['Voice', set('ELEVENLABS_API_KEY') && set('ELEVENLABS_VOICE_ID'), set('ELEVENLABS_API_KEY') && set('ELEVENLABS_VOICE_ID') ? 'Ready' : 'Optional · Settings → APIs'],
    ['WHOOP', conn('whoop'), conn('whoop') ? 'Connected' : services.includes('whoop') ? 'Finish in Settings → Sources' : 'Not used'],
    ['Strava', conn('strava'), conn('strava') ? 'Connected' : services.includes('strava') ? 'Finish in Settings → Sources' : 'Not used'],
  ]
  const imported = sources?.records.filter(r => !['whoop', 'strava', 'coach'].includes(r.source)).reduce((n, r) => n + r.n, 0) ?? 0
  return (
    <Step eyebrow="All set" title={<>You're ready{name ? `, ${name}` : ''}.</>}
      lead="Halo Labs keeps syncing in the background while your Mac is awake. Add more data any time from Settings."
      foot={<><button className="onb-btn ghost" onClick={onBack}>Back</button>
        <button className="onb-btn primary big" disabled={busy} onClick={async () => { setBusy(true); await onFinish() }}>{busy ? 'Opening…' : 'Open Halo Labs'}</button></>}>
      <ul className="onb-summary">
        {rows.map(([k, ok, v]) => <li key={k}><span className={`onb-dot${ok ? ' ok' : ''}`} /><b>{k}</b><span>{v}</span></li>)}
        <li><span className={`onb-dot${imported ? ' ok' : ''}`} /><b>Uploaded data</b><span>{imported ? `${imported.toLocaleString()} records imported` : 'Nothing yet · Settings → Upload data'}</span></li>
      </ul>
      <p className="onb-hint" style={{ marginTop: 16 }}>Tip: on an iPhone, run <code>./halo phone</code> on the Mac to open Halo Labs from anywhere on your Tailscale network.</p>
    </Step>
  )
}

// ---- icons (stroke, 24px) ---------------------------------------------------------------------------------

const svg = (d: ReactNode) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
function IconSpark() { return svg(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8l1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z" /></>) }
function IconPulse() { return svg(<path d="M3 12h4l2.5-6 4 12L16 12h5" />) }
function IconRoute() { return svg(<><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" /></>) }
function IconWave() { return svg(<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />) }
function IconLock() { return svg(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>) }
function IconOut() { return svg(<><path d="M14 4h6v6M20 4l-8 8" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>) }
function IconShield() { return svg(<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />) }
function IconHeart() { return svg(<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />) }
function IconUp() { return svg(<><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>) }
function IconCheck() { return svg(<><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></>) }
function IconFlame() { return svg(<path d="M12 21c-3.5 0-6-2.4-6-5.6 0-3.8 3.5-5.4 3.5-9.4 2.8 1.6 4 3.6 4 5.6 1-.6 1.6-1.6 1.8-2.8 1.6 1.5 2.7 3.6 2.7 6.4 0 3.3-2.5 5.8-6 5.8z" />) }
