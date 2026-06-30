import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { geocode, sleep } from '../lib/geo.js'
import { googleMapsUrl } from '../lib/maps.js'

const PRINCETON = [40.3573, -74.6672]

// An in-app map of ranked bakeries using free OpenStreetMap tiles (no billing).
// Bakeries without coordinates are geocoded once via Nominatim and cached up.
export default function MapView({ bakeries, onOpen, onGeocode }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const attempted = useRef(new Set())
  const running = useRef(false)
  const latest = useRef(bakeries)
  latest.current = bakeries

  // Create the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return
    const map = L.map(elRef.current, { zoomControl: true }).setView(PRINCETON, 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // Container may have just become visible — fix sizing.
    setTimeout(() => map.invalidateSize(), 0)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Render markers for bakeries that have coordinates.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const pts = []
    bakeries.forEach((b) => {
      if (b.lat == null || b.lng == null) return
      const m = L.circleMarker([b.lat, b.lng], {
        radius: 11,
        color: '#fff',
        weight: 2,
        fillColor: '#5b3fd6',
        fillOpacity: 1,
      }).addTo(layer)
      m.bindTooltip(`${b.name} · ${b.score.toFixed(1)}`, { direction: 'top' })
      m.bindPopup(
        `<strong>${b.name}</strong> — ${b.score.toFixed(1)}/10<br/>` +
          `<a href="${googleMapsUrl(b)}" target="_blank" rel="noopener">Open in Google Maps ↗</a>`,
      )
      m.on('click', () => onOpen && onOpen(b.id))
      pts.push([b.lat, b.lng])
    })
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 })
  }, [bakeries, onOpen])

  // Geocode any bakeries still missing coordinates (one at a time, polite rate).
  useEffect(() => {
    if (running.current) return
    const pending = bakeries.filter(
      (b) => (b.lat == null || b.lng == null) && !attempted.current.has(b.id),
    )
    if (!pending.length) return
    running.current = true
    let cancelled = false
    ;(async () => {
      for (const b of pending) {
        if (cancelled) break
        attempted.current.add(b.id)
        const coords = await geocode(b.name, b.area)
        if (coords && onGeocode) onGeocode(b.id, coords)
        await sleep(1100) // Nominatim asks for <= 1 request/second
      }
      running.current = false
    })()
    return () => {
      cancelled = true
      running.current = false
    }
  }, [bakeries, onGeocode])

  const located = bakeries.filter((b) => b.lat != null).length
  const pending = bakeries.length - located

  return (
    <div>
      <div
        ref={elRef}
        style={{ height: '62vh', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--line)' }}
      />
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        {pending > 0
          ? `📍 Finding ${pending} more baker${pending === 1 ? 'y' : 'ies'} on the map…`
          : `📍 ${located} ${located === 1 ? 'bakery' : 'bakeries'} on the map. Tap a pin for details.`}
      </p>
    </div>
  )
}
