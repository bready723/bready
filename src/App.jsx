import { useCallback, useEffect, useRef, useState } from 'react'
import { loadState, saveState, storageUsage, uid, SAVE_OK, SAVE_FULL } from './lib/storage.js'
import Rankings from './screens/Rankings.jsx'
import Translator from './screens/Translator.jsx'
import Explore from './screens/Explore.jsx'
import FX from './screens/FX.jsx'
import LogVisit from './screens/LogVisit.jsx'
import BakeryDetail from './screens/BakeryDetail.jsx'
import DiscoverDetail from './screens/DiscoverDetail.jsx'
import SignIn from './screens/SignIn.jsx'
import { IconRank, IconGlobe, IconExplore, IconFx } from './components/Icons.jsx'
import { onAuthChange, isCloudConfigured } from './lib/auth.js'
import { reconcileOnSignIn, pushChanges, markSynced, syncPhotos, resolvePhotos, explainCloudError } from './lib/cloud.js'

// Each tab owns a hue along the brand gradient (blue → purple → magenta → gold);
// full colour when active, dimmed to 55% when not. Add stays the gradient chip.
const TAB_COLORS = {
  rankings: ['#1AA7E8', 'rgba(26,167,232,0.55)'],
  translate: ['#7E36C9', 'rgba(126,54,201,0.55)'],
  fx: ['#B5299E', 'rgba(181,41,158,0.55)'],
  explore: ['#A9702E', 'rgba(169,112,46,0.55)'],
}

function cloudMessage(result) {
  switch (result.action) {
    case 'uploaded':
      return { tone: 'good', text: `Backed up to your account — ${result.count} items saved.` }
    case 'downloaded':
      return { tone: 'good', text: `Loaded ${result.count} bakeries from your account.` }
    case 'upload-failed':
      return { tone: 'bad', text: `Could not back up: ${explainCloudError(result.error)}. Your data is still here.` }
    case 'download-failed':
      return { tone: 'bad', text: `Could not load your account: ${explainCloudError(result.error)}` }
    default:
      return { tone: 'good', text: 'Synced.' }
  }
}

export default function App() {
  const [state, setState] = useState(loadState)
  const stateRef = useRef(state) // latest state, readable from async callbacks
  const syncedFor = useRef(null) // user id we have already reconciled for
  const [tab, setTab] = useState('rankings')
  const [logging, setLogging] = useState(false)
  const [prefill, setPrefill] = useState(null) // { name, area } when logging from Want-to-try
  const [detailId, setDetailId] = useState(null)
  const [discoverItem, setDiscoverItem] = useState(null) // famous bakery opened from Discover
  const [rankFilter, setRankFilter] = useState('all') // bread filter for the Rankings list
  const [saveIssue, setSaveIssue] = useState(null) // null | SAVE_FULL | SAVE_BLOCKED
  const [user, setUser] = useState(null)
  const [showSignIn, setShowSignIn] = useState(false)

  const [cloudStatus, setCloudStatus] = useState(null) // {tone, text} or null
  const [pushState, setPushState] = useState('idle') // idle | saving | held
  const pushing = useRef(false)

  // Signing in is optional — the app worked without an account before there was
  // one, and still does. This only tracks who is signed in, if anyone.
  useEffect(() => onAuthChange(setUser), [])

  // The one moment that matters: someone just signed in. Push what this browser
  // holds, or pull the account if this browser is empty. Never both, and never
  // a delete — the local copy may be the only one that exists.
  useEffect(() => {
    if (!user) return
    // Supabase reports the session twice on load — once when we ask, once from
    // the auth listener — and each report re-ran the whole upload, which is how
    // every visit ended up in the account twice. Once per signed-in user, ever.
    if (syncedFor.current === user.id) return
    syncedFor.current = user.id
    let cancelled = false
    setCloudStatus({ tone: 'busy', text: 'Syncing…' })
    // Read the current state through a ref, not by peeking inside a state
    // updater: React is free to call an updater more than once, which would
    // start the upload twice.
    // Move photos to the bucket before the first upload, or a fresh sign-in
    // ships every JPEG into a database column and then replaces it a second
    // later. Does nothing when there is nothing to move.
    syncPhotos(stateRef.current, user)
      .then((moved) => {
        if (moved.state !== stateRef.current) setState(moved.state)
        return reconcileOnSignIn(moved.state, user)
      })
      .then((result) => {
        if (cancelled) return
        if (result.state) setState(result.state)
        if (result.error) syncedFor.current = null // a failure should be retryable
        // Local and the account agree as of right now. Recording that is what
        // stops the very next push re-uploading every bakery and every photo.
        if (!result.error) markSynced(result.state || stateRef.current, user)
        setCloudStatus(cloudMessage(result))
      })
    return () => {
      cancelled = true
    }
  }, [user])

  // A failed write used to be invisible: the app kept working from memory and
  // everything vanished on reload. Surface it instead.
  useEffect(() => {
    const result = saveState(state)
    setSaveIssue(result === SAVE_OK ? null : result)
    stateRef.current = state
  }, [state])

  // Keep the account up to date as Sara works, not only at sign-in. Before
  // this, a bakery added on Tuesday reached the cloud whenever she next signed
  // in — which is the "my photos are not there" problem the cloud was meant to
  // end. Debounced, because typing a name is a dozen state changes.
  const pushNow = useCallback(async () => {
    if (!user || pushing.current) return
    pushing.current = true
    try {
      // Photos move to the bucket first, so the row that follows carries a path
      // instead of the whole JPEG. A failure here is not fatal: the picture
      // stays inline and the next push tries again.
      const moved = await syncPhotos(stateRef.current, user)
      if (moved.state !== stateRef.current) setState(moved.state)
      const result = await pushChanges(moved.state, user)
      if (result.reason === 'not-signed-in') return
      setPushState(result.ok && !moved.error ? 'idle' : 'held')
    } finally {
      pushing.current = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    setPushState((p) => (p === 'held' ? 'held' : 'saving'))
    const t = setTimeout(pushNow, 900)
    return () => clearTimeout(t)
  }, [state, user, pushNow])

  // Photos that live in the bucket arrive as a path, not a picture. Fetch a
  // viewable link for each one. The links are signed and expire, which is why
  // saveState drops them and this runs again on the next launch.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    resolvePhotos(stateRef.current).then((result) => {
      if (cancelled || result.state === stateRef.current) return
      setState(result.state)
    })
    return () => { cancelled = true }
  }, [user, state])

  // A change made on the subway is held, not lost. Send it the moment there is
  // a network again, or when Sara comes back to the app.
  useEffect(() => {
    if (!user) return
    const retry = () => { if (navigator.onLine) pushNow() }
    const onVisible = () => { if (document.visibilityState === 'visible') retry() }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, pushNow])

  const update = (patch) => setState((s) => ({ ...s, ...patch }))

  // Merge a patch into one bakery (used to cache geocoded coordinates + photos).
  const updateBakery = (id, patch) =>
    setState((s) => ({
      ...s,
      bakeries: s.bakeries.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))

  // Finished logging a visit -> adopt the new ranked list and clear it off the
  // want-to-try list if it was there.
  function handleLogged({ bakeries, loggedName, wishlistId }) {
    setState((s) => ({
      ...s,
      bakeries,
      wantToTry: s.wantToTry.filter(
        (w) =>
          w.id !== wishlistId &&
          w.name.trim().toLowerCase() !== loggedName.trim().toLowerCase(),
      ),
    }))
    setLogging(false)
    setPrefill(null)
  }

  function openLog(prefillEntry = null) {
    setPrefill(prefillEntry)
    setLogging(true)
  }

  const detailBakery = state.bakeries.find((b) => b.id === detailId) || null
  const tc = (key) => TAB_COLORS[key][tab === key ? 0 : 1]

  // Photos are stored as data URLs, so the browser's ~5MB runs out after a few
  // dozen. Warn before that, and shout once writes actually start failing.
  const usage = storageUsage(state)
  const storageWarning = saveIssue
    ? saveIssue === SAVE_FULL
      ? "This browser's storage is full — your latest change was NOT saved. Remove a few bakery photos to free space."
      : "This browser is blocking storage, so nothing is being saved. Private browsing does this."
    : usage.nearlyFull
      ? `Storage is ${Math.round(usage.ratio * 100)}% full. Photos take the most room — once it fills, new visits stop saving.`
      : null

  return (
    <div className="app">
      <header className="appbar">
        <span className="wordmark">bready</span>
        {tab === 'rankings' && state.bakeries.length > 0 && (
          <span className="sub">{state.bakeries.length} ranked</span>
        )}
        {isCloudConfigured() && (
          <button
            className={`signin-chip${user && pushState === 'held' ? ' held' : ''}`}
            onClick={() => setShowSignIn(true)}
          >
            {!user ? 'Sign in' : pushState === 'held' ? 'Not saved' : pushState === 'saving' ? 'Saving…' : 'Synced'}
          </button>
        )}
      </header>

      {storageWarning && (
        <div className={`storage-warn${saveIssue ? ' bad' : ''}`} role="alert">
          {storageWarning}
        </div>
      )}

      {cloudStatus && (
        <div className={`cloud-status ${cloudStatus.tone}`} role="status" onClick={() => setCloudStatus(null)}>
          {cloudStatus.text}
        </div>
      )}

      {tab === 'rankings' && (
        <Rankings
          bakeries={state.bakeries}
          filter={rankFilter}
          onFilter={setRankFilter}
          onOpen={(id) => setDetailId(id)}
          onLog={() => openLog()}
          wantToTry={state.wantToTry}
          onChangeWant={(wantToTry) => update({ wantToTry })}
          onWent={(entry) => openLog(entry)}
          onOpenDiscover={(b) => setDiscoverItem(b)}
        />
      )}
      {tab === 'translate' && (
        <Translator country={state.country} onCountry={(country) => update({ country })} />
      )}
      {tab === 'explore' && (
        <Explore
          bakeries={state.bakeries}
          notes={state.notes}
          onChangeNotes={(notes) => update({ notes })}
          onOpen={(id) => setDetailId(id)}
          onUpdateBakery={updateBakery}
          onPickBread={(key) => {
            setRankFilter(key)
            setTab('rankings')
          }}
        />
      )}
      {tab === 'fx' && (
        <FX currency={state.fxCurrency} onCurrency={(fxCurrency) => update({ fxCurrency })} />
      )}

      {showSignIn && (
        <SignIn user={user} onClose={() => setShowSignIn(false)} onSignedOut={() => setUser(null)} />
      )}

      <nav className="tabbar">
        <button
          className={tab === 'rankings' ? 'active' : ''}
          style={{ color: tc('rankings') }}
          onClick={() => setTab('rankings')}
          aria-label="Rankings"
          title="Rankings"
        >
          <IconRank />
        </button>
        <button
          className={tab === 'translate' ? 'active' : ''}
          style={{ color: tc('translate') }}
          onClick={() => setTab('translate')}
          aria-label="Translate"
          title="Translate"
        >
          <IconGlobe />
        </button>
        <button
          className={tab === 'fx' ? 'active' : ''}
          style={{ color: tc('fx') }}
          onClick={() => setTab('fx')}
          aria-label="FX"
          title="FX"
        >
          <IconFx />
        </button>
        <button
          className={tab === 'explore' ? 'active' : ''}
          style={{ color: tc('explore') }}
          onClick={() => setTab('explore')}
          aria-label="Explore"
          title="Explore"
        >
          <IconExplore />
        </button>
      </nav>

      {logging && (
        <LogVisit
          bakeries={state.bakeries}
          prefill={prefill}
          onComplete={handleLogged}
          onCancel={() => {
            setLogging(false)
            setPrefill(null)
          }}
        />
      )}

      {detailBakery && (
        <BakeryDetail
          bakery={detailBakery}
          onClose={() => setDetailId(null)}
          onUpdateBakery={updateBakery}
        />
      )}

      {discoverItem && (
        <DiscoverDetail
          bakery={discoverItem}
          added={state.wantToTry.some(
            (w) => w.name.trim().toLowerCase() === discoverItem.name.trim().toLowerCase(),
          )}
          onClose={() => setDiscoverItem(null)}
          onAdd={(b) =>
            setState((s) => ({
              ...s,
              wantToTry: [
                { id: uid(), name: b.name, area: b.area, photo: b.photo, lat: b.lat, lng: b.lng, city: b.city },
                ...s.wantToTry,
              ],
            }))
          }
          onWent={(b) => {
            setDiscoverItem(null)
            openLog({ name: b.name, area: b.area, photo: b.photo, lat: b.lat, lng: b.lng, city: b.city })
          }}
        />
      )}
    </div>
  )
}
