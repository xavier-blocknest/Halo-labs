// The prototype keeps everything in localStorage. Keys that describe the athlete's day (injuries,
// diet log, coach history, ...) are mirrored to the server so every device sees the
// same state. Per-device preferences (last page, sound, voice) stay local.
const SHARED = new Set(['im4-al', 'im4-diet', 'im4-pchk', 'im4-wchk', 'im4-inj', 'im4-chat', 'im4-brief', 'im4-supps', 'im4-rwgoal', 'im4-coach'])

function push(key: string, value: string | null) {
  const init: RequestInit = value === null
    ? { method: 'DELETE' }
    : { method: 'PUT', body: value, headers: { 'Content-Type': 'text/plain' } }
  fetch(`/api/state/${key}`, { ...init, keepalive: true }).catch(() => { /* offline: localStorage still has it */ })
}

let patched = false

export async function hydrateSharedState() {
  try {
    const res = await fetch('/api/state')
    if (res.ok) {
      const remote = (await res.json()) as Record<string, string>
      for (const key of SHARED) {
        if (key in remote) localStorage.setItem(key, remote[key])
        else localStorage.removeItem(key)
      }
    }
  } catch {
    // Server unreachable: run on whatever this device has.
  }
  if (patched) return
  patched = true
  // Patch the prototype: assigning localStorage.setItem directly would store an item named "setItem".
  const { setItem, removeItem } = Storage.prototype
  Storage.prototype.setItem = function (key: string, value: string) {
    setItem.call(this, key, value)
    if (this === localStorage && SHARED.has(key)) push(key, String(value))
  }
  Storage.prototype.removeItem = function (key: string) {
    removeItem.call(this, key)
    if (this === localStorage && SHARED.has(key)) push(key, null)
  }
}
