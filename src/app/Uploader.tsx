import { useRef, useState, type DragEvent } from 'react'
import { FoldCard } from './Fold'
import { uploadFile, type ImportResult } from './api'

const ACCEPT = '.csv,.json,.xlsx,.pdf,.zip,.md,.txt'
const MAX_BYTES = 200_000_000

type Item = { id: number; name: string; size: number; progress: number; state: 'queued' | 'uploading' | 'done' | 'error'; results?: ImportResult[]; error?: string }

const STATUS_TEXT: Record<ImportResult['status'], string> = {
  imported: 'Imported', duplicate: 'Already imported', unrecognized: 'Not recognized', failed: 'Failed',
}

function summary(r: ImportResult) {
  if (r.status === 'imported') return `${r.importer} · ${r.records?.toLocaleString()} records`
  return r.detail ?? ''
}

const sizeText = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)

export function Uploader({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const busy = useRef(false)
  const queue = useRef<{ id: number; file: File }[]>([])
  const nextId = useRef(1)

  const update = (id: number, patch: Partial<Item>) => setItems(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)))

  async function drain() {
    if (busy.current) return
    busy.current = true
    while (queue.current.length) {
      const { id, file } = queue.current.shift()!
      if (file.size > MAX_BYTES) { update(id, { state: 'error', error: 'Over 200 MB: copy it to the inbox folder instead' }); continue }
      update(id, { state: 'uploading' })
      try {
        const results = await uploadFile(file, p => update(id, { progress: p }))
        update(id, { state: 'done', progress: 1, results })
      } catch (e) {
        update(id, { state: 'error', error: (e as Error).message })
      }
    }
    busy.current = false
    onDone() // refresh sources and history once the queue is through
  }

  function add(files: FileList | null) {
    if (!files?.length) return
    const added = [...files].map(file => ({ id: nextId.current++, file }))
    queue.current.push(...added)
    setItems(list => [...added.map(({ id, file }) => ({ id, name: file.name, size: file.size, progress: 0, state: 'queued' as const })), ...list])
    void drain()
  }

  const pending = items.filter(i => i.state === 'queued' || i.state === 'uploading').length
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }

  return (
    <FoldCard title="Upload data" meta={pending ? `Uploading ${pending}…` : 'Exports and PDFs'}>

      <button
        type="button"
        className={`dropzone${dragging ? ' over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
        <span className="drop-title">Drop exports here, or tap to choose</span>
        <span className="drop-sub">WHOOP, Strava, FitnessAI, Runna and MacroFactor exports, lab, DEXA and VO₂ PDFs, or a zip of them</span>
      </button>
      <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={e => { add(e.target.files); e.target.value = '' }} />

      {items.some(i => i.state === 'done' || i.state === 'error') && (
        <button className="link" style={{ marginTop: 12 }} onClick={() => setItems(list => list.filter(i => i.state === 'queued' || i.state === 'uploading'))}>Clear list</button>
      )}
      {items.length > 0 && (
        <ul className="uploads">
          {items.map(item => (
            <li key={item.id}>
              <div className="upload-row">
                <span className="upload-name" title={item.name}>{item.name}</span>
                <span className="upload-size">{sizeText(item.size)}</span>
              </div>
              {(item.state === 'queued' || item.state === 'uploading') && (
                <div className="bar"><div style={{ width: `${Math.round(item.progress * 100)}%` }} /></div>
              )}
              {item.state === 'uploading' && item.progress >= 1 && <p className="upload-note">Importing…</p>}
              {item.state === 'error' && <p className="upload-note alert">{item.error}</p>}
              {item.results?.map((r, i) => (
                <p key={i} className={`upload-note ${r.status}`}>
                  <span className="pill">{STATUS_TEXT[r.status]}</span>
                  {item.results!.length > 1 && <span className="upload-entry">{r.file.split('/').slice(1).join('/')}</span>}
                  <span>{summary(r)}</span>
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </FoldCard>
  )
}
