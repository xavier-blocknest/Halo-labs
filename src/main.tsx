import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary, reportError } from './app/ErrorBoundary'
import './claude'

window.addEventListener('error', e => reportError('window', e.error ?? e.message))
window.addEventListener('unhandledrejection', e => reportError('promise', e.reason))

// Notifications need the service worker registered (it does nothing else; see public/sw.js).
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
