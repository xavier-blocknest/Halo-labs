// JSON GET with bearer auth, retries on 5xx/network errors, and a typed error on rate limits.
export class RateLimited extends Error {
  constructor(service: string, detail: string) { super(`${service} rate limit reached (${detail}); will resume next run`) }
}

// Minimum gap between requests per service, to stay under the per-minute limits
// (WHOOP: 100/min; Strava: 100 per 15 min, which polling never approaches).
const MIN_GAP_MS: Record<string, number> = { WHOOP: 700 }
const lastCall = new Map<string, number>()
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function getJson<T>(service: string, url: string, token: string, attempt = 0): Promise<T> {
  const gap = MIN_GAP_MS[service] ?? 0
  const wait = (lastCall.get(service) ?? 0) + gap - Date.now()
  if (wait > 0) await sleep(wait)
  lastCall.set(service, Date.now())
  let res: Response
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) })
  } catch (e) {
    if (attempt < 2) return backoff(attempt).then(() => getJson<T>(service, url, token, attempt + 1))
    throw e
  }
  if (res.status === 429) {
    // Wait out a short window (WHOOP sends seconds until reset) and retry; give up on long ones.
    const h = res.headers, reset = Number(h.get('retry-after') ?? h.get('x-ratelimit-reset'))
    if (Number.isFinite(reset) && reset > 0 && reset <= 90 && attempt < 3) {
      await sleep((reset + 1) * 1000)
      return getJson<T>(service, url, token, attempt + 1)
    }
    throw new RateLimited(service, h.get('x-ratelimit-reset') ?? h.get('x-readratelimit-usage') ?? h.get('x-ratelimit-usage') ?? 'no reset header')
  }
  if (res.status >= 500 && attempt < 2) return backoff(attempt).then(() => getJson<T>(service, url, token, attempt + 1))
  if (!res.ok) throw new Error(`${service} ${res.status} on ${new URL(url).pathname}: ${(await res.text()).slice(0, 200)}`)
  return res.json() as Promise<T>
}

const backoff = (attempt: number) => new Promise(r => setTimeout(r, 1000 * 2 ** attempt))

/** Local calendar day for a UTC timestamp and an offset like "-06:00". */
export function localDay(isoUtc: string, offset = '+00:00', shiftHours = 0): string {
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(offset)
  const mins = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  return new Date(Date.parse(isoUtc) + (mins + shiftHours * 60) * 60_000).toISOString().slice(0, 10)
}
