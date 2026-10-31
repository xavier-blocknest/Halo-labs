// Sample mode ("Explore with sample data"): the dashboard shows a made-up athlete from /api/sample/dashboard.
// While it's on, nothing may be saved: every write to the data API is answered here with a polite refusal, the
// coach runs without memory (no notes, no saved week plans), and browser state isn't mirrored to the server.
let on = false
let installed = false
export const READ_ONLY = 'This is sample data, so nothing is saved. Set up Halo Labs to start with your own.'

// Writes that stay allowed: the coach and voice (they only answer), setup itself, and error reports.
const ALLOWED = /^\/(api\/(complete|tts|transcribe|onboarding|settings|client-error)|auth\/)/

export const isSample = () => on

export function setSample(v: boolean) {
  on = v
  if (!v || installed) return
  installed = true
  const real = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const path = new URL(input instanceof Request ? input.url : String(input), location.href).pathname
    if (on && method !== 'GET' && method !== 'HEAD' && path.startsWith('/api/') && !ALLOWED.test(path))
      return Promise.resolve(new Response(JSON.stringify({ error: READ_ONLY }), { status: 409, headers: { 'Content-Type': 'application/json' } }))
    return real(input, init)
  }
}
