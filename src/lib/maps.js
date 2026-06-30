// Deep link that opens the real Google Maps app/site to a bakery. No API key,
// no billing — just a search URL. Works on iPhone (opens the Maps app).
//
// We search by NAME + AREA (what you'd actually type) rather than our in-app
// map's approximate coordinates — Google's own search is more reliable, and it
// avoids sending a mis-geocoded point (e.g. a no-city name matching the wrong
// town) to Google.
export function googleMapsUrl(bakery) {
  const q = [bakery.name, bakery.area].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
