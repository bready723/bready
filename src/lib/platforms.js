// Deep links to each ratings platform for a bakery (name + area). No API key,
// no backend — each opens the platform so Sara can read its live rating there.
// (In-app aggregated star numbers would need paid APIs + the cloud step.)
export function platformLinks(bakery) {
  const name = bakery.name || ''
  const area = bakery.area || ''
  const term = encodeURIComponent([name, area].filter(Boolean).join(' '))
  const g = (extra) => encodeURIComponent([name, area, extra].filter(Boolean).join(' '))
  return [
    { key: 'google', label: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${term}` },
    { key: 'yelp', label: 'Yelp', url: `https://www.yelp.com/search?find_desc=${encodeURIComponent(name)}&find_loc=${encodeURIComponent(area)}` },
    { key: 'tripadvisor', label: 'Tripadvisor', url: `https://www.tripadvisor.com/Search?q=${term}` },
    { key: 'opentable', label: 'OpenTable', url: `https://www.opentable.com/s?term=${term}` },
    { key: 'resy', label: 'Resy', url: `https://www.google.com/search?q=${g('resy')}` },
    { key: 'beli', label: 'Beli', url: `https://www.google.com/search?q=${g('beli app')}` },
  ]
}
