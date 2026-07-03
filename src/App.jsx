import { useEffect, useState } from 'react'
import { loadState, saveState, uid } from './lib/storage.js'
import Rankings from './screens/Rankings.jsx'
import WantToTry from './screens/WantToTry.jsx'
import Translator from './screens/Translator.jsx'
import Explore from './screens/Explore.jsx'
import LogVisit from './screens/LogVisit.jsx'
import BakeryDetail from './screens/BakeryDetail.jsx'
import DiscoverDetail from './screens/DiscoverDetail.jsx'
import { IconRank, IconPlus, IconBookmark, IconGlobe, IconExplore } from './components/Icons.jsx'

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('rankings')
  const [logging, setLogging] = useState(false)
  const [prefill, setPrefill] = useState(null) // { name, area } when logging from Want-to-try
  const [detailId, setDetailId] = useState(null)
  const [discoverItem, setDiscoverItem] = useState(null) // famous bakery opened from Discover
  const [rankFilter, setRankFilter] = useState('all') // bread filter for the Rankings list

  useEffect(() => {
    saveState(state)
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

  return (
    <div className="app">
      <header className="appbar">
        <span className="wordmark">bready</span>
        {tab === 'rankings' && state.bakeries.length > 0 && (
          <span className="sub">{state.bakeries.length} ranked</span>
        )}
      </header>

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

      <nav className="tabbar">
        <button className={tab === 'rankings' ? 'active' : ''} onClick={() => setTab('rankings')}>
          <IconRank />
          Rankings
        </button>
        <button className={tab === 'want' ? 'active' : ''} onClick={() => setTab('want')}>
          <IconBookmark />
          Want to try
        </button>
        <button className="fab" onClick={() => openLog()}>
          <span className="fab-circle">
            <IconPlus width={15} height={15} />
          </span>
          Add
        </button>
        <button className={tab === 'translate' ? 'active' : ''} onClick={() => setTab('translate')}>
          <IconGlobe />
          Translate
        </button>
        <button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>
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
              wantToTry: [{ id: uid(), name: b.name, area: b.area }, ...s.wantToTry],
            }))
          }
          onWent={(b) => {
            setDiscoverItem(null)
            openLog({ name: b.name, area: b.area })
          }}
        />
      )}
    </div>
  )
}
