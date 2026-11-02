// A sideways slider (Body → Key lifts): no scrollbar; swipe on a phone, drag or arrow buttons on a desktop,
// cards snap into place, soft fades at an edge with more to see, dots show where you are (tap one to jump).
import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Slider({ children, count }: { children: ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [st, setSt] = useState({ left: false, right: false, page: 0, pages: 1 })
  const drag = useRef<{ x: number; s: number; moved: boolean } | null>(null)

  const measure = () => {
    const el = ref.current; if (!el) return
    const max = el.scrollWidth - el.clientWidth, card = el.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + 12 : el.clientWidth
    const pages = max > 2 ? Math.max(2, Math.ceil(max / step) + 1) : 1
    setSt({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2, page: max > 2 ? Math.round((el.scrollLeft / max) * (pages - 1)) : 0, pages })
  }
  useEffect(() => { measure(); const ro = new ResizeObserver(measure); if (ref.current) ro.observe(ref.current); return () => ro.disconnect() }, [count])

  const step = () => { const el = ref.current!, card = el.firstElementChild as HTMLElement | null; return card ? card.offsetWidth + 12 : el.clientWidth * 0.8 }
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * step(), behavior: 'smooth' })
  const to = (p: number) => { const el = ref.current!; el.scrollTo({ left: (el.scrollWidth - el.clientWidth) * (p / Math.max(1, st.pages - 1)), behavior: 'smooth' }) }

  // Mouse drag (touch already swipes natively). Snap is paused while dragging so it follows the pointer.
  const down = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; drag.current = { x: e.clientX, s: ref.current!.scrollLeft, moved: false }; ref.current!.classList.add('dragging') }
  const move = (e: React.PointerEvent) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) d.moved = true; ref.current!.scrollLeft = d.s - dx }
  const up = () => { const d = drag.current; if (!d) return; drag.current = null; const el = ref.current!; el.classList.remove('dragging')
    const s = step(); el.scrollTo({ left: Math.round(el.scrollLeft / s) * s, behavior: 'smooth' }) }
  const click = (e: React.MouseEvent) => { if (drag.current?.moved) e.preventDefault() }

  return (
    <div className="slider">
      <div className={`slider-track${st.left ? ' fade-l' : ''}${st.right ? ' fade-r' : ''}`} ref={ref} onScroll={measure}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onClickCapture={click}>
        {children}
      </div>
      {st.pages > 1 ? (<>
        <button className="slider-arrow l" aria-label="Previous" disabled={!st.left} onClick={() => by(-1)}>‹</button>
        <button className="slider-arrow r" aria-label="Next" disabled={!st.right} onClick={() => by(1)}>›</button>
        <div className="slider-dots">
          {Array.from({ length: st.pages }, (_, i) => <button key={i} aria-label={`Go to ${i + 1}`} className={i === st.page ? 'on' : ''} onClick={() => to(i)} />)}
        </div>
      </>) : null}
    </div>
  )
}
