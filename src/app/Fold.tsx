import { useState, type ReactNode } from 'react'

const Chevron = ({ open }: { open: boolean }) => (
  <svg className={'fold-chev' + (open ? ' open' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
)

/** Settings card whose body opens from its header; collapsed by default. meta shows beside the title. */
export function FoldCard({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="card">
      <button className={'fold-head' + (open ? ' open' : '')} aria-expanded={open} onClick={() => setOpen(!open)}>
        <h2>{title}</h2>
        <span className="fold-meta">{meta}<Chevron open={open} /></span>
      </button>
      {/* hidden, not removed: an upload in progress keeps its state while the card is closed */}
      <div className="fold-body" hidden={!open}>{children}</div>
    </section>
  )
}

/** A titled group inside a card (e.g. a kind of coach note), with a count and its own toggle; collapsed by default. */
export function FoldGroup({ label, count, children }: { label: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={'fold-group' + (open ? ' open' : '')}>
      <button className="fold-group-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Chevron open={open} />
        <span className="fold-group-label">{label}</span>
        <span className="fold-count">{count}</span>
      </button>
      {open && <div className="fold-group-body">{children}</div>}
    </div>
  )
}
