import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './styles.css'

// Keep the installed app fresh. iOS Safari clings to the old service-worker
// cache, so new deploys used to get stuck behind it. Here we actively check for
// a new build every 60s and whenever the tab regains focus; with registerType
// 'autoUpdate' a found update activates (skipWaiting) and reloads on its own, so
// new versions land within about a minute instead of needing a manual cache wipe.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    setInterval(check, 60_000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
