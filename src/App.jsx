import { useEffect, useState } from 'react'
import { loadState, saveState } from './lib/storage.js'
import Rankings from './screens/Rankings.jsx'
import WantToTry from './screens/WantToTry.jsx'
import Translator from './screens/Translator.jsx'
import LogVisit from './screens/LogVisit.jsx'
import BakeryDetail from './screens/BakeryDetail.jsx'

export function Croissant({ size = 26 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="croissant" aria-hidden="true">
      <defs>
        <linearGradient id="bgrad" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#1aa7e8" />
          <stop offset="0.5" stopColor="#5b3fd6" />
          <stop offset="1" stopColor="#e0218a" />
        </linearGradient>
      </defs>
      <g fill="url(#bgrad)" stroke="#2a1a4a" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M14 62 C16 46 28 35 41 32 L45 50 L30 60 Z" />
        <path d="M40 31 C46 30 54 30 60 31 L58 50 L42 50 Z" />
        <path d="M61 32 C74 36 84 47 86 62 L70 60 L56 50 Z" />
      </g>
    </svg>
  )
}

export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('rankings')
  const [logging, setLogging] = useState(false)
  const [prefill, setPrefill] = useState(null) // { name, area } when logging from Want-to-try
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  const update = (patch) => setState((s) => ({ ...s, ...patch }))

  // Finished logging a visit -> adopt the new ranked list and clear it off the
  // want-to-try list if it was there.
  function handleLogged({ bakeries, loggedName, wishlistId }) {
    setState((s) => ({
      ...s,
      bakeries,
      // Clear the wishlist entry by its id (survives renaming the prefilled
      // name) and also by name match for manually-typed logs.
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
        <Croissant size={26} />
        <span className="wordmark">bready</span>
        {tab === 'rankings' && state.bakeries.length > 0 && (
          <span className="sub">{state.bakeries.length} ranked</span>
        )}
      </header>

      {tab === 'rankings' && (
        <Rankings bakeries={state.bakeries} onOpen={(id) => setDetailId(id)} onLog={() => openLog()} />
      )}
      {tab === 'want' && (
        <WantToTry
          wantToTry={state.wantToTry}
          onChange={(wantToTry) => update({ wantToTry })}
          onWent={(entry) => openLog(entry)}
        />
      )}
      {tab === 'translate' && (
        <Translator country={state.country} onCountry={(country) => update({ country })} />
      )}

      <nav className="tabbar">
        <button className={tab === 'rankings' ? 'active' : ''} onClick={() => setTab('rankings')}>
          <span className="ico">🏆</span>
          Rankings
        </button>
        <button className="fab" onClick={() => openLog()}>
          <span className="ico">+</span>
          Log
        </button>
        <button className={tab === 'want' ? 'active' : ''} onClick={() => setTab('want')}>
          <span className="ico">🔖</span>
          Want to try
        </button>
        <button className={tab === 'translate' ? 'active' : ''} onClick={() => setTab('translate')}>
          <span className="ico">🌍</span>
          Translate
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
        <BakeryDetail bakery={detailBakery} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
