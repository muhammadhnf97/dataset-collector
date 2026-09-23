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
