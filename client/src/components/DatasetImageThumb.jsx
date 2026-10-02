import { memo, useMemo } from 'react'
import SkeletonImg from './SkeletonImg'
import { formatRelativeTime, mergeReviewerMaps, sortedReviewers } from '../utils'

const DatasetImageThumb = memo(function DatasetImageThumb({
  src,
  attributes,
  annotatedAgo,
  reviewedBy,
  isLastEdited,
  selectable,
  isSelected,
  mode,
  onOpen,
  onToggle,
}) {
  const mergedReviewers = useMemo(
    () => (reviewedBy ? mergeReviewerMaps(...Object.values(reviewedBy)) : null),
    [reviewedBy],
  )
  const reviewers = mergedReviewers
    ? sortedReviewers(mergedReviewers).map(([user, at]) => ({
        user,
        ago: formatRelativeTime(at),
      }))
    : []
  const groups = attributes ?? []
  const rev = reviewedBy ?? {}
  // a group counts as reviewed if it has its own entry or an "all" (whole-image) one
  const reviewedCount = groups.reduce(
    (n, _g, gi) =>
      n +
      ((rev[String(gi)] && Object.keys(rev[String(gi)]).length > 0) ||
      (rev.all && Object.keys(rev.all).length > 0)
        ? 1
        : 0),
    0,
  )
  const allReviewed = groups.length > 0 && reviewedCount === groups.length
  return (
    <button
      type="button"
      data-img-path={src}
      onClick={() => (selectable ? onToggle(src) : onOpen(src))}
      className={`group relative block rounded transition ${
        mode === 'natural' ? 'mb-3 w-full break-inside-avoid' : ''
      }`}
    >
      <SkeletonImg
        src={`/api${src}`}
        alt=""
        loading="lazy"
        decoding="async"
        className={`w-full rounded shadow transition group-hover:shadow-lg ${
          mode === 'natural'
            ? 'h-auto'
            : `object-cover ${mode === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}`
        }`}
      />
      {selectable && (
        <span
          className={`absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow ${
            isSelected
              ? 'bg-red-500 text-white'
              : 'bg-white/50 text-transparent'
          }`}
        >
          ✓
        </span>
      )}
      {selectable && (
        <span
          role="button"
          title="Preview"
          onClick={(e) => {
            e.stopPropagation()
            onOpen(src)
          }}
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </span>
      )}
      {(reviewedCount > 0 || reviewers.length > 0) && (
        <span
          className={`absolute -right-0.5 -top-0.5 z-10 h-0 w-0 border-l-[20px] border-t-[20px] border-l-transparent drop-shadow-sm ${
            allReviewed
              ? 'border-t-emerald-500'
              : reviewedCount > 0
                ? 'border-t-amber-400'
                : 'border-t-sky-500'
          }`}
        />
      )}
      {(reviewedCount > 0 || reviewers.length > 0) && !selectable && (
        <span className="absolute -right-1 top-4 z-20 hidden min-w-32 flex-col gap-0.5 rounded-lg bg-black/80 px-2 py-1 text-[10px] font-medium text-white shadow-lg backdrop-blur-sm group-hover:flex">
          {reviewedCount > 0 && (
            <span>
              {reviewedCount}/{groups.length} reviewed
              {annotatedAgo ? ` · ${annotatedAgo}` : ''}
            </span>
          )}
          {reviewers.map((r) => (
            <span key={r.user} className="opacity-90">
              {r.user}
              {r.ago ? ` · ${r.ago}` : ''}
            </span>
          ))}
        </span>
      )}
      {isLastEdited && (
        <span className="absolute bottom-1 left-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          Last edit
        </span>
      )}
    </button>
  )
})

export default DatasetImageThumb
