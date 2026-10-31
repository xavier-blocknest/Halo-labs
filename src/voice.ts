// Microphone capture for the coach: records PCM with Web Audio (same path in Safari and Chrome), detects the end
// of an utterance, and encodes 16 kHz mono WAV for speech-to-text (/api/transcribe → ElevenLabs).

const TARGET_RATE = 16_000
const MAX_SECONDS = 60

export type Recorder = { stop: () => Promise<Blob | null>; cancel: () => void }

type Options = {
  /** Called once speech has started and then stayed quiet this long (ms). Omit for push-to-talk. */
  endOnSilenceMs?: number
  /** Live input level 0..1, for the waveform. */
  onLevel?: (level: number) => void
  /** Fired when the silence detector decides the utterance is over. */
  onEnd?: () => void
}

/** iOS (17+) Audio Session API. Opening the mic switches the page to play-and-record, which routes output to the
 *  earpiece; in a home-screen web app it often stays there after the mic closes, so the coach whispers from the ear
 *  speaker. Set the session explicitly: play-and-record while capturing, playback (loudspeaker) once the mic is off. */
function setAudioSession(type: 'playback' | 'play-and-record') {
  try { const s = (navigator as { audioSession?: { type: string } }).audioSession; if (s) s.type = type } catch { /* unsupported */ }
}

export async function startRecording(opts: Options = {}): Promise<Recorder> {
  setAudioSession('play-and-record')
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
    .catch(e => { setAudioSession('playback'); throw e })
  const ctx = new AudioContext()
  if (ctx.state === 'suspended') await ctx.resume() // iOS starts audio contexts paused
  const source = ctx.createMediaStreamSource(stream)
  const node = ctx.createScriptProcessor(4096, 1, 1) // widely supported (incl. iOS Safari); fine for short clips
  const chunks: Float32Array[] = []
  let heard = false, quietSince = 0, ended = false, noiseFloor = 0.01
  const started = performance.now()

  node.onaudioprocess = e => {
    const data = e.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(data))
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
    const rms = Math.sqrt(sum / data.length)
    opts.onLevel?.(Math.min(1, rms * 12))
    if (!heard) noiseFloor = noiseFloor * 0.95 + rms * 0.05 // learn the room before speech starts
    const speaking = rms > Math.max(0.015, noiseFloor * 3)
    const now = performance.now()
    if (speaking) { heard = true; quietSince = 0 } else if (heard && !quietSince) quietSince = now
    const silenceDone = opts.endOnSilenceMs && heard && quietSince && now - quietSince > opts.endOnSilenceMs
    if (!ended && (silenceDone || now - started > MAX_SECONDS * 1000)) { ended = true; opts.onEnd?.() }
  }
  source.connect(node)
  node.connect(ctx.destination)

  const teardown = () => { node.disconnect(); source.disconnect(); stream.getTracks().forEach(t => t.stop()); void ctx.close(); setAudioSession('playback') }
  return {
    cancel: teardown,
    stop: async () => {
      const rate = ctx.sampleRate
      teardown()
      if (!heard) return null
      return encodeWav(downsample(concat(chunks), rate, TARGET_RATE), TARGET_RATE)
    },
  }
}

export async function transcribe(wav: Blob): Promise<string> {
  const res = await fetch('/api/transcribe', { method: 'POST', body: wav, headers: { 'Content-Type': 'audio/wav' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Transcription failed (${res.status})`)
  return data.text ?? ''
}

function concat(chunks: Float32Array[]) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let o = 0
  for (const c of chunks) { out.set(c, o); o += c.length }
  return out
}

/** Average-based resampling to 16 kHz (input is mic audio at 44.1/48 kHz). */
function downsample(input: Float32Array, from: number, to: number) {
  if (from === to) return input
  const ratio = from / to, out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio), b = Math.min(input.length, Math.floor((i + 1) * ratio))
    let s = 0
    for (let j = a; j < b; j++) s += input[j]
    out[i] = s / Math.max(1, b - a)
  }
  return out
}

function encodeWav(samples: Float32Array, rate: number) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf)
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) { const x = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true) }
  return new Blob([buf], { type: 'audio/wav' })
}

/** Whether speech-to-text is set up (an ElevenLabs key in Settings → APIs). */
export async function voiceReady(): Promise<boolean> {
  try { return (await (await fetch('/api/voice')).json()).ready === true } catch { return false }
}
