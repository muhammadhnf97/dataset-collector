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
      className={`group relative block overflow-hidden rounded shadow transition hover:shadow-lg ${
        mode === 'natural' ? 'mb-3 w-full break-inside-avoid' : ''
      }`}
    >
      <SkeletonImg
        src={`/api${src}`}
        alt=""
        loading="lazy"
        decoding="async"
        className={`w-full ${
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
      {reviewedCount > 0 && (
        <span
          className={`absolute right-1 top-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
            allReviewed ? 'bg-emerald-500 text-white' : 'bg-yellow-400 text-slate-800'
          }`}
        >
          {reviewedCount}/{groups.length}
          {annotatedAgo && !selectable && (
            <span className="font-normal opacity-90">· {annotatedAgo}</span>
          )}
        </span>
      )}
      {reviewers.length > 0 && (
        <span
          title={reviewers.map((r) => `${r.user}${r.ago ? ` · ${r.ago}` : ''}`).join('\n')}
          className={`absolute right-1 ${reviewedCount > 0 ? 'top-7' : 'top-1'} flex max-w-[85%] items-center gap-1 truncate rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-2.5 w-2.5 shrink-0"
          >
            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            <path
              fillRule="evenodd"
              d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="truncate">
            {reviewers[0].user}
            {reviewers.length > 1 && ` +${reviewers.length - 1}`}
          </span>
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
