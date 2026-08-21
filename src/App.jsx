import { useEffect, useState } from 'react'
import { loadState, saveState, storageUsage, uid, SAVE_OK, SAVE_FULL } from './lib/storage.js'
import Rankings from './screens/Rankings.jsx'
import WantToTry from './screens/WantToTry.jsx'
import Translator from './screens/Translator.jsx'
import Explore from './screens/Explore.jsx'
import FX from './screens/FX.jsx'
import LogVisit from './screens/LogVisit.jsx'
import BakeryDetail from './screens/BakeryDetail.jsx'
import DiscoverDetail from './screens/DiscoverDetail.jsx'
import { IconRank, IconBookmark, IconGlobe, IconExplore, IconFx } from './components/Icons.jsx'

// Each tab owns a hue along the brand gradient (blue → purple → magenta → gold);
// full colour when active, dimmed to 55% when not. Add stays the gradient chip.
const TAB_COLORS = {
  rankings: ['#1AA7E8', 'rgba(26,167,232,0.55)'],
  want: ['#3B73DF', 'rgba(59,115,223,0.55)'],
  translate: ['#7E36C9', 'rgba(126,54,201,0.55)'],
  fx: ['#B5299E', 'rgba(181,41,158,0.55)'],
  explore: ['#A9702E', 'rgba(169,112,46,0.55)'],
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('rankings')
  const [logging, setLogging] = useState(false)
  const [prefill, setPrefill] = useState(null) // { name, area } when logging from Want-to-try
  const [detailId, setDetailId] = useState(null)
  const [discoverItem, setDiscoverItem] = useState(null) // famous bakery opened from Discover
  const [rankFilter, setRankFilter] = useState('all') // bread filter for the Rankings list
  const [saveIssue, setSaveIssue] = useState(null) // null | SAVE_FULL | SAVE_BLOCKED

  // A failed write used to be invisible: the app kept working from memory and
  // everything vanished on reload. Surface it instead.
  useEffect(() => {
    const result = saveState(state)
    setSaveIssue(result === SAVE_OK ? null : result)
  }, [state])

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
      </header>

      {storageWarning && (
        <div className={`storage-warn${saveIssue ? ' bad' : ''}`} role="alert">
          {storageWarning}
        </div>
      )}

      {tab === 'rankings' && (
        <Rankings
          bakeries={state.bakeries}
          filter={rankFilter}
          onFilter={setRankFilter}
          onOpen={(id) => setDetailId(id)}
          onLog={() => openLog()}
        />
      )}
      {tab === 'want' && (
        <WantToTry
          wantToTry={state.wantToTry}
          onChange={(wantToTry) => update({ wantToTry })}
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

      <nav className="tabbar">
        <button
          className={tab === 'rankings' ? 'active' : ''}
          style={{ color: tc('rankings') }}
          onClick={() => setTab('rankings')}
        >
          <IconRank />
          Rankings
        </button>
        <button
          className={tab === 'want' ? 'active' : ''}
          style={{ color: tc('want') }}
          onClick={() => setTab('want')}
        >
          <IconBookmark />
          Want to try
        </button>
        <button
          className={tab === 'translate' ? 'active' : ''}
          style={{ color: tc('translate') }}
          onClick={() => setTab('translate')}
        >
          <IconGlobe />
          Translate
        </button>
        <button
          className={tab === 'fx' ? 'active' : ''}
          style={{ color: tc('fx') }}
          onClick={() => setTab('fx')}
        >
          <IconFx />
          FX
        </button>
        <button
          className={tab === 'explore' ? 'active' : ''}
          style={{ color: tc('explore') }}
          onClick={() => setTab('explore')}
        >
          <IconExplore />
          Explore
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
