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
  // a dollar sign
  return (
    <svg {...base} strokeWidth="1.9" {...props}>
      <path d="M12 3.5v17" />
      <path d="M15.5 7.2c-.9-.9-2.2-1.4-3.6-1.4-2.3 0-3.9 1.2-3.9 2.9 0 3.9 7.5 2 7.5 5.9 0 1.7-1.7 2.9-4 2.9-1.5 0-2.9-.5-3.8-1.5" />
    </svg>
  )
}

export function IconListen(props) {
  // headphones
  return (
    <svg {...base} strokeWidth="1.9" {...props}>
      <path d="M4 13.5v-1.5a8 8 0 0 1 16 0v1.5" />
      <rect x="3" y="13.5" width="4.5" height="7" rx="2" />
      <rect x="16.5" y="13.5" width="4.5" height="7" rx="2" />
    </svg>
  )
}

export function IconPlay(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  )
}

export function IconPause(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

export function IconPrev(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M6 6h2v12H6zM18 6v12l-9-6z" />
    </svg>
  )
}

export function IconNext(props) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M16 6h2v12h-2zM6 6v12l9-6z" />
    </svg>
  )
}

export function IconBack15(props) {
  // anticlockwise arrow with "15" inside
  return (
    <svg {...base} strokeWidth="1.8" {...props}>
      <path d="M4.5 9A8 8 0 1 1 4 13" />
      <path d="M4.5 4.5V9H9" />
      <text x="12" y="15.2" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
        15
      </text>
    </svg>
  )
}

export function IconFwd15(props) {
  return (
    <svg {...base} strokeWidth="1.8" {...props}>
      <path d="M19.5 9A8 8 0 1 0 20 13" />
      <path d="M19.5 4.5V9H15" />
      <text x="12" y="15.2" textAnchor="middle" fontSize="7.2" fontWeight="700" fill="currentColor" stroke="none" fontFamily="inherit">
        15
      </text>
    </svg>
  )
}
