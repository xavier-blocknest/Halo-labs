// The prototype calls window.claude.complete(), which only exists inside Claude Design.
// Here it goes to our own server, which holds the API key and picks the model.
import { isSample } from './sampleMode'
type Message = { role: 'user' | 'assistant'; content: string }
/** memory: chat and voice turns use the Coach memory (recalled on the server, and the exchange is saved). */
/** quick: no thinking (voice), so the first words arrive sooner. */
type CompleteRequest = { model?: string; max_tokens?: number; system?: string; messages: Message[]; memory?: boolean; page?: string; quick?: boolean }

async function complete(req: CompleteRequest): Promise<string> {
  const res = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: req.max_tokens, system: req.system, messages: req.messages, memory: req.memory && !isSample(), page: req.page }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Coach unavailable (${res.status})`)
  return (await res.json()).text
}

/** Same request, streamed: onText gets each chunk as Claude writes it; resolves with the full reply. A refusal
 *  resolves with the server's replacement text (partial text already shown should be replaced with it). */
async function stream(req: CompleteRequest, onText: (delta: string) => void): Promise<string> {
  const res = await fetch('/api/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_tokens: req.max_tokens, system: req.system, messages: req.messages, memory: req.memory && !isSample(), page: req.page, quick: req.quick, stream: true }),
  })
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Coach unavailable (${res.status})`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += value
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1)
      if (!line.trim()) continue
      const ev = JSON.parse(line) as { d?: string; done?: boolean; text?: string; error?: string; plan?: string }
      if (ev.error) throw new Error(ev.error)
      if (ev.plan) window.dispatchEvent(new Event('halolabs:data')) // the coach saved a week plan: reload so the Week page shows it
      if (ev.done) return ev.text ?? ''
      if (ev.d) onText(ev.d)
    }
  }
  throw new Error('Coach stopped unexpectedly')
}

declare global {
  interface Window { claude: { complete: typeof complete; stream: typeof stream } }
}

window.claude = { complete, stream }
