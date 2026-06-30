// The bread categories you tap when logging a visit.
export const BREADS = [
  { key: 'croissant', label: 'Croissant', emoji: '🥐' },
  { key: 'sourdough', label: 'Sourdough', emoji: '🥖' },
  { key: 'bagel', label: 'Bagel', emoji: '🥯' },
  { key: 'pastry', label: 'Pastry', emoji: '🧁' },
  { key: 'other', label: 'Other', emoji: '🍞' },
]

export const breadEmoji = (key) => (BREADS.find((b) => b.key === key) || {}).emoji || '🍞'
export const breadLabel = (key) => (BREADS.find((b) => b.key === key) || {}).label || key
