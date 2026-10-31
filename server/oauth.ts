// OAuth 2.0 for WHOOP and Strava. Tokens are stored encrypted. Both services rotate refresh tokens,
// so refreshes are single-flight per provider and the new token is persisted before it is used.
import { randomBytes } from 'node:crypto'
import { getSecret, setSecret } from './db.ts'
import { setting } from './settings.ts'

export type Provider = 'whoop' | 'strava'

type Tokens = { access_token: string; refresh_token: string; expires_at: number /* epoch ms */; scope?: string; athlete_id?: number }

type ProviderConfig = {
  authorizeUrl: string
  tokenUrl: string
  scope: string
  extraAuthParams?: Record<string, string>
  stateLength: number
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  whoop: {
    authorizeUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
    scope: 'offline read:recovery read:cycles read:workout read:sleep read:body_measurement', // profile isn't used
    stateLength: 8, // WHOOP: "must be eight characters long"
  },
  strava: {
    authorizeUrl: 'https://www.strava.com/oauth/authorize',
    tokenUrl: 'https://www.strava.com/oauth/token',
    scope: 'read,activity:read_all,profile:read_all',
    extraAuthParams: { approval_prompt: 'auto' },
    stateLength: 16,
  },
}

const refreshing = new Map<Provider, Promise<Tokens>>()

/** The address the browser uses: http://localhost:8787 on the Mac, or a Tailscale HTTPS name (PUBLIC_URL in .env). */
export const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost:8787').replace(/\/$/, '')
export const redirectUri = (p: Provider) => `${publicUrl()}/oauth/${p}/callback`

function creds(p: Provider) {
  const id = setting(p === 'whoop' ? 'WHOOP_CLIENT_ID' : 'STRAVA_CLIENT_ID'), secret = setting(p === 'whoop' ? 'WHOOP_CLIENT_SECRET' : 'STRAVA_CLIENT_SECRET')
  return id && secret ? { id, secret } : null
}

export const isConfigured = (p: Provider) => creds(p) !== null
export const isConnected = (p: Provider) => getSecret<Tokens>(`oauth:${p}`) !== null

export function authorizeUrl(p: Provider): string {
  const c = creds(p)
  if (!c) throw new Error(`${p} is not configured: add its client ID and secret in Settings → APIs`)
  const cfg = PROVIDERS[p]
  // Letters and digits only (WHOOP wants exactly 8 characters). Kept in the database so a server
  // restart mid-sign-in doesn't lose it; valid for 30 minutes.
  const state = randomBytes(16).toString('hex').slice(0, cfg.stateLength)
  const now = Date.now()
  const pending = (getSecret<Record<string, { provider: Provider; at: number }>>('oauth:pending') ?? {})
  for (const [k, v] of Object.entries(pending)) if (now - v.at > 30 * 60_000) delete pending[k]
  pending[state] = { provider: p, at: now }
  setSecret('oauth:pending', pending)
  const q = new URLSearchParams({ client_id: c.id, redirect_uri: redirectUri(p), response_type: 'code', scope: cfg.scope, state, ...cfg.extraAuthParams })
  return `${cfg.authorizeUrl}?${q}`
}

async function tokenRequest(p: Provider, params: Record<string, string>): Promise<Tokens> {
  const c = creds(p)!
  const res = await fetch(PROVIDERS[p].tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, ...params }),
  })
  const body = await res.json().catch(() => ({})) as Record<string, unknown>
  if (!res.ok) throw new Error(`${p} token request failed (${res.status}): ${JSON.stringify(body).slice(0, 200)}`)
  const expiresAt = typeof body.expires_at === 'number' ? body.expires_at * 1000 : Date.now() + Number(body.expires_in ?? 3600) * 1000
  const tokens: Tokens = {
    access_token: String(body.access_token),
    refresh_token: String(body.refresh_token),
    expires_at: expiresAt,
    scope: typeof body.scope === 'string' ? body.scope : undefined,
    athlete_id: (body.athlete as { id?: number } | undefined)?.id,
  }
  setSecret(`oauth:${p}`, tokens) // persist before anyone uses the new tokens
  return tokens
}

export async function handleCallback(p: Provider, url: URL) {
  const params = Object.fromEntries([...url.searchParams].map(([k, v]) => [k, k === 'code' ? '(redacted)' : v]))
  console.log(`${p} callback:`, JSON.stringify(params))
  const error = url.searchParams.get('error')
  if (error) throw new Error(`${p} declined the sign-in: ${error}${url.searchParams.get('error_description') ? ` (${url.searchParams.get('error_description')})` : ''}`)
  const state = url.searchParams.get('state') ?? ''
  const all = getSecret<Record<string, { provider: Provider; at: number }>>('oauth:pending') ?? {}
  const pending = all[state]
  delete all[state]
  setSecret('oauth:pending', all)
  if (!pending || pending.provider !== p) {
    console.warn(`${p} callback: unknown state ${JSON.stringify(state)}; pending: ${JSON.stringify(Object.keys(all))}`)
    throw new Error(state ? 'Sign-in expired or did not start here. Try connecting again.' : `${p} did not send back the sign-in check (state). Try connecting again.`)
  }
  const code = url.searchParams.get('code')
  if (!code) throw new Error(`${p} did not return a code`)
  await tokenRequest(p, { grant_type: 'authorization_code', code, redirect_uri: redirectUri(p) })
}

/** A valid access token, refreshing (once, even with concurrent callers) when it is about to expire. */
export async function accessToken(p: Provider): Promise<string> {
  const t = getSecret<Tokens>(`oauth:${p}`)
  if (!t) throw new Error(`${p} is not connected`)
  if (t.expires_at - Date.now() > 120_000) return t.access_token
  let job = refreshing.get(p)
  if (!job) {
    const params: Record<string, string> = { grant_type: 'refresh_token', refresh_token: t.refresh_token }
    if (p === 'whoop') params.scope = 'offline'
    job = tokenRequest(p, params).finally(() => refreshing.delete(p))
    refreshing.set(p, job)
  }
  return (await job).access_token
}

export async function disconnect(p: Provider) {
  const t = getSecret<Tokens>(`oauth:${p}`)
  if (t) {
    try {
      if (p === 'whoop') await fetch('https://api.prod.whoop.com/developer/v2/user/access', { method: 'DELETE', headers: { Authorization: `Bearer ${await accessToken(p)}` } })
      else {
        const c = creds(p)!
        await fetch('https://www.strava.com/oauth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}` },
          body: new URLSearchParams({ token: t.refresh_token, token_type_hint: 'refresh_token' }),
        })
      }
    } catch (e) {
      console.warn(`${p}: revoke failed, removing local tokens anyway`, e)
    }
  }
  setSecret(`oauth:${p}`, null)
}
