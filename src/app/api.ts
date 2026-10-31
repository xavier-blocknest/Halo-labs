// Typed client for the Halo Labs server API.

export type Connector = {
  id: 'whoop' | 'strava'
  configured: boolean
  connected: boolean
  syncing: boolean
  lastSync: string | null
  lastError: { finished_at: string; detail: string } | null
}

export type RecordCount = { source: string; kind: string; n: number; first: string | null; last: string | null; synced: string }

export type ImportLogEntry = {
  name: string | null; source: string | null; importer: string | null
  status: 'imported' | 'unrecognized' | 'failed'; records: number; detail: string | null; imported_at: string
}

export type Sources = { connectors: Connector[]; records: RecordCount[]; imports: ImportLogEntry[] }

export type ImportResult = {
  file: string
  status: 'imported' | 'duplicate' | 'unrecognized' | 'failed'
  importer?: string
  records?: number
  detail?: string
}

export async function getSources(): Promise<Sources> {
  const res = await fetch('/api/sources')
  if (!res.ok) throw new Error(`Couldn't load sources (${res.status})`)
  return res.json()
}

/** Upload one file with progress (fetch can't report upload progress, XHR can). */
export function uploadFile(file: File, onProgress: (fraction: number) => void): Promise<ImportResult[]> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/import')
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name))
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText).results)
      else {
        let msg = `Upload failed (${xhr.status})`
        try { msg = JSON.parse(xhr.responseText).error ?? msg } catch { /* not JSON */ }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('Network error: is Halo Labs running? (./halo start)'))
    xhr.send(file)
  })
}

export async function syncNow(id: Connector['id']): Promise<void> {
  const res = await fetch(`/api/sync/${id}`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Sync failed (${res.status})`)
}
