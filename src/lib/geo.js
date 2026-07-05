// Free geocoding via OpenStreetMap's Nominatim (no key, no billing). Used to
// place ranked bakeries on the in-app map. Be polite: low volume, cache results.
const memCache = {}

export async function geocode(name, area, city) {
  // Include the city so Nominatim resolves the actual storefront POI instead of
  // a neighborhood centroid (or nothing) — e.g. "Ess-a-Bagel, Midtown East,
  // New York City" pins the shop, not the middle of Midtown.
  const q = [name, area, city].filter(Boolean).join(', ')
  if (!q) return null
  if (memCache[q]) return memCache[q]
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.length) return null
    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    memCache[q] = coords
    return coords
  } catch (e) {
    return null
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
