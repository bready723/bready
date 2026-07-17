// Line icons (stroke = currentColor) matching the Claude Design tab bar.
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconRank(props) {
  // ascending bars
  return (
    <svg {...base} strokeWidth="1.7" {...props}>
      <path d="M5 20v-9M12 20V4M19 20v-6" />
    </svg>
  )
}

export function IconPlus(props) {
  return (
    <svg {...base} strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconBookmark(props) {
  return (
    <svg {...base} strokeWidth="1.7" {...props}>
      <path d="M7 3.5h10V21l-5-4.2L7 21V3.5z" />
    </svg>
  )
}

export function IconGlobe(props) {
  return (
    <svg {...base} strokeWidth="1.6" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...base} strokeWidth="1.7" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.8 16.8L21 21" />
    </svg>
  )
}

export function IconExplore(props) {
  // compass: circle + needle
  return (
    <svg {...base} strokeWidth="1.7" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5 5-2.2z" />
    </svg>
  )
}

export function IconPin(props) {
  return (
    <svg {...base} strokeWidth="1.8" {...props}>
      <path d="M12 21s-6-5.1-6-10a6 6 0 1112 0c0 4.9-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

export function IconFx(props) {
  // a coin with a ₩ won mark
  return (
    <svg {...base} strokeWidth="1.7" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8.5l1.7 6 2.3-5 2.3 5 1.7-6" />
      <path d="M7.4 11.3h9.2M7.4 13.3h9.2" />
    </svg>
  )
}
