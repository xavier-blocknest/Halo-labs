// API keys and other settings entered in Settings → APIs. Stored encrypted in the database (secrets table, like the
// OAuth tokens); a value in .env is used when nothing has been saved in the app. Values are never sent back to
// the browser, only whether they're set and the last 4 characters.
import { getSecret, setSecret } from './db.ts'

export type SettingId = (typeof SETTINGS)[number]['id']
type Setting = { id: string; group: string; label: string; secret: boolean; hint: string; placeholder?: string }

export const SETTINGS = [
  { id: 'HALO_NAME', group: 'Profile', label: 'Your first name', secret: false, hint: 'The coach and the greeting use it.' },
  { id: 'ANTHROPIC_API_KEY', group: 'Claude (coach)', label: 'API key', secret: true, placeholder: 'sk-ant-…',
    hint: 'console.anthropic.com → API keys. Powers the coach, the morning brief, coach memory notes and journal formatting.' },
  { id: 'ELEVENLABS_API_KEY', group: 'ElevenLabs (voice)', label: 'API key', secret: true,
    hint: 'elevenlabs.io → Developers → API keys. Used to hear you (speech-to-text) and to speak the coach\'s replies. Give the key Speech to Text and Text to Speech access.' },
  { id: 'ELEVENLABS_VOICE_ID', group: 'ElevenLabs (voice)', label: 'Voice ID', secret: false, placeholder: 'Voice ID',
    hint: 'ElevenLabs → Voices → pick a voice → copy its ID. Premade voices work on the free plan.' },
  { id: 'WHOOP_CLIENT_ID', group: 'WHOOP', label: 'Client ID', secret: false, hint: 'developer.whoop.com → your app.' },
  { id: 'WHOOP_CLIENT_SECRET', group: 'WHOOP', label: 'Client secret', secret: true, hint: '' },
  { id: 'STRAVA_CLIENT_ID', group: 'Strava', label: 'Client ID', secret: false, hint: 'strava.com/settings/api → your app.' },
  { id: 'STRAVA_CLIENT_SECRET', group: 'Strava', label: 'Client secret', secret: true, hint: '' },
  { id: 'GITHUB_TOKEN', group: 'GitHub (updates)', label: 'Access token', secret: true, placeholder: 'github_pat_…',
    hint: 'Only needed if the Halo Labs repository is private: a fine-grained token with read access to its Contents.' },
  { id: 'B2_KEY_ID', group: 'Backblaze B2 (optional off-site backups)', label: 'Key ID', secret: false, hint: 'Backblaze → Application Keys. Leave empty to skip off-site backups.' },
  { id: 'B2_APP_KEY', group: 'Backblaze B2 (optional off-site backups)', label: 'Application key', secret: true, hint: '' },
  { id: 'B2_BUCKET', group: 'Backblaze B2 (optional off-site backups)', label: 'Bucket name', secret: false, placeholder: 'HaloLabs', hint: 'A private bucket.' },
] as const satisfies readonly Setting[]

const known = (id: string): id is SettingId => SETTINGS.some(s => s.id === id)
const saved = (): Record<string, string> => {
  try { return getSecret<Record<string, string>>('settings') ?? {} } catch { return {} } // no database open (restore script)
}
const listeners: (() => void)[] = []

/** The setting's value: saved in the app, else from .env, else ''. */
export function setting(id: SettingId): string {
  return (saved()[id] ?? process.env[id] ?? '').trim()
}

/** Called after any change (e.g. to rebuild the Anthropic client). */
export const onSettingsChange = (f: () => void) => { listeners.push(f) }

/** What Settings shows: never the value of a secret, only whether it's set (and where from). */
export function listSettings() {
  const s = saved()
  return SETTINGS.map(d => {
    const v = (s[d.id] ?? process.env[d.id] ?? '').trim()
    return {
      ...d, set: !!v, from: s[d.id] != null ? 'app' : process.env[d.id] ? 'env' : null,
      value: d.secret ? null : v, last4: d.secret && v.length > 8 ? v.slice(-4) : null,
    }
  })
}

/** Save the given values; an empty string clears the saved value (the .env one, if any, applies again). */
export function saveSettings(values: Record<string, unknown>) {
  const s = saved()
  for (const [id, raw] of Object.entries(values)) {
    if (!known(id)) throw new Error(`Unknown setting ${id}`)
    const v = String(raw ?? '').trim()
    if (v.length > 400) throw new Error('That value is too long.')
    if (v) s[id] = v; else delete s[id]
  }
  setSecret('settings', s)
  for (const f of listeners) f()
}
