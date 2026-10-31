// The voice-mode orb from the Claude Design prototype (v4 "VoiceBlob"): an SVG blob that ripples with the mic level
// while listening, spins a dashed ring while thinking, and pulses with the words while speaking.
import { useEffect, useRef } from 'react'

export type VoiceMode = 'idle' | 'listening' | 'thinking' | 'speaking'

/** Shared with the voice-mode logic in builders.tsx: written there, read here every animation frame. */
export const VOICE = { mode: 'idle' as VoiceMode, level: 0, amp: 0, pulse: 0 }

export function VoiceBlob() {
  const path = useRef<SVGPathElement>(null), ring = useRef<SVGGElement>(null)
  useEffect(() => {
    let raf = 0, ph = 0
    const t0 = performance.now(), N = 72
    const tick = (now: number) => {
      const t = (now - t0) / 1000, m = VOICE.mode
      let lvl = 0.05
      if (m === 'listening') lvl = Math.min(1, VOICE.level * 1.6)
      else if (m === 'speaking') { const since = (now - VOICE.pulse) / 1000; lvl = 0.35 + 0.45 * Math.exp(-since * 5) + 0.15 * Math.abs(Math.sin(t * 9.3)) * Math.abs(Math.sin(t * 3.7)) }
      else if (m === 'thinking') lvl = 0.12
      VOICE.amp += (lvl - VOICE.amp) * (lvl > VOICE.amp ? 0.35 : 0.08)
      const a = VOICE.amp
      ph += (m === 'thinking' ? 2.2 : 0.6 + a * 2.5) / 60
      const R = 100 * (1 + (m === 'idle' ? 0.03 * Math.sin(t * 1.6) : 0) + a * 0.12)
      let d = ''
      for (let i = 0; i <= N; i++) {
        const th = i / N * Math.PI * 2
        const n = Math.sin(th * 3 + ph * 1.3) * 0.5 + Math.sin(th * 5 - ph * 1.9) * 0.3 + Math.sin(th * 2 + ph * 0.7 + 1.2) * 0.4
        const rr = R * (1 + n * (0.025 + a * 0.16))
        d += (i ? 'L' : 'M') + (160 + Math.cos(th) * rr).toFixed(1) + ' ' + (160 + Math.sin(th) * rr).toFixed(1)
      }
      path.current?.setAttribute('d', d + 'Z')
      if (ring.current) { ring.current.setAttribute('transform', `rotate(${(ph * 40 % 360).toFixed(1)} 160 160)`); ring.current.style.opacity = m === 'thinking' ? '1' : '0' }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <svg viewBox="0 0 320 320" width="100%" height="100%" style={{ overflow: 'visible', filter: 'drop-shadow(0 0 40px oklch(0.82 0.13 210 / 0.45))' }}>
      <defs>
        <radialGradient id="vbG" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="oklch(0.97 0.05 205)" /><stop offset="35%" stopColor="oklch(0.82 0.13 210)" />
          <stop offset="75%" stopColor="oklch(0.55 0.16 240)" /><stop offset="100%" stopColor="oklch(0.35 0.12 265)" />
        </radialGradient>
        <radialGradient id="vbH" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="oklch(0.82 0.13 210 / 0)" /><stop offset="72%" stopColor="oklch(0.82 0.13 210 / 0.12)" /><stop offset="100%" stopColor="oklch(0.82 0.13 210 / 0)" />
        </radialGradient>
      </defs>
      <circle cx={160} cy={160} r={150} fill="url(#vbH)" />
      <g ref={ring} style={{ transition: 'opacity .4s' }}>
        <circle cx={160} cy={160} r={138} fill="none" stroke="oklch(0.82 0.13 210 / 0.7)" strokeWidth={2} strokeDasharray="2 14" strokeLinecap="round" />
      </g>
      <path ref={path} fill="url(#vbG)" />
      <ellipse cx={130} cy={118} rx={34} ry={20} fill="oklch(1 0 0 / 0.22)" style={{ filter: 'blur(8px)' }} />
    </svg>
  )
}
