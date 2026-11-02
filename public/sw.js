// Halo Labs service worker: shows push notifications and opens the app when one is tapped. Nothing else:
// no fetch handler and no caching, so the app always loads fresh from the server.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let n = { title: '', body: '', tag: undefined, url: '/' }
  try { n = { ...n, ...e.data.json() } } catch { if (e.data) n.body = e.data.text() }
  e.waitUntil(self.registration.showNotification(n.title, { body: n.body, tag: n.tag, icon: '/apple-touch-icon.png', badge: '/favicon-32.png', data: { url: n.url } }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = new URL(e.notification.data?.url || '/', self.location.origin).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.location.origin))
    // Already open: bring it forward and tell it what to show (e.g. the month in review); else open it there.
    if (open) { open.postMessage({ open: url }); return open.focus() }
    return self.clients.openWindow(url)
  }))
})
