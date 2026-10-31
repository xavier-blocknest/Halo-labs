import { Component, type ReactNode } from 'react'

/** Report a client-side error to the server log (./halo logs). Best effort. */
export function reportError(kind: string, error: unknown, extra = '') {
  const e = error as Error
  const body = JSON.stringify({ kind, message: String(e?.message ?? error).slice(0, 500), stack: String(e?.stack ?? '').slice(0, 2000), extra: extra.slice(0, 500), ua: navigator.userAgent, url: location.pathname })
  fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
}

/** Shows what went wrong instead of a blank screen, and reports it. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) { reportError('render', error, info.componentStack ?? '') }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="lock">
        <div className="lock-card">
          <div className="lock-brand">HALO<small>LABS</small></div>
          <p className="lock-text">Something went wrong while drawing the dashboard. It has been written to the Halo Labs log (./halo logs).</p>
          <p className="lock-error" style={{ wordBreak: 'break-word' }}>{this.state.error.message}</p>
          <button className="lock-btn" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
