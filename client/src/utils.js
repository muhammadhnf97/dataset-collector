export function formatRelativeTime(dateString) {
  if (!dateString) return null
  // Server emits naive UTC; without a suffix the browser parses it as local.
  const iso = /Z$|[+-]\d{2}:?\d{2}$/.test(dateString)
    ? dateString
    : `${dateString}Z`
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const seconds = Math.floor((Date.now() - then) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds} sec${seconds === 1 ? '' : 's'} ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Merge several {user: isoTime} reviewer maps into one, keeping each user's
// latest timestamp. `datasetReviewed` is {image: {attrKey: {user: time}}}.
export const mergeReviewerMaps = (...maps) => {
  const merged = {}
  for (const m of maps) {
    for (const [user, at] of Object.entries(m ?? {})) {
      if (!merged[user] || (at ?? '') > (merged[user] ?? '')) merged[user] = at
    }
  }
  return merged
}

export const sortedReviewers = (merged) =>
  Object.entries(merged).sort((a, b) => (b[1] ?? '').localeCompare(a[1] ?? ''))

export const DATASET_PAGE_LIMIT = 200

// Literal class strings required — Tailwind can't see dynamically built names.
export const GRID_COLS = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  12: 'grid-cols-12',
}
export const MASONRY_COLS = {
  3: 'columns-3',
  4: 'columns-4',
  6: 'columns-6',
  8: 'columns-8',
  9: 'columns-9',
  12: 'columns-12',
}
export const GRID_COL_OPTIONS = Object.keys(GRID_COLS).map(Number)
