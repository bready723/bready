import { useCallback, useEffect, useRef, useState } from 'react'
import {
  hasIndexedDb,
  listTracks,
  addTracks,
  getBlob,
  removeTrack,
  sortTracks,
  titleFor,
  parseName,
  nextTrack,
  prevTrack,
  formatTime,
  formatSize,
  loadPositions,
  savePosition,
  clearPosition,
  keepStored,
  readChapters,
  chapterAt,
  SPEEDS,
  SKIP_SECONDS,
  RESUME_MIN,
} from '../lib/listen.js'
import { IconPlay, IconPause, IconPrev, IconNext, IconBack15, IconFwd15 } from '../components/Icons.jsx'

const ACCEPT = 'audio/*,.m4a,.m4b,.mp3,.aac,.wav'
// How long the × stays armed before it turns back into a plain ×.
const ARM_MS = 4000
// Save the resume point this often while playing.
const SAVE_EVERY_S = 5

// `active` only hides the screen; the player keeps running so switching tabs
// does not stop the audio.
export default function Listen({ active = true }) {
  const audioRef = useRef(null)
  const fileRef = useRef(null)
  const urlRef = useRef(null) // object URL of the loaded blob, revoked on switch
  // The next chapter is fetched while this one plays. Without it, `ended` has to
  // await IndexedDB before calling play(), and iOS treats a play() arriving after
  // the audio session has gone idle as un-gestured and refuses it — which is
  // exactly the walking-with-the-screen-locked case this tab exists for.
  const aheadRef = useRef(null) // { id, url }
  // onLoadedMetadata fires from whichever render is mounted, and setCurrent()
  // outside an event handler commits on a later task — so what the element is
  // actually playing lives in refs, not in React state.
  const trackRef = useRef(null)
  const resumeRef = useRef(0) // seconds still to be applied; 0 once done
  const speedRef = useRef(1)
  const wantPlay = useRef(false)
  const lastSave = useRef(0)
  const armTimer = useRef(null)
  const scrubRef = useRef(false)
  const chaptersRef = useRef([])

  const [supported] = useState(hasIndexedDb)
  const [ready, setReady] = useState(false)
  const [tracks, setTracks] = useState([])
  const [current, setCurrent] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [repeat, setRepeat] = useState(true)
  const [positions, setPositions] = useState(loadPositions)
  const [chapters, setChapters] = useState([]) // jump points inside one long file
  const [scrub, setScrub] = useState(null) // slider value while a drag is in flight
  const [armed, setArmed] = useState(null) // track id whose × was tapped once
  const [msg, setMsg] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setTracks(sortTracks(await listTracks()))
    } catch (e) {
      setMsg('Could not read the saved audio in this browser.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (supported) refresh()
    else setReady(true)
  }, [supported, refresh])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      if (aheadRef.current) URL.revokeObjectURL(aheadRef.current.url)
      clearTimeout(armTimer.current)
    },
    [],
  )

  const setChapterList = useCallback((list) => {
    chaptersRef.current = list
    setChapters(list)
  }, [])

  // Point the element at a URL and start it, with no await in between.
  const attach = useCallback((track, url, { play }) => {
    const a = audioRef.current
    if (!a) return
    if (urlRef.current && urlRef.current !== url) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    trackRef.current = track
    resumeRef.current = loadPositions()[track.id] || 0
    wantPlay.current = play
    setCurrent(track)
    setElapsed(resumeRef.current)
    setDuration(0)
    lastSave.current = resumeRef.current
    a.src = url
    a.load()
    a.defaultPlaybackRate = speedRef.current
    a.playbackRate = speedRef.current
    if (play) a.play().catch(() => setPlaying(false))
  }, [])

  // Read the chapter marks after playback has started, never before: this is the
  // one thing that must not sit between `ended` and `play()`.
  const loadChapters = useCallback(
    async (track, blob) => {
      setChapterList([])
      const list = await readChapters(blob)
      if (trackRef.current && trackRef.current.id === track.id && list.length > 1) setChapterList(list)
    },
    [setChapterList],
  )

  const load = useCallback(
    async (track, { play = true } = {}) => {
      if (!audioRef.current || !track) return
      setMsg(null)
      // already sitting in the prefetch slot: no await, so play() stays in this task
      const ahead = aheadRef.current
      if (ahead && ahead.id === track.id) {
        aheadRef.current = null
        attach(track, ahead.url, { play })
        getBlob(track.id)
          .then((blob) => blob && loadChapters(track, blob))
          .catch(() => {})
        return
      }
      try {
        const blob = await getBlob(track.id)
        if (!blob) {
          setMsg('That file is no longer here. Add it again from Files.')
          return
        }
        attach(track, URL.createObjectURL(blob), { play })
        loadChapters(track, blob)
      } catch (e) {
        setMsg('Could not open that file.')
      }
    },
    [attach, loadChapters],
  )

  // Keep the following chapter warm.
  useEffect(() => {
    if (!current) return
    const nx = nextTrack(tracks, current.id, { repeat })
    if (!nx || nx.id === current.id) return
    if (aheadRef.current && aheadRef.current.id === nx.id) return
    let cancelled = false
    getBlob(nx.id)
      .then((blob) => {
        if (cancelled || !blob) return
        if (aheadRef.current) URL.revokeObjectURL(aheadRef.current.url)
        aheadRef.current = { id: nx.id, url: URL.createObjectURL(blob) }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [current, tracks, repeat])

  function applyRate() {
    const a = audioRef.current
    // iOS discards a rate set while the element holds no media data, so it is
    // re-asserted once the pipeline is really running.
    if (a && a.playbackRate !== speedRef.current) a.playbackRate = speedRef.current
  }

  function onLoadedMetadata() {
    const a = audioRef.current
    if (!a) return
    setDuration(a.duration || 0)
    applyRate()
    const target = resumeRef.current
    if (target && target >= RESUME_MIN && target < (a.duration || Infinity) - 3) a.currentTime = target
    else resumeRef.current = 0
    if (wantPlay.current) a.play().catch(() => setPlaying(false))
  }

  function onCanPlay() {
    const a = audioRef.current
    if (!a) return
    applyRate()
    // WebKit drops a seek made before the media is seekable; if the resume did
    // not take, apply it once more rather than silently starting from zero.
    const target = resumeRef.current
    if (target && Math.abs(a.currentTime - target) > 1.5) a.currentTime = target
    resumeRef.current = 0
  }

  function onTimeUpdate() {
    const a = audioRef.current
    const track = trackRef.current
    if (!a || !track) return
    if (!scrubRef.current) setElapsed(a.currentTime)
    // Never write a position while a resume is still pending, or a seek WebKit
    // ignored would overwrite the real bookmark with five seconds.
    if (resumeRef.current) return
    if (a.currentTime - lastSave.current >= SAVE_EVERY_S || a.currentTime < lastSave.current) {
      lastSave.current = a.currentTime
      setPositions(savePosition(track.id, a.currentTime))
    }
  }

  function onEnded() {
    const track = trackRef.current
    if (track) setPositions(clearPosition(track.id))
    const nx = nextTrack(tracks, track && track.id, { repeat })
    if (nx && nx.id !== (track && track.id)) load(nx)
    else setPlaying(false)
  }

  function toggle() {
    const a = audioRef.current
    if (!a) return
    if (!trackRef.current) {
      if (tracks.length) load(tracks[0])
      return
    }
    if (a.paused) a.play().catch(() => setPlaying(false))
    else a.pause()
  }

  function skip(delta) {
    const a = audioRef.current
    if (!a || !trackRef.current) return
    a.currentTime = Math.max(0, Math.min((a.duration || Infinity) - 0.5, a.currentTime + delta))
    resumeRef.current = 0
    setElapsed(a.currentTime)
  }

  function seekTo(sec) {
    const a = audioRef.current
    if (!a || !trackRef.current) return
    a.currentTime = sec
    resumeRef.current = 0
    setElapsed(sec)
  }

  function goPrev() {
    const a = audioRef.current
    const marks = chaptersRef.current
    if (a && trackRef.current && marks.length > 1) {
      const i = chapterAt(marks, a.currentTime)
      // Like a car stereo: a few seconds in, previous means "restart this one".
      if (a.currentTime - marks[i].start > 3) return seekTo(marks[i].start)
      if (i > 0) return seekTo(marks[i - 1].start)
    }
    // Like a car stereo: past the first few seconds, previous means restart.
    if (a && trackRef.current && a.currentTime > 3) {
      seekTo(0)
      return
    }
    const p = prevTrack(tracks, trackRef.current && trackRef.current.id)
    if (p) load(p, { play: playing || !trackRef.current })
  }

  function goNext() {
    const a = audioRef.current
    const marks = chaptersRef.current
    if (a && trackRef.current && marks.length > 1) {
      const i = chapterAt(marks, a.currentTime)
      if (i + 1 < marks.length) return seekTo(marks[i + 1].start)
    }
    const n = nextTrack(tracks, trackRef.current && trackRef.current.id, { repeat })
    if (n) load(n, { play: playing || !trackRef.current })
  }

  function changeSpeed(s) {
    setSpeed(s)
    speedRef.current = s
    const a = audioRef.current
    if (a) {
      a.defaultPlaybackRate = s
      a.playbackRate = s
    }
  }

  // The lock screen reads this. Keyed to the track, so the Now Playing card is
  // not rebuilt several times a second by the elapsed-time updates.
  const here = chapters.length > 1 ? chapterAt(chapters, elapsed) : -1
  const hereTitle = here >= 0 ? chapters[here].title : null
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.metadata = current
        ? new window.MediaMetadata({
            title: hereTitle || titleFor(current.name),
            artist: hereTitle ? titleFor(current.name) : 'bready · Listen',
            album: 'Listen',
          })
        : null
    } catch (e) {
      /* older browsers */
    }
    // keyed to the chapter, so the Now Playing card is rebuilt eight times in an
    // hour rather than four times a second
  }, [current, hereTitle])

  // Handlers register once and call through a ref, so they always run the latest
  // closures without being torn down and rebuilt on every render.
  const latest = useRef({})
  latest.current = { skip, goPrev, goNext }
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const handlers = {
      play: () => audioRef.current && audioRef.current.play().catch(() => {}),
      pause: () => audioRef.current && audioRef.current.pause(),
      seekbackward: () => latest.current.skip(-SKIP_SECONDS),
      seekforward: () => latest.current.skip(SKIP_SECONDS),
      previoustrack: () => latest.current.goPrev(),
      nexttrack: () => latest.current.goNext(),
    }
    Object.entries(handlers).forEach(([k, fn]) => {
      try {
        ms.setActionHandler(k, fn)
      } catch (e) {
        /* an action this platform does not offer */
      }
    })
    return () => {
      Object.keys(handlers).forEach((k) => {
        try {
          ms.setActionHandler(k, null)
        } catch (e) {
          /* ignore */
        }
      })
    }
  }, [])

  async function onPick(e) {
    // Copy first: the input's FileList is live and empties when the value is reset.
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    try {
      const added = await addTracks(files)
      const skipped = files.length - added.length
      await refresh()
      // Safari clears script-writable storage for a site not visited in 7 days.
      // Asking to persist is best-effort and silent when refused.
      const kept = added.length ? await keepStored() : true
      setMsg(
        added.length
          ? `${added.length} added${skipped ? `, ${skipped} skipped (not audio)` : ''}.` +
              (kept ? '' : ' Add bready to your Home Screen so iOS keeps these files.')
          : 'None of those were audio files.',
      )
    } catch (e) {
      setMsg('Could not save those files — this browser may be out of room.')
    }
  }

  function arm(id) {
    clearTimeout(armTimer.current)
    setArmed(id)
    armTimer.current = setTimeout(() => setArmed(null), ARM_MS)
  }

  async function confirmRemove(track) {
    clearTimeout(armTimer.current)
    setArmed(null)
    try {
      if (trackRef.current && trackRef.current.id === track.id) {
        const a = audioRef.current
        if (a) {
          a.pause()
          a.removeAttribute('src')
          a.load()
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
        trackRef.current = null
        resumeRef.current = 0
        setCurrent(null)
        setPlaying(false)
        setElapsed(0)
        setDuration(0)
      }
      if (aheadRef.current && aheadRef.current.id === track.id) {
        URL.revokeObjectURL(aheadRef.current.url)
        aheadRef.current = null
      }
      await removeTrack(track.id)
      setPositions(clearPosition(track.id))
      await refresh()
    } catch (e) {
      setMsg('Could not remove that file.')
    }
  }

  const shown = scrub == null ? elapsed : scrub
  const remaining = Math.max(0, duration - shown)

  function commitScrub() {
    if (scrub != null) seekTo(scrub)
    scrubRef.current = false
    setScrub(null)
  }

  return (
    <div className="screen listen" hidden={!active}>
      <h1 className="title">Listen</h1>
      <p className="listen-sub">Audio you add here stays on this phone.</p>

      <section className="card listen-now" aria-label="Now playing">
        <div className="listen-label">Now playing</div>
        <div className="listen-track">
          {current ? hereTitle || titleFor(current.name) : tracks.length ? 'Tap play to start' : 'Nothing yet'}
        </div>
        {current && hereTitle && <div className="listen-of">{titleFor(current.name)}</div>}
        <input
          className="listen-seek"
          type="range"
          min="0"
          max={duration || 0}
          step="1"
          value={Math.min(shown, duration || 0)}
          /* the drag only moves the thumb; the seek lands once, on release, so
             timeupdate cannot yank the thumb back under the finger */
          onChange={(e) => {
            scrubRef.current = true
            setScrub(Number(e.target.value))
          }}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
          disabled={!current || !duration}
          aria-label="Position"
          aria-valuetext={formatTime(shown)}
        />
        <div className="listen-times">
          <span>{formatTime(shown)}</span>
          <span>−{formatTime(remaining)}</span>
        </div>
        <div className="listen-controls">
          <button onClick={goPrev} disabled={!tracks.length} aria-label="Previous">
            <IconPrev />
          </button>
          <button onClick={() => skip(-SKIP_SECONDS)} disabled={!current} aria-label="Back 15 seconds">
            <IconBack15 />
          </button>
          <button
            className="listen-play"
            onClick={toggle}
            disabled={!tracks.length}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button onClick={() => skip(SKIP_SECONDS)} disabled={!current} aria-label="Forward 15 seconds">
            <IconFwd15 />
          </button>
          <button onClick={goNext} disabled={!tracks.length} aria-label="Next">
            <IconNext />
          </button>
        </div>
        <div className="chips listen-opts">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={`chip${speed === s ? ' on' : ''}`}
              onClick={() => changeSpeed(s)}
              aria-pressed={speed === s}
            >
              {s}×
            </button>
          ))}
          <button className={`chip${repeat ? ' on' : ''}`} onClick={() => setRepeat((r) => !r)} aria-pressed={repeat}>
            Repeat all
          </button>
        </div>
      </section>

      {chapters.length > 1 && (
        <>
          <div className="listen-head">
            <span className="listen-label">In this file</span>
          </div>
          <ul className="listen-list listen-marks">
            {chapters.map((c, i) => (
              <li key={c.start} className={i === here ? 'on' : ''}>
                <button
                  className="listen-row"
                  onClick={() => seekTo(c.start)}
                  aria-current={i === here ? 'true' : undefined}
                >
                  <span className="num">{i + 1}</span>
                  <span className="listen-name">
                    {c.title.replace(/^\d+\.\s*/, '')}
                    <small>{formatTime(c.start)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="listen-head">
        <span className="listen-label">{chapters.length > 1 ? 'Files' : 'Chapters'}</span>
        <button className="listen-add" onClick={() => fileRef.current && fileRef.current.click()} disabled={!supported}>
          Add audio
        </button>
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={onPick} />
      </div>

      {msg && (
        <p className="listen-msg" role="status">
          {msg}
        </p>
      )}

      {!supported && <div className="card listen-empty">This browser cannot keep audio files. Try Safari.</div>}

      {supported && ready && tracks.length === 0 && (
        <div className="card listen-empty">
          No audio yet. Tap <b>Add audio</b> and pick the files from Files — you can select several at once. They play
          with the screen locked.
        </div>
      )}

      <ul className="listen-list">
        {tracks.map((t, i) => {
          const isCur = current && current.id === t.id
          const pos = positions[t.id]
          const { n, title } = parseName(t.name)
          const name = title || t.name
          const isArmed = armed === t.id
          return (
            <li key={t.id} className={isCur ? 'on' : ''}>
              <button
                className="listen-row"
                onClick={() => (isCur ? toggle() : load(t))}
                aria-current={isCur ? 'true' : undefined}
              >
                <span className="num">{n == null ? i + 1 : n}</span>
                <span className="listen-name">
                  {name}
                  <small>
                    {formatSize(t.size)}
                    {pos ? ` · resumes at ${formatTime(pos)}` : ''}
                    {isCur ? (playing ? ' · playing' : ' · paused here') : ''}
                  </small>
                </span>
              </button>
              {/* one button in both states, so focus is not dropped when it arms */}
              <button
                className={`listen-x${isArmed ? ' arm' : ''}`}
                onClick={() => (isArmed ? confirmRemove(t) : arm(t.id))}
                aria-label={isArmed ? `Confirm removing ${name}` : `Remove ${name}`}
              >
                {isArmed ? 'Remove' : '×'}
              </button>
            </li>
          )
        })}
      </ul>

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onDurationChange={() => audioRef.current && setDuration(audioRef.current.duration || 0)}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => {
          setPlaying(true)
          applyRate()
        }}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onError={() => trackRef.current && setMsg('This file could not be played.')}
      />
    </div>
  )
}
