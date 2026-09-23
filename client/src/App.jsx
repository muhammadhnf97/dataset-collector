import { useEffect, useMemo, useRef, useState } from 'react'
import PrelabelStatsModal from './components/PrelabelStatsModal'
import LeaderboardModal from './components/LeaderboardModal'
import UserPickerModal from './components/UserPickerModal'
import ArchivesModal from './components/ArchivesModal'
import AssignToDatasetModal from './components/AssignToDatasetModal'
import BatchWarnModal from './components/BatchWarnModal'
import ExportDatasetModal from './components/ExportDatasetModal'
import CreateDatasetModal from './components/CreateDatasetModal'
import ImportBatchModal from './components/ImportBatchModal'
import DatasetSettingsModal from './components/DatasetSettingsModal'
import UploadSourceModal from './components/UploadSourceModal'
import SourceModal from './components/SourceModal'
import ImportArchiveModal from './components/ImportArchiveModal'
import { formatRelativeTime } from './utils'

function UploadIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  )
}

function ArrowIcon({ className, direction }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          direction === 'left'
            ? 'M15.75 19.5 8.25 12l7.5-7.5'
            : 'M8.25 4.5 15.75 12l-7.5 7.5'
        }
      />
    </svg>
  )
}

function Filmstrip({ images, index, marked, onSelect }) {
  const stripRef = useRef(null)

  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [index])

  return (
    <div
      ref={stripRef}
      className="absolute left-0 right-0 top-0 z-10 flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-100/80 px-3 py-2.5 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      {images.map((image, i) => (
        <img
          key={image.id ?? image}
          data-active={i === index}
          src={`/api${image.path ?? image}`}
          alt=""
          onClick={(e) => {
            e.stopPropagation()
            onSelect(i)
          }}
          className={`h-16 w-28 shrink-0 cursor-pointer rounded-md object-cover shadow-md transition duration-150 ${
            marked?.has(image.id ?? image)
              ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-100'
              : i === index
                ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100'
                : 'opacity-50 hover:opacity-90'
          }`}
        />
      ))}
    </div>
  )
}

function ImageModal({ images, index, onClose, onNavigate, onSelect, onRemove, attributes, annotations, reviewed }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
      if (onRemove && (e.key === 'x' || e.key === 'X')) {
        const current = images[index]
        onRemove(current.path ?? current)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNavigate, onRemove, images, index])

  if (index === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <Filmstrip images={images} index={index} onSelect={onSelect} />

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const current = images[index]
            onRemove(current.path ?? current)
          }}
          className="absolute left-4 top-24 z-10 flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-red-500/80 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-red-500"
        >
          Remove
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-24 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-xl text-slate-800 backdrop-blur-md transition hover:bg-slate-300"
      >
        ×
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(-1)
        }}
        className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-800 backdrop-blur-md transition hover:scale-105 hover:bg-slate-300"
      >
        <ArrowIcon direction="left" className="h-6 w-6" />
      </button>

      <div className="flex flex-1 items-center justify-center overflow-hidden pt-24 pb-12">
        <img
          src={`/api${images[index].path ?? images[index]}`}
          alt=""
          className="h-full w-full object-contain p-4"
        />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(1)
        }}
        className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-800 backdrop-blur-md transition hover:scale-105 hover:bg-slate-300"
      >
        <ArrowIcon direction="right" className="h-6 w-6" />
      </button>

      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-slate-300 bg-slate-200 px-4 py-1.5 text-sm font-medium text-slate-800 backdrop-blur-md">
        {index + 1} / {images.length}
      </span>

      {attributes && (
        <div className="absolute bottom-5 left-4 z-10 max-h-56 w-64 overflow-y-auto rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-xs shadow backdrop-blur-md">
          {(() => {
            const current = images[index].path ?? images[index]
            const values = annotations?.[current]
            const attrReview = reviewed?.[current] ?? {}
            const reviewersFor = (gi) =>
              sortedReviewers(
                mergeReviewerMaps(attrReview[String(gi)], attrReview.all),
              )
            if (!values) {
              const any = sortedReviewers(
                mergeReviewerMaps(...Object.values(attrReview)),
              )
              return (
                <>
                  <p className="flex items-center gap-1.5 py-1 text-slate-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                    Not annotated
                  </p>
                  {any.length > 0 && (
                    <p className="py-0.5 text-[10px] text-slate-400">
                      Reviewed by{' '}
                      {any
                        .map(([u, at]) => `${u} · ${formatRelativeTime(at)}`)
                        .join(', ')}
                    </p>
                  )}
                </>
              )
            }
            return attributes.map((group, gi) => {
              const selected = (group.options ?? [])
                .map((opt, i) => group.option_aliases?.[i] ?? opt)
                .filter((_, i) => values[group.indices[i]] === 1)
              const hasValue = selected.length > 0
              const rowReviewers = reviewersFor(gi)
              return (
                <div
                  key={group.name}
                  className="flex items-center gap-1.5 py-0.5 leading-relaxed"
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      hasValue ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-500">
                    {group.alias ?? group.name}
                  </span>{' '}
                  <span
                    className={`font-medium ${
                      hasValue ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {hasValue ? selected.join(', ') : '—'}
                  </span>
                  {rowReviewers.length > 0 && (
                    <span
                      className="ml-auto shrink-0 text-[10px] font-normal text-slate-400"
                      title={rowReviewers
                        .map(([u, at]) => `${u} · ${formatRelativeTime(at)}`)
                        .join('\n')}
                    >
                      {rowReviewers.map(([u]) => u).join(', ')}
                    </span>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
    </div>
  )
}

function RemoveModeModal({
  images,
  index,
  marked,
  onToggleMark,
  onNavigate,
  onSelect,
  onClose,
  onDone,
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
      if (e.key === ' ') {
        e.preventDefault()
        const current = images[index]
        if (current) {
          onToggleMark(current.id ?? current)
          onNavigate(1)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNavigate, onToggleMark, images, index])

  const current = images[index]
  const isMarked = current ? marked.has(current.id ?? current) : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <Filmstrip
        images={images}
        index={index}
        marked={marked}
        onSelect={onSelect}
      />

      <div className="absolute left-4 top-24 z-10 flex items-center gap-3">
        <span className="rounded-full border border-red-400/30 bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-200 backdrop-blur-md">
          Remove Mode — {marked.size} marked
        </span>
      </div>

      <div className="absolute right-4 top-24 z-10 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
        >
          Done
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(-1)}
        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
      >
        <ArrowIcon direction="left" className="h-6 w-6" />
      </button>

      {current && (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden pt-24 pb-12">
          <img
            src={`/api${current.path ?? current}`}
            alt=""
            className={`h-full w-full rounded-lg object-contain shadow-2xl transition ${
              isMarked ? 'ring-4 ring-red-500' : ''
            }`}
          />
          {isMarked && (
            <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white shadow-lg">
              ✓
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate(1)}
        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
      >
        <ArrowIcon direction="right" className="h-6 w-6" />
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md">
          {index + 1} / {images.length}
        </span>
        {current && (
          <button
            type="button"
            onClick={() => onToggleMark(current.id ?? current)}
            className={`rounded-full px-5 py-2 text-sm font-medium text-white shadow-lg transition ${
              isMarked
                ? 'border border-white/10 bg-white/10 backdrop-blur-md hover:bg-white/20'
                : 'bg-red-500 shadow-red-500/30 hover:bg-red-600'
            }`}
          >
            {isMarked ? 'Unmark' : 'Mark for removal'}
          </button>
        )}
      </div>
    </div>
  )
}

function ConfirmModal({ count, onCancel, onConfirm, title, message, confirmLabel = 'Delete' }) {
  const confirmRef = useRef(null)
  const onConfirmRef = useRef(onConfirm)
  const onCancelRef = useRef(onCancel)
  onConfirmRef.current = onConfirm
  onCancelRef.current = onCancel

  useEffect(() => {
    confirmRef.current?.focus()
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onConfirmRef.current()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onCancelRef.current()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-center text-base font-semibold text-white">
          {title ?? `Delete ${count} image${count === 1 ? '' : 's'}?`}
        </h3>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          {message ??
            'This will permanently remove the marked images. This action cannot be undone.'}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ArchiveIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  )
}

const DATASET_PAGE_LIMIT = 200

// Merge several {user: isoTime} reviewer maps into one, keeping each user's
// latest timestamp. `datasetReviewed` is {image: {attrKey: {user: time}}}.
const mergeReviewerMaps = (...maps) => {
  const merged = {}
  for (const m of maps) {
    for (const [user, at] of Object.entries(m ?? {})) {
      if (!merged[user] || (at ?? '') > (merged[user] ?? '')) merged[user] = at
    }
  }
  return merged
}

const sortedReviewers = (merged) =>
  Object.entries(merged).sort((a, b) => (b[1] ?? '').localeCompare(a[1] ?? ''))

function DatasetImageThumb({
  src,
  isAnnotated,
  annotatedAgo,
  reviewedBy,
  isLastEdited,
  selectable,
  isSelected,
  portrait,
  onOpen,
  onToggle,
}) {
  const reviewers = reviewedBy
    ? sortedReviewers(mergeReviewerMaps(...Object.values(reviewedBy))).map(
        ([user, at]) => ({ user, ago: formatRelativeTime(at) }),
      )
    : []
  return (
    <button
      type="button"
      onClick={() => (selectable ? onToggle(src) : onOpen(src))}
      className={`group relative block overflow-hidden rounded-lg shadow transition hover:shadow-lg ${
        isSelected
          ? 'ring-2 ring-red-500'
          : isAnnotated
            ? 'ring-2 ring-emerald-500'
            : ''
      }`}
    >
      <img
        src={`/api${src}`}
        alt=""
        loading="lazy"
        decoding="async"
        className={`w-full object-cover ${portrait ? 'aspect-[9/16]' : 'aspect-video'}`}
      />
      {selectable && (
        <span
          className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow ${
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
      {isAnnotated && (
        <span className="absolute right-1 top-1 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          ✓ Annotated
          {annotatedAgo && (
            <span className="font-normal opacity-90">· {annotatedAgo}</span>
          )}
        </span>
      )}
      {reviewers.length > 0 && (
        <span
          title={reviewers.map((r) => `${r.user}${r.ago ? ` · ${r.ago}` : ''}`).join('\n')}
          className={`absolute right-1 ${isAnnotated ? 'top-7' : 'top-1'} flex max-w-[85%] items-center gap-1 truncate rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow`}
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
}

function DatasetBatchSection({
  dataset,
  stem,
  source,
  stats,
  images,
  annotations,
  annotationTimes,
  reviewed,
  refreshKey,
  onImagesLoaded,
  onOpenImage,
  removeMode,
  selected,
  onToggleSelect,
  portrait,
  lastEdited,
}) {
  const [loading, setLoading] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)
  const batchName = stem.replace(/^raw-images_/, '')
  const total = stats?.total ?? 0
  const annotated = stats?.annotated ?? 0
  const hasMore = loadedCount < total

  const loadPage = async (page, replace) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(dataset)}/images?batch=${encodeURIComponent(batchName)}&page=${page}&limit=${DATASET_PAGE_LIMIT}`,
      )
      const data = await response.json()
      if (response.ok) {
        setLoadedCount(
          replace ? data.images.length : loadedCount + data.images.length,
        )
        onImagesLoaded(stem, data.images, replace)
      }
    } catch {
      // leave existing images; user can retry with Load more
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoadedCount(0)
    loadPage(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, stem, refreshKey])

  return (
    <div className="mt-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {stem}
        {source && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
            {source.name} · v{source.version}
          </span>
        )}
        <span className="text-xs font-normal text-slate-400">
          {annotated} / {total} annotated
        </span>
      </h3>
      {loadedCount === 0 && loading ? (
        <p className="text-xs text-slate-400">Loading images...</p>
      ) : (
        <div className={`grid gap-3 ${portrait ? 'grid-cols-8' : 'grid-cols-6'}`}>
          {images.map((src) => (
            <DatasetImageThumb
              key={src}
              src={src}
              isAnnotated={annotations[src] !== undefined}
              annotatedAgo={formatRelativeTime(annotationTimes[src])}
              reviewedBy={reviewed?.[src]}
              isLastEdited={src === lastEdited}
              selectable={removeMode}
              isSelected={selected?.has(src)}
              portrait={portrait}
              onOpen={onOpenImage}
              onToggle={onToggleSelect}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={() => loadPage(Math.floor(loadedCount / DATASET_PAGE_LIMIT), false)}
          disabled={loading}
          className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
        >
          {loading
            ? 'Loading...'
            : `Load more (${loadedCount} / ${total})`}
        </button>
      )}
    </div>
  )
}

function DatasetSimilarView({
  clusters,
  singles,
  annotations,
  annotationTimes,
  reviewed,
  selected,
  onToggleSelect,
  onOpenImage,
  onKeepRest,
  onKeepRestAll,
  threshold,
  onThresholdChange,
  portrait,
  lastEdited,
}) {
  const [expanded, setExpanded] = useState(new Set())
  const aspectCls = portrait ? 'aspect-[9/16]' : 'aspect-video'
  const gridCls = `grid gap-3 ${portrait ? 'grid-cols-8' : 'grid-cols-6'}`

  const toggleExpand = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const renderThumb = (src) => (
    <DatasetImageThumb
      key={src}
      src={src}
      isAnnotated={annotations[src] !== undefined}
      annotatedAgo={formatRelativeTime(annotationTimes[src])}
      reviewedBy={reviewed?.[src]}
      isLastEdited={src === lastEdited}
      selectable
      isSelected={selected?.has(src)}
      portrait={portrait}
      onOpen={onOpenImage}
      onToggle={onToggleSelect}
    />
  )

  const chevron = (open) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  )

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-sm text-slate-500">
        <span>
          {clusters.length} group{clusters.length === 1 ? '' : 's'} ·{' '}
          {clusters.reduce((n, c) => n + c.length, 0)} images
        </span>
        <select
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          title="Similarity sensitivity — higher groups more loosely"
          className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 outline-none"
        >
          <option value={4}>Strict</option>
          <option value={6}>Balanced</option>
          <option value={10}>Loose</option>
          <option value={14}>Very loose</option>
        </select>
        {clusters.length > 0 && (
          <>
            <button
              type="button"
              onClick={() =>
                setExpanded(
                  expanded.size === clusters.length
                    ? new Set()
                    : new Set(clusters.map((c) => c[0])),
                )
              }
              className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              {expanded.size === clusters.length ? 'Collapse all' : 'Expand all'}
            </button>
            <button
              type="button"
              onClick={() => onKeepRestAll(clusters)}
              className="rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
            >
              Keep 1 per group, select rest
            </button>
          </>
        )}
      </div>
      {clusters.length === 0 && (
        <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
          No near-duplicate images found — try a looser sensitivity
        </div>
      )}
      <div className={gridCls}>
        {clusters.map((cluster) => {
          const cover = cluster[0]
          const isOpen = expanded.has(cover)
          const selCount = cluster.reduce(
            (n, p) => n + (selected?.has(p) ? 1 : 0),
            0,
          )
          if (isOpen) {
            return (
              <div
                key={cover}
                className="col-span-full rounded-xl border border-violet-200 bg-violet-50/40 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(cover)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-100"
                  >
                    {chevron(true)}
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    {cluster.length} similar
                  </span>
                  {selCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {selCount} selected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onKeepRest(cluster)}
                    className="rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    Keep 1, select rest
                  </button>
                </div>
                <div className={gridCls}>{cluster.map(renderThumb)}</div>
              </div>
            )
          }
          return (
            <div key={cover} className="relative">
              {cluster.length > 1 && (
                <>
                  <img
                    src={`/api${cluster[1]}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full rotate-2 rounded-lg object-cover shadow ${aspectCls}`}
                  />
                  <img
                    src={`/api${cluster[2] ?? cluster[1]}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full -rotate-2 rounded-lg object-cover shadow ${aspectCls}`}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => toggleExpand(cover)}
                className={`group relative block w-full overflow-hidden rounded-lg shadow transition hover:shadow-lg ${
                  selCount === cluster.length
                    ? 'ring-2 ring-red-500'
                    : selCount > 0
                      ? 'ring-2 ring-red-300'
                      : annotations[cover] !== undefined
                        ? 'ring-2 ring-emerald-500'
                        : ''
                }`}
              >
                <img
                  src={`/api${cover}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`w-full object-cover ${aspectCls}`}
                />
                <span className="absolute left-1 top-1 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  {cluster.length} similar
                </span>
                {selCount > 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    {selCount} selected
                  </span>
                )}
                <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:bg-black/80">
                  {chevron(false)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onKeepRest(cluster)}
                className="mt-1.5 w-full rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                Keep 1, select rest
              </button>
            </div>
          )
        })}
      </div>
      {singles.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Unique images
            <span className="ml-2 text-xs font-normal text-slate-400">
              {singles.length}
            </span>
          </h3>
          <div className={gridCls}>{singles.map(renderThumb)}</div>
        </div>
      )}
    </div>
  )
}

function App() {
  const fileInputRef = useRef(null)
  const tarInputRef = useRef(null)
  const [, setRelativeTimeTick] = useState(0)
  const [status, setStatus] = useState(null)
  const [videos, setVideos] = useState([])
  const [importedImages, setImportedImages] = useState([])
  const [frameImages, setFrameImages] = useState([])
  const [cropImages, setCropImages] = useState([])
  const [selectedRaw, setSelectedRaw] = useState(null)
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [selectedRawImages, setSelectedRawImages] = useState([])
  const [yoloClasses, setYoloClasses] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selectedFilename, setSelectedFilename] = useState(null)
  const [videoMode, setVideoMode] = useState('frames')
  const [videoFramesPerMinute, setVideoFramesPerMinute] = useState(30)
  const [videoCropMargin, setVideoCropMargin] = useState(0)
  const [videoSelectedClasses, setVideoSelectedClasses] = useState([])
  const [videoConfidence, setVideoConfidence] = useState(70)
  const [videoExtracting, setVideoExtracting] = useState(false)
  const [removeVideoMode, setRemoveVideoMode] = useState(false)
  const [selectedVideosToRemove, setSelectedVideosToRemove] = useState(new Set())
  const [confirmingRemoveVideos, setConfirmingRemoveVideos] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState(null)
  const [videoImages, setVideoImages] = useState([])
  const [videoModalIndex, setVideoModalIndex] = useState(null)
  const [confirmingRemoveVideoBatch, setConfirmingRemoveVideoBatch] = useState(false)
  const [rawSelectedClasses, setRawSelectedClasses] = useState([])
  const [rawConfidence, setRawConfidence] = useState(70)
  const [rawCropMargin, setRawCropMargin] = useState(0)
  const [rawRemoveSource, setRawRemoveSource] = useState(false)
  const [rawGenerating, setRawGenerating] = useState(false)
  const [removeDatasetMode, setRemoveDatasetMode] = useState(false)
  const [selectedDatasetsToRemove, setSelectedDatasetsToRemove] = useState(new Set())
  const [removeRawMode, setRemoveRawMode] = useState(false)
  const [selectedRawsToRemove, setSelectedRawsToRemove] = useState(new Set())
  const [confirmingRemoveRaws, setConfirmingRemoveRaws] = useState(false)
  const [confirmingRemoveDatasets, setConfirmingRemoveDatasets] = useState(false)
  const [selectedVideoBatch, setSelectedVideoBatch] = useState(null)

  const [modalIndex, setModalIndex] = useState(null)
  const [datasetModalIndex, setDatasetModalIndex] = useState(null)
  const [imagePage, setImagePage] = useState(0)
  const [rawImagesTotal, setRawImagesTotal] = useState(0)

  const [removeMode, setRemoveMode] = useState(false)
  const [removeIndex, setRemoveIndex] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingRemoveImage, setConfirmingRemoveImage] = useState(false)
  const [confirmingRemoveAttrImage, setConfirmingRemoveAttrImage] = useState(false)
  const [confirmingRemoveDatasetBatch, setConfirmingRemoveDatasetBatch] = useState(false)
  const [datasetBatchToRemove, setDatasetBatchToRemove] = useState('')
  const [datasetRemoveMode, setDatasetRemoveMode] = useState(false)
  const [datasetGridPortrait, setDatasetGridPortrait] = useState(false)
  const [similarView, setSimilarView] = useState(null)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarThreshold, setSimilarThreshold] = useState(6)
  const [selectedDatasetImages, setSelectedDatasetImages] = useState(new Set())
  const [confirmingRemoveDatasetImages, setConfirmingRemoveDatasetImages] = useState(false)
  const [confirmingRemoveActiveDataset, setConfirmingRemoveActiveDataset] = useState(false)
  const [splitCount, setSplitCount] = useState(2)
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false)
  const [deleteBatchConfirmOpen, setDeleteBatchConfirmOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [activePage, setActivePage] = useState('raw_image')
  const [activeDataset, setActiveDataset] = useState('')
  const [datasetBatches, setDatasetBatches] = useState([])
  const [datasetImageGroups, setDatasetImageGroups] = useState({})
  const [datasetAnnotations, setDatasetAnnotations] = useState({})
  const [datasetAnnotationTimes, setDatasetAnnotationTimes] = useState({})
  const [datasetLastAttrs, setDatasetLastAttrs] = useState({})
  const [datasetReviewed, setDatasetReviewed] = useState({})
  const [datasetBatchFilter, setDatasetBatchFilter] = useState(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [datasetSettingsOpen, setDatasetSettingsOpen] = useState(false)
  const [savingDatasetSettings, setSavingDatasetSettings] = useState(false)
  const [datasetSplit, setDatasetSplit] = useState({
    train: 70,
    val: 20,
    test: 10,
  })
  const attrStripRef = useRef(null)
  const attrShownRef = useRef(null) // {dataset, image, attrIndex} currently displayed in correction modal
  const [exportResult, setExportResult] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [selectedExportBatches, setSelectedExportBatches] = useState([])
  const [newDatasetName, setNewDatasetName] = useState('')
  const [createDatasetOpen, setCreateDatasetOpen] = useState(false)
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [assignToDatasetOpen, setAssignToDatasetOpen] = useState(false)
  const [importBatchOpen, setImportBatchOpen] = useState(false)
  const [importingBatch, setImportingBatch] = useState(false)
  const [preLabeling, setPreLabeling] = useState(false)
  const [prelabelConfirmOpen, setPrelabelConfirmOpen] = useState(false)
  const [prelabelConfirmCount, setPrelabelConfirmCount] = useState(0)
  const [prelabelWriteValues, setPrelabelWriteValues] = useState(true)
  const [prelabelMenuOpen, setPrelabelMenuOpen] = useState(false)
  const prelabelMenuRef = useRef(null)
  const [attrMenuOpen, setAttrMenuOpen] = useState(false)
  const attrMenuRef = useRef(null)
  const [prelabelStatsOpen, setPrelabelStatsOpen] = useState(false)
  const [prelabelStats, setPrelabelStats] = useState(null)
  const [prelabelStatsLoading, setPrelabelStatsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(
    () => localStorage.getItem('annotatorUser') || '',
  )
  const [users, setUsers] = useState([])
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const pendingUserActionRef = useRef(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [exportFormat, setExportFormat] = useState('tar')
  const [exportGroupSplit, setExportGroupSplit] = useState(true)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef(null)
  const [handlersMenuOpen, setHandlersMenuOpen] = useState(false)
  const handlersMenuRef = useRef(null)
  const [newDatasetMenuOpen, setNewDatasetMenuOpen] = useState(false)
  const newDatasetMenuRef = useRef(null)
  const [archives, setArchives] = useState([])
  const [archivesOpen, setArchivesOpen] = useState(false)
  const [archiveFormat, setArchiveFormat] = useState('tar')
  const [archiving, setArchiving] = useState(false)
  const [importArchiveOpen, setImportArchiveOpen] = useState(false)
  const [uploadingArchive, setUploadingArchive] = useState(false)
  const [restoringArchiveId, setRestoringArchiveId] = useState(null)
  const [confirmingDeleteArchive, setConfirmingDeleteArchive] = useState(null)
  const [sources, setSources] = useState([])
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [uploadSourceId, setUploadSourceId] = useState('')
  const [uploadSourceOpen, setUploadSourceOpen] = useState(false)
  const [datasetBatchSources, setDatasetBatchSources] = useState({})
  const [datasetBatchStats, setDatasetBatchStats] = useState({})
  const [batchHandlers, setBatchHandlers] = useState({})
  const [batchWarn, setBatchWarn] = useState(null)
  const [datasetRefreshKey, setDatasetRefreshKey] = useState(0)
  const [datasetAttributes, setDatasetAttributes] = useState(null)
  const [selectedDataset, setSelectedDataset] = useState('')
  const [templates, setTemplates] = useState([])
  const [annotate, setAnnotate] = useState(null)
  const [attrAnnotate, setAttrAnnotate] = useState(null)
  const [markedForRemoval, setMarkedForRemoval] = useState(new Set())

  const toggleMarked = (image) => {
    setMarkedForRemoval((prev) => {
      const next = new Set(prev)
      if (next.has(image)) {
        next.delete(image)
      } else {
        next.add(image)
      }
      return next
    })
  }

  const activeImages = selectedRawImages

  const rawSources = useMemo(() => {
    return (batches ?? [])
      .map((b) => (typeof b === 'string' ? { name: b } : b))
      .map((b) => {
        const source = b.name.split('/').pop()
        return {
          id: b.id,
          source,
          batch: b.name,
          previews: b.cover ? [b.cover] : [],
          count: b.count,
          type: b.type,
          sourceInfo: b.source && typeof b.source === 'object' ? b.source : null,
        }
      })
      .sort((a, b) => a.source.localeCompare(b.source))
  }, [batches])

  const rawSourceGroups = useMemo(() => {
    const groups = []
    const byKey = {}
    for (const r of rawSources) {
      const key = r.sourceInfo ? `s-${r.sourceInfo.id}` : 'untagged'
      if (!byKey[key]) {
        byKey[key] = {
          key,
          label: r.sourceInfo
            ? `${r.sourceInfo.name} · v${r.sourceInfo.version}`
            : 'Untagged',
          items: [],
        }
        groups.push(byKey[key])
      }
      byKey[key].items.push(r)
    }
    groups.sort((a, b) => {
      if (a.key === 'untagged') return 1
      if (b.key === 'untagged') return -1
      return a.label.localeCompare(b.label)
    })
    return groups
  }, [rawSources])

  const selectedRawInfo = useMemo(
    () => rawSources.find((r) => r.source === selectedRaw) ?? null,
    [rawSources, selectedRaw],
  )

  const datasetImages = useMemo(
    () => datasetBatches.flatMap((stem) => datasetImageGroups[stem] ?? []),
    [datasetBatches, datasetImageGroups],
  )

  const datasetTotals = useMemo(() => {
    let total = 0
    let annotated = 0
    for (const c of Object.values(datasetBatchStats)) {
      total += c.total
      annotated += c.annotated
    }
    return { total, annotated }
  }, [datasetBatchStats])

  const datasetActiveImages = useMemo(() => {
    if (similarView) {
      return [...similarView.clusters.flat(), ...similarView.singles]
    }
    return datasetBatchFilter
      ? (datasetImageGroups[datasetBatchFilter] ?? [])
      : datasetImages
  }, [similarView, datasetBatchFilter, datasetImageGroups, datasetImages])

  // "Last edited" is per-user (from the activity log), not just whichever
  // annotation row has the newest updated_at — so each annotator resumes at
  // their own progress, not a colleague's.
  const [myLastEdit, setMyLastEdit] = useState(null) // { image, attr_index, created_at } | null
  const lastEditedImage = myLastEdit?.image ?? null

  const fetchMyLastEdit = async () => {
    if (!activeDataset || !currentUser) {
      setMyLastEdit(null)
      return
    }
    const batch = datasetBatchFilter?.replace(/^raw-images_/, '')
    try {
      const params = new URLSearchParams({ user: currentUser })
      if (batch) params.set('batch', batch)
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/last-edit?${params}`,
      )
      const data = await response.json()
      setMyLastEdit(response.ok && data.image ? data : null)
    } catch {
      setMyLastEdit(null)
    }
  }

  useEffect(() => {
    fetchMyLastEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset, datasetBatchFilter, currentUser])

  const handleDatasetImagesLoaded = (stem, images, replace) => {
    setDatasetImageGroups((prev) => ({
      ...prev,
      [stem]: replace ? images : [...(prev[stem] ?? []), ...images],
    }))
  }

  const IMAGES_PER_PAGE = 50
  const totalForPaging =
    activePage === 'raw_image' ? rawImagesTotal : activeImages.length
  const pageCount = Math.max(
    1,
    Math.ceil(totalForPaging / IMAGES_PER_PAGE),
  )
  const pageImages = activeImages

  const navigateModal = (delta) => {
    setModalIndex((i) =>
      i === null
        ? null
        : (i + delta + activeImages.length) % activeImages.length,
    )
  }

  const navigateVideoModal = (delta) => {
    setVideoModalIndex((i) =>
      i === null
        ? null
        : (i + delta + videoImages.length) % videoImages.length,
    )
  }

  const navigateDatasetModal = (delta) => {
    setDatasetModalIndex((i) =>
      i === null
        ? null
        : (i + delta + datasetActiveImages.length) % datasetActiveImages.length,
    )
  }

  const doDeleteSelectedRaws = async () => {
    if (selectedRawsToRemove.size === 0) return
    setConfirmingRemoveRaws(false)
    let deleted = 0
    let failed = 0
    for (const batch of selectedRawsToRemove) {
      try {
        const response = await fetch(
          `/api/batches/${encodeURIComponent(batch)}`,
          { method: 'DELETE' },
        )
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    if (deleted > 0) {
      setSelectedRaw(null)
      setSelectedBatchId(null)
      setSelectedRawImages([])
      fetchBatches()
    }
    setSelectedRawsToRemove(new Set())
    setRemoveRawMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} raw image batch${deleted === 1 ? '' : 'es'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doRemoveDatasets = async () => {
    if (selectedDatasetsToRemove.size === 0) return
    setConfirmingRemoveDatasets(false)
    let deleted = 0
    let failed = 0
    for (const name of selectedDatasetsToRemove) {
      try {
        const response = await fetch(
          `/api/datasets/${encodeURIComponent(name)}`,
          { method: 'DELETE' },
        )
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    if (deleted > 0) {
      if (selectedDatasetsToRemove.has(activeDataset)) {
        setActiveDataset('')
      }
      fetchDatasets()
    }
    setSelectedDatasetsToRemove(new Set())
    setRemoveDatasetMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} dataset${deleted === 1 ? '' : 's'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doGenerateRaw = async () => {
    if (!selectedRaw || rawGenerating) return
    setRawGenerating(true)
    setStatus('Generating...')
    try {
      const response = await fetch(
        `/api/raw-images/${encodeURIComponent(`raw-images/${selectedRaw}`)}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'crops',
            margin: rawCropMargin,
            classes: rawSelectedClasses.join(','),
            confidence: rawConfidence / 100,
            remove_source: rawRemoveSource,
          }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Generated ${data.count} images`)
        fetchBatches()
        if (selectedBatchId) {
          fetchRawImages(selectedBatchId)
        }
      } else {
        setStatus(`Failed: ${data.detail ?? 'Generation failed'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRawGenerating(false)
    }
  }

  const fetchImages = async (batch = null) => {
    const url = batch
      ? `/api/images?batch=${encodeURIComponent(batch)}`
      : '/api/images'
    try {
      const response = await fetch(url)
      const data = await response.json()
      setImportedImages(data.imported ?? [])
      setFrameImages(data.frames ?? [])
      setCropImages(data.crops ?? [])
      setImagePage(0)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchRawImages = async (batchId, page = imagePage) => {
    try {
      const response = await fetch(
        `/api/images?id=${encodeURIComponent(batchId)}&page=${page}&limit=${IMAGES_PER_PAGE}`,
      )
      const data = await response.json()
      setSelectedRawImages(data.images ?? [])
      setRawImagesTotal(data.total ?? data.images?.length ?? 0)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches')
      const data = await response.json()
      setBatches(data.batches ?? [])
      setYoloClasses(data.classes ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      setSources(data.sources ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const createSource = async (name) => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) return
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus(`Created source ${data.name} · v${data.version}`)
        await fetchSources()
        return data
      }
      setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
    } catch {
      setStatus('Failed: could not reach the server')
    }
    return null
  }

  const deleteSource = async (id) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus('Source deleted (batches untagged)')
        fetchSources()
        fetchBatches()
      } else {
        const data = await response.json()
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSplit = async () => {
    const label = selectedBatch ? `batch ${selectedBatch}` : 'loose imports'
    setStatus(`Splitting ${label}...`)
    try {
      const body = { count: splitCount }
      if (selectedBatch) body.source = selectedBatch
      const response = await fetch('/api/split-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus(
          `Split ${data.moved} images into ${data.batches.length} batches`,
        )
        setSelectedBatch(null)
        setSplitConfirmOpen(false)
        fetchBatches()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/datasets')
      const data = await response.json()
      setDatasets((data.datasets ?? []).map((d) => (typeof d === 'string' ? { name: d, previews: [], batches: [] } : d)))
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const refreshDataset = async (name) => {
    try {
      const [datasetRes, imagesRes, annotRes, handlersRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(name)}`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/images?counts=1`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/batch-handlers`),
      ])
      const data = await datasetRes.json()
      const imagesData = await imagesRes.json()
      const annotData = await annotRes.json()
      const handlersData = await handlersRes.json()
      if (datasetRes.ok && imagesRes.ok) {
        setActiveDataset(data.name)
        setDatasetBatches(data.batches ?? [])
        setDatasetSplit(data.split ?? { train: 70, val: 20, test: 10 })
        setDatasetImageGroups({})
        setDatasetBatchStats(imagesData.counts ?? {})
        setDatasetBatchSources(imagesData.batch_sources ?? {})
        setDatasetAnnotations(annotData.annotations ?? {})
        setDatasetAnnotationTimes(annotData.updated_at ?? {})
        setDatasetLastAttrs(annotData.last_attr ?? {})
        setDatasetReviewed(annotData.reviewed ?? {})
        setBatchHandlers(handlersData.handlers ?? {})
        setDatasetRefreshKey((k) => k + 1)
        if (data.framework && data.model) {
          const tpl = `${data.framework}/${data.model}`.toLowerCase()
          fetch(`/api/templates/${encodeURIComponent(tpl)}/attributes`)
            .then((r) => r.json())
            .then((d) => setDatasetAttributes(d.attributes ?? []))
            .catch(() => setDatasetAttributes([]))
        } else {
          setDatasetAttributes([])
        }
      } else {
        setStatus(`Failed: ${data.detail ?? imagesData.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openDataset = async (name) => {
    if (activeDataset === name) {
      setActiveDataset('')
      return
    }
    setExportResult(null)
    setExportFormat('tar')
    setShowExportPanel(false)
    setDatasetBatchFilter(null)
    await refreshDataset(name)
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      setTemplates(data.templates ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSetTemplate = async (name, templateName) => {
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(name)}/template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: templateName }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Set model for ${name} to ${templateName}`)
        fetchDatasets()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openAnnotate = async (name, templateName, batchFilter = null, startImage = null) => {
    if (!templateName) {
      setStatus('Set a model for this dataset before annotating')
      return
    }
    try {
      const imagesUrl = batchFilter
        ? `/api/datasets/${encodeURIComponent(name)}/images?batch=${encodeURIComponent(batchFilter.replace(/^raw-images_/, ''))}&limit=0`
        : `/api/datasets/${encodeURIComponent(name)}/images`
      const [imagesRes, attrsRes, annotRes] = await Promise.all([
        fetch(imagesUrl),
        fetch(`/api/templates/${encodeURIComponent(templateName)}/attributes`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
      ])
      const images = await imagesRes.json()
      const attrs = await attrsRes.json()
      const annot = await annotRes.json()
      if (!imagesRes.ok || !attrsRes.ok || !annotRes.ok) {
        setStatus('Failed to load annotation data')
        return
      }
      const attributes = attrs.attributes ?? []
      const length =
        Math.max(
          0,
          ...attributes.flatMap((g) => g.indices),
        ) + 1
      const filteredImages = batchFilter
        ? (images.images ?? [])
        : Object.values(images.groups ?? {}).flat()
      const annotations = annot.annotations ?? {}
      // Resume where you left off: start on the requested image, or the
      // first not-yet-annotated one, or the first image as a fallback.
      const startIndex = startImage
        ? Math.max(0, filteredImages.indexOf(startImage))
        : Math.max(
            0,
            filteredImages.findIndex((src) => annotations[src] === undefined),
          )
      const initialValues = annotations[filteredImages[startIndex]] ?? Array(length).fill(0)
      const initialOptionIndex = (group) => {
        if (!group) return 0
        const selected = group.indices.findIndex((idx) => initialValues[idx] === 1)
        return selected >= 0 ? selected : 0
      }
      setAnnotate({
        dataset: name,
        template: templateName,
        batchFilter,
        images: filteredImages,
        attributes,
        annotations,
        length,
        index: startIndex,
        step: 0,
        optionIndex: initialOptionIndex(attributes[0]),
        wizardMode: true,
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openAttrAnnotate = (name, templateName, batchFilter = null, startImage = null, startAttr = null) => {
    if (!templateName) {
      setStatus('Set a model for this dataset before annotating')
      return
    }
    const all = batchHandlers[batchFilter]?.handlers ?? []
    const others = all.filter((h) => h.user !== currentUser)
    if (others.length > 0) {
      setBatchWarn({
        batch: batchFilter,
        handlers: all,
        proceed: () =>
          launchAttrAnnotate(name, templateName, batchFilter, startImage, startAttr),
      })
      return
    }
    launchAttrAnnotate(name, templateName, batchFilter, startImage, startAttr)
  }

  const launchAttrAnnotate = async (name, templateName, batchFilter = null, startImage = null, startAttr = null) => {
    try {
      const imagesUrl = batchFilter
        ? `/api/datasets/${encodeURIComponent(name)}/images?batch=${encodeURIComponent(batchFilter.replace(/^raw-images_/, ''))}&limit=0`
        : `/api/datasets/${encodeURIComponent(name)}/images`
      const [imagesRes, attrsRes, annotRes] = await Promise.all([
        fetch(imagesUrl),
        fetch(`/api/templates/${encodeURIComponent(templateName)}/attributes`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
      ])
      const images = await imagesRes.json()
      const attrs = await attrsRes.json()
      const annot = await annotRes.json()
      if (!imagesRes.ok || !attrsRes.ok || !annotRes.ok) {
        setStatus('Failed to load annotation data')
        return
      }
      const attributes = attrs.attributes ?? []
      const length =
        Math.max(0, ...attributes.flatMap((g) => g.indices)) + 1
      const filteredImages = batchFilter
        ? (images.images ?? [])
        : Object.values(images.groups ?? {}).flat()
      const annotations = annot.annotations ?? {}
      setAttrAnnotate({
        dataset: name,
        template: templateName,
        batchFilter,
        images: filteredImages,
        attributes,
        length,
        annotations,
        attrIndex: typeof startAttr === 'number' && startAttr >= 0 && startAttr < attributes.length ? startAttr : 0,
        imgIndex: Math.max(0, filteredImages.indexOf(startImage)),
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const attrValuesFor = (image) => {
    if (!attrAnnotate) return []
    return (
      attrAnnotate.annotations[image] ?? Array(attrAnnotate.length).fill(0)
    )
  }

  const applyAttrValue = async (optionIndex, selected, advance = true) => {
    if (!attrAnnotate) return
    const image = attrAnnotate.images[attrAnnotate.imgIndex]
    const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
    const current = [...(attrAnnotate.annotations[image] ?? Array(attrAnnotate.length).fill(0))]
    if (group.type === 'single') {
      group.indices.forEach((idx) => {
        current[idx] = 0
      })
      if (selected && optionIndex >= 0) {
        current[group.indices[optionIndex]] = 1
      }
    } else if (optionIndex >= 0) {
      current[group.indices[optionIndex]] = selected ? 1 : 0
    }
    setAttrAnnotate((s) => ({
      ...s,
      annotations: { ...s.annotations, [image]: current },
    }))
    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(attrAnnotate.dataset)}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          values: current,
          attr_index: attrAnnotate.attrIndex,
          user: currentUser,
        }),
      })
      if (response.ok) {
        setDatasetAnnotationTimes((prev) => ({
          ...prev,
          [image]: new Date().toISOString(),
        }))
        setDatasetLastAttrs((prev) => ({
          ...prev,
          [image]: attrAnnotate.attrIndex,
        }))
        if (currentUser) {
          const now = new Date().toISOString()
          const key = String(attrAnnotate.attrIndex)
          setDatasetReviewed((prev) => ({
            ...prev,
            [image]: {
              ...(prev[image] ?? {}),
              [key]: { ...(prev[image]?.[key] ?? {}), [currentUser]: now },
            },
          }))
          setMyLastEdit({
            image,
            attr_index: attrAnnotate.attrIndex,
            created_at: now,
          })
        }
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
    if (advance && group.type === 'single') {
      attrNextImage()
    }
  }

  // Fire-and-forget: records that the current user finished reviewing
  // `image` under attribute `attrIndex` — called whenever a {image, attr}
  // pair is departed in the correction modal — even when no attribute
  // changed, so "From last edited" can resume at the last image actually
  // looked at. Returns the request promise so callers can await it.
  const logAttrCheck = (dataset, image, attrIndex) => {
    if (!dataset || !image) return Promise.resolve(null)
    return fetch(`/api/datasets/${encodeURIComponent(dataset)}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        attr_index: attrIndex,
        user: currentUser,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.skipped) return
        const now = new Date().toISOString()
        const key = String(attrIndex)
        setDatasetReviewed((prev) => ({
          ...prev,
          [image]: {
            ...(prev[image] ?? {}),
            [key]: {
              ...(prev[image]?.[key] ?? {}),
              [currentUser || 'root']: now,
            },
          },
        }))
        setMyLastEdit({ image, attr_index: attrIndex, created_at: now })
      })
      .catch(() => {})
  }

  const attrNextImage = () => {
    if (!attrAnnotate) return
    if (attrAnnotate.imgIndex >= attrAnnotate.images.length - 1) {
      finishAttrReview()
      return
    }
    setAttrAnnotate((s) => ({ ...s, imgIndex: s.imgIndex + 1 }))
  }

  const attrPrevImage = () => {
    if (!attrAnnotate) return
    setAttrAnnotate((s) => ({
      ...s,
      imgIndex: Math.max(s.imgIndex - 1, 0),
      done: false,
      doneReviewed: null,
    }))
  }

  // "Done" on the last image: record that final image's check, fetch
  // cumulative per-user progress for this batch+attribute, then swap the
  // modal body for the completion screen.
  const finishAttrReview = async () => {
    if (!attrAnnotate) return
    const { dataset, batchFilter, attrIndex, images, imgIndex } = attrAnnotate
    await logAttrCheck(dataset, images[imgIndex], attrIndex)
    let reviewed = null
    try {
      const params = new URLSearchParams({
        user: currentUser ?? '',
        attr_index: String(attrIndex),
      })
      if (batchFilter) {
        params.set('batch', batchFilter.replace(/^raw-images_/, ''))
      }
      const r = await fetch(
        `/api/datasets/${encodeURIComponent(dataset)}/review-progress?${params}`,
      )
      const data = await r.json()
      if (r.ok) reviewed = data.reviewed
    } catch {
      // progress stays null — the card still renders without the count
    }
    setAttrAnnotate((s) =>
      s ? { ...s, done: true, doneReviewed: reviewed } : s,
    )
  }

  const removeFromDatasetImage = async () => {
    setConfirmingRemoveAttrImage(false)
    if (!attrAnnotate) return
    const image = attrAnnotate.images[attrAnnotate.imgIndex]
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(attrAnnotate.dataset)}/images/remove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, user: currentUser }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed image from dataset`)
      await refreshDataset(attrAnnotate.dataset)
      setMyLastEdit((prev) => (prev?.image === image ? null : prev))
      setAttrAnnotate((state) => {
        if (!state) return state
        const newImages = state.images.filter((s) => s !== image)
        const newAnnotations = { ...state.annotations }
        delete newAnnotations[image]
        if (newImages.length === 0) {
          return null
        }
        const nextIndex = Math.min(state.imgIndex, newImages.length - 1)
        return { ...state, images: newImages, annotations: newAnnotations, imgIndex: nextIndex }
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const removeDatasetBatch = async () => {
    setConfirmingRemoveDatasetBatch(false)
    if (!activeDataset || !datasetBatchToRemove) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/batches/${encodeURIComponent(datasetBatchToRemove)}/remove`,
        {
          method: 'POST',
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed ${data.removed} image${data.removed === 1 ? '' : 's'} from dataset`)
      await refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchSimilar = async (threshold) => {
    if (!activeDataset || !datasetBatchFilter) return
    const t = threshold ?? similarThreshold
    const batchName = datasetBatchFilter.replace(/^raw-images_/, '')
    setSimilarLoading(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/images/similar?batch=${encodeURIComponent(batchName)}&threshold=${t}`,
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setSimilarView({ clusters: data.clusters, singles: data.singles })
      setSelectedDatasetImages(new Set())
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setSimilarLoading(false)
    }
  }

  const selectClusterRest = (cluster) => {
    setSelectedDatasetImages(
      (prev) => new Set([...prev, ...cluster.slice(1)]),
    )
  }

  const selectAllClusterRest = (clusters) => {
    setSelectedDatasetImages(
      (prev) =>
        new Set([...prev, ...clusters.flatMap((c) => c.slice(1))]),
    )
  }

  const toggleDatasetImageSelect = (src) => {
    setSelectedDatasetImages((prev) => {
      const next = new Set(prev)
      if (next.has(src)) {
        next.delete(src)
      } else {
        next.add(src)
      }
      return next
    })
  }

  const removeSelectedDatasetImages = async () => {
    setConfirmingRemoveDatasetImages(false)
    const paths = [...selectedDatasetImages]
    if (!activeDataset || paths.length === 0) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/images/remove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: paths, user: currentUser }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed ${paths.length} image${paths.length === 1 ? '' : 's'} from dataset`)
      const pathSet = new Set(paths)
      const stemByPath = {}
      for (const [stem, imgs] of Object.entries(datasetImageGroups)) {
        for (const p of imgs) stemByPath[p] = stem
      }
      setDatasetImageGroups((prev) => {
        const next = {}
        for (const [k, v] of Object.entries(prev)) {
          next[k] = v.filter((s) => !pathSet.has(s))
        }
        return next
      })
      setDatasetBatchStats((prev) => {
        const next = { ...prev }
        for (const p of paths) {
          const stem = stemByPath[p] ?? datasetBatchFilter
          const cur = next[stem]
          if (!cur) continue
          next[stem] = {
            total: Math.max(0, cur.total - 1),
            annotated: Math.max(
              0,
              cur.annotated - (datasetAnnotations[p] !== undefined ? 1 : 0),
            ),
          }
        }
        return next
      })
      setDatasetAnnotations((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetAnnotationTimes((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetLastAttrs((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetReviewed((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setMyLastEdit((prev) => (prev && paths.includes(prev.image) ? null : prev))
      setSimilarView((prev) => {
        if (!prev) return prev
        const clusters = []
        const extraSingles = []
        for (const c of prev.clusters) {
          const kept = c.filter((p) => !pathSet.has(p))
          if (kept.length >= 2) {
            clusters.push(kept)
          } else if (kept.length === 1) {
            extraSingles.push(kept[0])
          }
        }
        return {
          clusters,
          singles: [
            ...prev.singles.filter((p) => !pathSet.has(p)),
            ...extraSingles,
          ],
        }
      })
      setSelectedDatasetImages(new Set())
      setDatasetRemoveMode(false)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const annotateValuesFor = (image) => {
    if (!annotate) return []
    return annotate.annotations[image] ?? Array(annotate.length).fill(0)
  }

  const setAnnotateValue = (group, optionIndex, checked) => {
    setAnnotate((state) => {
      if (!state) return state
      const image = state.images[state.index]
      const current = [...(state.annotations[image] ?? Array(state.length).fill(0))]
      if (group.type === 'single') {
        group.indices.forEach((idx) => {
          current[idx] = 0
        })
        current[group.indices[optionIndex]] = 1
      } else {
        current[group.indices[optionIndex]] = checked ? 1 : 0
      }
      return {
        ...state,
        annotations: { ...state.annotations, [image]: current },
      }
    })
  }

  const saveAnnotation = async () => {
    if (!annotate) return
    const image = annotate.images[annotate.index]
    const values = annotateValuesFor(image)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(annotate.dataset)}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image,
            values,
            attr_index: annotate.wizardMode ? annotate.step : undefined,
            user: currentUser,
          }),
        },
      )
      if (!response.ok) {
        const data = await response.json()
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      } else {
        setStatus('Annotation saved')
        setDatasetAnnotationTimes((prev) => ({
          ...prev,
          [image]: new Date().toISOString(),
        }))
        if (currentUser) {
          const now = new Date().toISOString()
          const key = annotate.wizardMode ? String(annotate.step) : 'all'
          setDatasetReviewed((prev) => ({
            ...prev,
            [image]: {
              ...(prev[image] ?? {}),
              [key]: { ...(prev[image]?.[key] ?? {}), [currentUser]: now },
            },
          }))
        }
        if (annotate.wizardMode) {
          setDatasetLastAttrs((prev) => ({
            ...prev,
            [image]: annotate.step,
          }))
          if (currentUser) {
            setMyLastEdit({
              image,
              attr_index: annotate.step,
              created_at: new Date().toISOString(),
            })
          }
        }
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const requestRemoveImage = () => {
    if (!annotate) return
    setConfirmingRemoveImage(true)
  }

  const removeCurrentImage = async () => {
    setConfirmingRemoveImage(false)
    if (!annotate) return
    const image = annotate.images[annotate.index]
    try {
      const response = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [image] }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed image (${data.deleted} deleted)`)
      const wasAnnotated = datasetAnnotations[image] !== undefined
      setDatasetImageGroups((prev) => {
        const next = {}
        for (const [k, v] of Object.entries(prev)) {
          next[k] = v.filter((s) => s !== image)
        }
        return next
      })
      setDatasetBatchStats((prev) => {
        const stem = `raw-images_${image.split('/').slice(-2, -1)[0]}`
        const cur = prev[stem]
        if (!cur) return prev
        return {
          ...prev,
          [stem]: {
            total: Math.max(0, cur.total - 1),
            annotated: Math.max(0, cur.annotated - (wasAnnotated ? 1 : 0)),
          },
        }
      })
      setDatasetAnnotations((prev) => {
        const next = { ...prev }
        delete next[image]
        return next
      })
      setDatasetAnnotationTimes((prev) => {
        const next = { ...prev }
        delete next[image]
        return next
      })
      setDatasetLastAttrs((prev) => {
        const next = { ...prev }
        delete next[image]
        return next
      })
      setDatasetReviewed((prev) => {
        const next = { ...prev }
        delete next[image]
        return next
      })
      setMyLastEdit((prev) => (prev?.image === image ? null : prev))
      setAnnotate((state) => {
        if (!state) return state
        const newImages = state.images.filter((s) => s !== image)
        const newAnnotations = { ...state.annotations }
        delete newAnnotations[image]
        if (newImages.length === 0) {
          return null
        }
        const nextIndex = Math.min(state.index, newImages.length - 1)
        const nextValues = newAnnotations[newImages[nextIndex]] ?? Array(state.length).fill(0)
        return {
          ...state,
          images: newImages,
          annotations: newAnnotations,
          index: nextIndex,
          step: 0,
          optionIndex: initialOptionIndex(state.attributes[0], nextValues),
        }
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const initialOptionIndex = (group, values) => {
    if (!group) return 0
    const selected = group.indices.findIndex((idx) => values[idx] === 1)
    return selected >= 0 ? selected : 0
  }

  const navigateAnnotate = async (delta) => {
    await saveAnnotation()
    setAnnotate((state) => {
      if (!state) return state
      const nextIndex = Math.min(
        Math.max(0, state.index + delta),
        state.images.length - 1,
      )
      const nextImage = state.images[nextIndex]
      const values = state.annotations[nextImage] ?? Array(state.length).fill(0)
      return {
        ...state,
        index: nextIndex,
        step: 0,
        optionIndex: initialOptionIndex(state.attributes[0], values),
      }
    })
  }

  const jumpAnnotate = async (index) => {
    await saveAnnotation()
    setAnnotate((state) => {
      if (!state) return state
      const nextImage = state.images[index]
      const values =
        state.annotations[nextImage] ?? Array(state.length).fill(0)
      return {
        ...state,
        index,
        step: 0,
        optionIndex: initialOptionIndex(state.attributes[0], values),
      }
    })
  }

  const optionNav = (delta) => {
    setAnnotate((state) => {
      if (!state) return state
      const group = state.attributes[state.step]
      if (!group) return state
      const next =
        (state.optionIndex + delta + group.options.length) %
        group.options.length
      return { ...state, optionIndex: next }
    })
  }

  const wizardToggle = () => {
    setAnnotate((state) => {
      if (!state) return state
      const group = state.attributes[state.step]
      if (!group) return state
      const image = state.images[state.index]
      const values = [...(state.annotations[image] ?? Array(state.length).fill(0))]
      const optionIdx = state.optionIndex
      const isSelected = values[group.indices[optionIdx]] === 1
      if (group.type === 'single') {
        if (isSelected) return state
        group.indices.forEach((idx) => {
          values[idx] = 0
        })
        values[group.indices[optionIdx]] = 1
      } else {
        values[group.indices[optionIdx]] = isSelected ? 0 : 1
      }
      return {
        ...state,
        annotations: { ...state.annotations, [image]: values },
      }
    })
  }

  const wizardStepOptionIndex = (step, values) => {
    return initialOptionIndex(annotate?.attributes?.[step], values)
  }

  const wizardNext = async () => {
    if (!annotate) return
    if (annotate.step < annotate.attributes.length - 1) {
      setAnnotate((state) => {
        if (!state) return state
        const nextStep = state.step + 1
        const image = state.images[state.index]
        const values = state.annotations[image] ?? Array(state.length).fill(0)
        return {
          ...state,
          step: nextStep,
          optionIndex: initialOptionIndex(state.attributes[nextStep], values),
        }
      })
    } else {
      await navigateAnnotate(1)
    }
  }

  const wizardPrev = async () => {
    if (!annotate) return
    if (annotate.step > 0) {
      setAnnotate((state) => {
        if (!state) return state
        const prevStep = state.step - 1
        const image = state.images[state.index]
        const values = state.annotations[image] ?? Array(state.length).fill(0)
        return {
          ...state,
          step: prevStep,
          optionIndex: initialOptionIndex(state.attributes[prevStep], values),
        }
      })
    } else {
      await navigateAnnotate(-1)
    }
  }

  const doSaveSplit = async () => {
    const total =
      Number(datasetSplit.train) +
      Number(datasetSplit.val) +
      Number(datasetSplit.test)
    if (total !== 100) {
      setStatus(`Split must sum to 100 (currently ${total})`)
      return
    }
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datasetSplit),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Saved split for ${activeDataset}`)
        setDatasetSplit(data.split)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doExportDataset = async () => {
    const total =
      Number(datasetSplit.train) +
      Number(datasetSplit.val) +
      Number(datasetSplit.test)
    if (total !== 100) {
      setStatus(`Split must sum to 100 (currently ${total})`)
      return
    }
    if (selectedExportBatches.length === 0) {
      setStatus('Select at least one batch to export')
      return
    }
    setExporting(true)
    setExportResult(null)
    setStatus(`Exporting ${activeDataset}...`)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            split: datasetSplit,
            format: exportFormat,
            batches: selectedExportBatches,
            group_split: exportGroupSplit,
          }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        const total = data.counts.train + data.counts.val + data.counts.test
        const missing = data.missing_annotations ?? 0
        setStatus(
          `Exported ${activeDataset}: train ${data.counts.train}, val ${data.counts.val}, test ${data.counts.test}` +
            (missing > 0 ? ` — ${missing}/${total} images not annotated` : ''),
        )
        setExportResult(data)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setExporting(false)
    }
  }

  const doAssignBatch = async () => {
    if (!selectedBatch) return
    const name = newDatasetName.trim() || selectedDataset
    if (!name) {
      setStatus('Choose or enter a dataset name')
      return
    }
    if (newDatasetName.trim() && !datasets.some((d) => d.name === newDatasetName.trim())) {
      try {
        const response = await fetch('/api/datasets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newDatasetName.trim() }),
        })
        if (!response.ok) {
          const data = await response.json()
          setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
          return
        }
      } catch {
        setStatus('Failed: could not reach the server')
        return
      }
    }
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(name)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: selectedBatch }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(
          `Assigned ${data.batch} to ${data.dataset} as ${data.split}`,
        )
        setNewDatasetName('')
        setSelectedDataset('')
        setAssignOpen(false)
        fetchDatasets()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doAssignBatchToDataset = async (batch) => {
    if (!activeDataset || !batch) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Assigned ${data.batch} to ${data.dataset}`)
        setAssignToDatasetOpen(false)
        fetchDatasets()
        openDataset(activeDataset)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doCreateDataset = async (name, template) => {
    if (creatingDataset) return
    const trimmed = (name ?? '').trim()
    if (!trimmed) return
    setCreatingDataset(true)
    setCreateDatasetOpen(false)
    try {
      const createRes = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          template,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        setStatus(`Failed: ${createData.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Created dataset ${createData.dataset}`)
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setCreatingDataset(false)
    }
  }

  const doImportBatch = async (batchIds) => {
    if (!batchIds || batchIds.length === 0) return
    setImportingBatch(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_ids: batchIds }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Imported ${data.count} images from ${data.batches.length} batches`)
      setImportBatchOpen(false)
      fetchDatasets()
      refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setImportingBatch(false)
    }
  }

  const openDatasetSettings = () => {
    if (!datasets.some((d) => d.name === activeDataset)) return
    setDatasetSettingsOpen(true)
  }

  const doRemoveActiveDataset = async () => {
    setConfirmingRemoveActiveDataset(false)
    if (!activeDataset) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        setStatus('Failed: could not remove dataset')
        return
      }
      setStatus(`Deleted dataset ${activeDataset}`)
      setDatasetSettingsOpen(false)
      setActiveDataset('')
      fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSaveDatasetSettings = async (name, template) => {
    if (!name?.trim()) {
      setStatus('Dataset name is required')
      return
    }
    setSavingDatasetSettings(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            template,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Updated dataset ${data.dataset}`)
      setDatasetSettingsOpen(false)
      const newName = data.dataset
      fetchDatasets().then(() => {
        if (activeDataset !== newName) {
          setActiveDataset(newName)
        }
        refreshDataset(newName)
      })
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setSavingDatasetSettings(false)
    }
  }

  const fetchArchives = async () => {
    try {
      const response = await fetch('/api/archives')
      const data = await response.json()
      if (response.ok) setArchives(data.archives ?? [])
    } catch {
      // ignore
    }
  }

  const doArchiveDataset = async () => {
    if (!activeDataset || archiving) return
    setArchiving(true)
    setStatus('Creating archive...')
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/archive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: archiveFormat }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'archive failed'}`)
        return
      }
      setStatus(
        `Archived ${data.archive} (${data.images} images, ${data.annotated} annotated)`,
      )
      fetchArchives()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setArchiving(false)
    }
  }

  const doDeleteArchive = async (id) => {
    setConfirmingDeleteArchive(null)
    try {
      const response = await fetch(`/api/archives/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        setStatus('Failed: could not delete archive')
        return
      }
      setStatus('Archive deleted')
      fetchArchives()
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const handleImportArchiveFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploadingArchive(true)
    setStatus('Uploading and restoring archive...')
    try {
      const response = await fetch('/api/archives/import', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'import failed'}`)
        return
      }
      setStatus(
        `Restored dataset ${data.dataset} (${data.images} images) from ${data.archive}`,
      )
      setImportArchiveOpen(false)
      fetchArchives()
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setUploadingArchive(false)
    }
  }

  const doRestoreArchive = async (id) => {
    if (restoringArchiveId) return
    setRestoringArchiveId(id)
    setStatus('Restoring dataset...')
    try {
      const response = await fetch(`/api/archives/${id}/restore`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'restore failed'}`)
        return
      }
      setStatus(`Restored dataset ${data.dataset} (${data.images} images)`)
      setImportArchiveOpen(false)
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRestoringArchiveId(null)
    }
  }

  const runPrelabel = async (writeValues = prelabelWriteValues) => {
    if (!activeDataset) return
    setPrelabelConfirmOpen(false)
    setPreLabeling(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/prelabel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch: datasetBatchFilter || '',
            write_values: writeValues,
            user: currentUser,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(
        writeValues
          ? `Pre-labeled ${data.images} images`
          : `Pre-labeled ${data.images} images (predictions only, values untouched)`,
      )
      openDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setPreLabeling(false)
    }
  }

  const doPrelabel = (writeValues = true) => {
    if (!activeDataset) return
    setPrelabelWriteValues(writeValues)
    if (writeValues) {
      const existingCount = datasetBatchFilter
        ? (datasetBatchStats[datasetBatchFilter]?.annotated ?? 0)
        : datasetTotals.annotated
      if (existingCount > 0) {
        setPrelabelConfirmCount(existingCount)
        setPrelabelConfirmOpen(true)
        return
      }
    }
    runPrelabel(writeValues)
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (response.ok) setUsers(data.users ?? [])
    } catch {
      // picker still usable for creating a first user even if this fails
    }
  }

  const openUserPicker = () => {
    fetchUsers()
    setUserPickerOpen(true)
  }

  // Runs `action(name)` immediately if a user identity is already chosen;
  // otherwise opens the picker and resumes `action(name)` once one is
  // selected/verified. `action` always receives the resolved name directly
  // (not just via the `currentUser` state) so it can be used synchronously
  // even in the same click that just picked the user, before React re-renders.
  const requireUser = (action) => {
    if (currentUser) {
      action(currentUser)
      return
    }
    pendingUserActionRef.current = action
    openUserPicker()
  }

  const confirmUser = (name) => {
    setCurrentUser(name)
    localStorage.setItem('annotatorUser', name)
    setUserPickerOpen(false)
    const action = pendingUserActionRef.current
    pendingUserActionRef.current = null
    if (action) action(name)
  }

  // Closing the picker without picking also drops any queued action from
  // requireUser — otherwise a stale pending action would fire the next
  // time confirmUser runs from an unrelated context.
  const closeUserPicker = () => {
    pendingUserActionRef.current = null
    setUserPickerOpen(false)
  }

  const switchUser = () => {
    setCurrentUser('')
    localStorage.removeItem('annotatorUser')
    openUserPicker()
  }

  const fetchActivity = async () => {
    if (!activeDataset) return
    setActivityLoading(true)
    try {
      const [lbRes, actRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(activeDataset)}/leaderboard`),
        fetch(`/api/activity?dataset=${encodeURIComponent(activeDataset)}&limit=50`),
      ])
      const lbData = await lbRes.json()
      const actData = await actRes.json()
      if (lbRes.ok && actRes.ok) {
        setLeaderboard(lbData.leaderboard ?? [])
        setActivity(actData.activity ?? [])
        setActivityOpen(true)
      } else {
        setStatus(`Failed: ${lbData.detail ?? actData.detail ?? 'Could not load activity'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setActivityLoading(false)
    }
  }

  const fetchPrelabelStats = async () => {
    if (!activeDataset) return
    setPrelabelStatsLoading(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/prelabel-stats`,
      )
      const data = await response.json()
      if (response.ok) {
        setPrelabelStats(data)
        setPrelabelStatsOpen(true)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Could not load stats'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setPrelabelStatsLoading(false)
    }
  }

  const doDeleteBatch = async () => {
    if (!selectedBatch) return
    setStatus(`Deleting batch ${selectedBatch}...`)
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(selectedBatch)}`,
        { method: 'DELETE' },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Deleted batch ${selectedBatch}`)
        setSelectedBatch(null)
        setDeleteBatchConfirmOpen(false)
        fetchBatches()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  useEffect(() => {
    fetchBatches()
    fetchSources()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setRelativeTimeTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!prelabelMenuOpen) return
    const handleClick = (e) => {
      if (prelabelMenuRef.current && !prelabelMenuRef.current.contains(e.target)) {
        setPrelabelMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [prelabelMenuOpen])

  useEffect(() => {
    if (!attrMenuOpen) return
    const handleClick = (e) => {
      if (attrMenuRef.current && !attrMenuRef.current.contains(e.target)) {
        setAttrMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [attrMenuOpen])

  useEffect(() => {
    if (!exportMenuOpen && !newDatasetMenuOpen && !handlersMenuOpen) return
    const handleClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false)
      }
      if (
        newDatasetMenuRef.current &&
        !newDatasetMenuRef.current.contains(e.target)
      ) {
        setNewDatasetMenuOpen(false)
      }
      if (
        handlersMenuRef.current &&
        !handlersMenuRef.current.contains(e.target)
      ) {
        setHandlersMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [exportMenuOpen, newDatasetMenuOpen, handlersMenuOpen])

  useEffect(() => {
    if (activePage === 'archives' || archivesOpen || importArchiveOpen) {
      fetchArchives()
    }
  }, [activePage, archivesOpen, importArchiveOpen])

  useEffect(() => {
    fetchDatasets()
    fetchTemplates()
  }, [])

  // Validate a stored identity against the server on load — if the user was
  // removed/renamed server-side (e.g. users table reset), don't keep
  // attributing this browser's annotations to a name that no longer exists.
  useEffect(() => {
    const stored = localStorage.getItem('annotatorUser')
    if (!stored) return
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        const exists = (data.users ?? []).some((u) => u.name === stored)
        if (!exists) {
          localStorage.removeItem('annotatorUser')
          setCurrentUser('')
        }
      })
      .catch(() => {
        // server unreachable at boot — keep the stored name, don't punish
        // the user for a transient network hiccup
      })
  }, [])

  useEffect(() => {
    if (selectedBatchId !== null) {
      fetchRawImages(selectedBatchId, imagePage)
    }
  }, [selectedBatchId, imagePage])

  useEffect(() => {
    if (datasetBatches.length > 0 && !datasetBatches.includes(datasetBatchFilter)) {
      setDatasetBatchFilter(datasetBatches[0])
    }
  }, [datasetBatches, datasetBatchFilter])

  useEffect(() => {
    setDatasetRemoveMode(false)
    setSelectedDatasetImages(new Set())
    setSimilarView(null)
  }, [activeDataset])

  useEffect(() => {
    if (!annotate) return
    const handleKey = (e) => {
      if (!annotate.wizardMode) {
        if (e.key === 'ArrowLeft') navigateAnnotate(-1)
        if (e.key === 'ArrowRight') navigateAnnotate(1)
        if (e.key === 'Escape') setAnnotate(null)
        return
      }
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)
      ) {
        e.preventDefault()
      }
      if (e.key === 'ArrowUp') optionNav(-1)
      if (e.key === 'ArrowDown') optionNav(1)
      if (e.key === 'ArrowLeft') wizardPrev()
      if (e.key === 'ArrowRight' || e.key === 'Enter') wizardNext()
      if (e.key === ' ') wizardToggle()
      if (e.key === 'Escape') setAnnotate(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [annotate])

  useEffect(() => {
    if (!attrAnnotate) return
    const handleKey = (e) => {
      const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
      if (!group) return
      if (e.key === 'Escape') {
        setAttrAnnotate(null)
      }
      if (attrAnnotate.done) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          attrPrevImage()
        }
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        attrPrevImage()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        attrNextImage()
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1
        if (i >= 0 && i < group.options.length) {
          e.preventDefault()
          const current = attrValuesFor(attrAnnotate.images[attrAnnotate.imgIndex])
          const isOneOf = group.type === 'single'
          const newSelected = isOneOf ? true : current[group.indices[i]] !== 1
          applyAttrValue(i, newSelected)
        }
      }
      if (e.key === '0') {
        e.preventDefault()
        if (group.type === 'single') {
          applyAttrValue(-1, false)
        }
      }
      if (e.key === 'x' || e.key === 'X') {
        setConfirmingRemoveAttrImage(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [attrAnnotate])

  // Departure logging: any change of the shown {image, attrIndex} pair —
  // arrows, thumbnail jumps, attribute-dropdown switch — or the modal
  // closing logs a "check" for the pair that just left the screen.
  useEffect(() => {
    if (!attrAnnotate) {
      const prev = attrShownRef.current
      if (prev) logAttrCheck(prev.dataset, prev.image, prev.attrIndex)
      attrShownRef.current = null
      return
    }
    const shown = {
      dataset: attrAnnotate.dataset,
      image: attrAnnotate.images[attrAnnotate.imgIndex],
      attrIndex: attrAnnotate.attrIndex,
    }
    const prev = attrShownRef.current
    if (
      prev &&
      (prev.image !== shown.image || prev.attrIndex !== shown.attrIndex) &&
      attrAnnotate.images.includes(prev.image) // skip if it was just removed
    ) {
      logAttrCheck(prev.dataset, prev.image, prev.attrIndex)
    }
    attrShownRef.current = shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrAnnotate?.imgIndex, attrAnnotate?.attrIndex, attrAnnotate === null])

  useEffect(() => {
    if (!attrAnnotate) return
    const el = attrStripRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [attrAnnotate?.imgIndex])

  useEffect(() => {
    if (showExportPanel) {
      setSelectedExportBatches(datasetBatches)
      setExportResult(null)
    }
  }, [showExportPanel, datasetBatches])

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    if (uploadSourceId) {
      formData.append('source_id', uploadSourceId)
    }

    setStatus('Uploading image...')
    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        const batchLabel = data.batches?.length
          ? `batches ${data.batches.join(', ')}`
          : `batch ${data.batch}`
        setStatus(`Uploaded ${batchLabel}: ${data.image_count} images`)
        fetchBatches()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50">
      <main className="min-w-0 flex-1 p-8">
        <header className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Dataset Collector
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activePage === 'raw_image'
                ? 'Upload TARs and curate imported, frames, and crops'
                : activePage === 'datasets'
                  ? 'Organize batches and export datasets'
                  : 'Manage stored dataset archives'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage('raw_image')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'raw_image'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Raw Image
            </button>
            <button
              type="button"
              onClick={() => setActivePage('datasets')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'datasets'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Datasets
            </button>
            <button
              type="button"
              onClick={() => setActivePage('archives')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'archives'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Archives
            </button>
            {currentUser ? (
              <button
                type="button"
                onClick={switchUser}
                title="Switch annotator"
                className="ml-1 flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.902.902 0 01-.24-.631C1.25 13.041 3.71 11.75 5.75 11.75c.95 0 1.813.216 2.546.57a5.48 5.48 0 00-.367 2.156l-.004.407a4.467 4.467 0 01-1.644.549 12.978 12.978 0 01-4.791-.106zM16 8a2 2 0 11-4 0 2 2 0 014 0zm5.68 7.326a.9.9 0 00.24-.631c0-1.653-2.46-2.945-4.5-2.945-.94 0-1.8.212-2.528.562.232.664.36 1.377.367 2.146l.003.426a4.5 4.5 0 001.668.556 13.013 13.013 0 004.75-.114zM10 11.25c-2.41 0-4.75 1.52-4.75 3.438 0 .06.003.118.01.176.51 2.054 2.41 3.386 4.74 3.386 2.33 0 4.23-1.332 4.74-3.386a.94.94 0 00.01-.176c0-1.918-2.34-3.438-4.75-3.438z" />
                </svg>
                {currentUser}
              </button>
            ) : (
              <button
                type="button"
                onClick={openUserPicker}
                title="Choose who's working"
                className="ml-1 flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
                Who's working?
              </button>
            )}
          </div>
        </header>

        {/*
          <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Videos</h2>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {videos.length}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={removeVideoMode}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UploadIcon className="h-4 w-4" />
                Upload Video
              </button>
              {videos.length > 0 ? (
                !removeVideoMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveVideoMode(true)
                      setSelectedVideosToRemove(new Set())
                    }}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                  >
                    Remove videos
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveVideos(true)}
                      disabled={selectedVideosToRemove.size === 0}
                      className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Delete {selectedVideosToRemove.size} video{selectedVideosToRemove.size === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectedVideosToRemove.size === videos.length
                          ? setSelectedVideosToRemove(new Set())
                          : setSelectedVideosToRemove(new Set(videos.map((v) => v.filename)))
                      }
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      {selectedVideosToRemove.size === videos.length ? 'Deselect all' : 'Select all'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveVideoMode(false)
                        setSelectedVideosToRemove(new Set())
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                )
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain p-3">
            {videos.map((video) => (
              <VideoThumb
                key={video.filename}
                video={video}
                selected={selectedFilename === video.filename}
                removeMode={removeVideoMode}
                marked={selectedVideosToRemove.has(video.filename)}
                onSelect={() => setSelectedFilename(video.filename)}
                onToggleRemove={() =>
                  setSelectedVideosToRemove((prev) => {
                    const next = new Set(prev)
                    if (next.has(video.filename)) {
                      next.delete(video.filename)
                    } else {
                      next.add(video.filename)
                    }
                    return next
                  })
                }
              />
            ))}
            {videos.length === 0 && (
              <div className="flex w-full shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                No videos yet — click Upload Video
              </div>
            )}
          </div>

          {selectedFilename && (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <h3 className="text-base font-semibold text-slate-800">
                  Menu generate image
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
                    {[
                      { value: 'frames', label: 'Get frame' },
                      { value: 'crops', label: 'Get crop' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVideoMode(option.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          videoMode === option.value
                            ? 'bg-white text-indigo-600 shadow'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {videoMode === 'crops' && (
                    <label className="text-xs font-medium text-slate-700">
                      Crop margin (px)
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={videoCropMargin}
                        onChange={(e) =>
                          setVideoCropMargin(
                            Math.min(200, Math.max(0, Number(e.target.value) || 0)),
                          )
                        }
                        className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                      />
                    </label>
                  )}

                  <label className="text-xs font-medium text-slate-700">
                    Frames / min
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={videoFramesPerMinute}
                      onChange={(e) =>
                        setVideoFramesPerMinute(
                          Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Confidence (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={videoConfidence}
                      onChange={(e) =>
                        setVideoConfidence(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  {(videoMode === 'frames' || videoMode === 'crops') && (
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-xs font-medium text-slate-700">
                        YOLO classes
                      </span>
                      <div className="flex w-full items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            const value = e.target.value
                            if (value && !videoSelectedClasses.includes(value)) {
                              setVideoSelectedClasses((prev) => [...prev, value])
                            }
                            e.target.value = ''
                          }}
                          className="w-48 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                        >
                          <option value="">Add a class</option>
                          {yoloClasses
                            .filter((cls) => !videoSelectedClasses.includes(cls))
                            .map((cls) => (
                              <option key={cls} value={cls}>
                                {cls}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={doVideoExtract}
                          disabled={videoExtracting || videoSelectedClasses.length === 0}
                          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {videoExtracting ? 'Extracting...' : 'Extract'}
                        </button>
                        {videoSelectedClasses.length > 0 ? (
                          <div className="ml-auto flex flex-wrap justify-end gap-2">
                            {videoSelectedClasses.map((cls) => (
                              <span
                                key={cls}
                                className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700"
                              >
                                {cls}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVideoSelectedClasses((prev) =>
                                      prev.filter((c) => c !== cls),
                                    )
                                  }
                                  className="text-indigo-700 hover:text-indigo-900"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Pick at least one class to extract
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-800">
                    Images (batch)
                  </h3>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedVideoBatch ?? ''}
                      onChange={(e) => setSelectedVideoBatch(e.target.value)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 shadow-sm"
                    >
                      {Object.entries(videoImageGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([batch, images]) => (
                          <option key={batch} value={batch}>
                            Batch {batch} ({images.length})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveVideoBatch(true)}
                      disabled={!selectedVideoBatch}
                      className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Remove batch
                    </button>
                  </div>
                </div>

                {videoImages.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No extracted images yet.
                  </p>
                ) : selectedVideoBatch ? (
                  <div className="mt-4 grid grid-cols-6 gap-3">
                    {(videoImageGroups[selectedVideoBatch] ?? []).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() =>
                          setVideoModalIndex(videoImages.indexOf(src))
                        }
                        className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                      >
                        <img
                          src={`/api${src}`}
                          alt=""
                          className="aspect-video w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
        */}

        {activePage === 'raw_image' && (
        <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Raw Images</h2>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {rawSources.length}
            </span>
            <input
              ref={tarInputRef}
              type="file"
              accept=".tar,.tar.gz,.tgz,.tar.bz2,.tar.xz,.zip,.rar,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              disabled={removeRawMode}
              onClick={() => setSourceModalOpen(true)}
              className="ml-auto flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-40"
            >
              Sources
            </button>
            <button
              type="button"
              disabled={removeRawMode}
              onClick={() => setUploadSourceOpen(true)}
              className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArchiveIcon className="h-4 w-4" />
              Upload Image
            </button>
            {rawSources.length > 0 ? (
              !removeRawMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveRawMode(true)
                    setSelectedRawsToRemove(new Set())
                  }}
                  className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                >
                  Remove raw images
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingRemoveRaws(true)}
                    disabled={selectedRawsToRemove.size === 0}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                  >
                    Delete {selectedRawsToRemove.size} raw image
                    {selectedRawsToRemove.size === 1 ? '' : 's'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selectedRawsToRemove.size === rawSources.length
                        ? setSelectedRawsToRemove(new Set())
                        : setSelectedRawsToRemove(new Set(rawSources.map((r) => r.batch)))
                    }
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    {selectedRawsToRemove.size === rawSources.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveRawMode(false)
                      setSelectedRawsToRemove(new Set())
                    }}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </>
              )
            ) : null}
          </div>
          <div className="mt-4 max-w-full space-y-4">
            {rawSourceGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-1.5 flex items-baseline gap-2 px-1">
                  <span
                    className={`text-xs font-semibold ${
                      group.key === 'untagged'
                        ? 'text-slate-400'
                        : 'text-indigo-600'
                    }`}
                  >
                    {group.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {group.items.length} batch
                    {group.items.length === 1 ? '' : 'es'}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto overscroll-x-contain p-1.5">
                  {group.items.map(
                    ({ id, source, batch, previews, count, sourceInfo }) => (
              <button
                key={source}
                type="button"
                onClick={() => {
                  if (removeRawMode) {
                    setSelectedRawsToRemove((prev) => {
                      const next = new Set(prev)
                      if (next.has(batch)) {
                        next.delete(batch)
                      } else {
                        next.add(batch)
                      }
                      return next
                    })
                  } else {
                    setSelectedRaw(source)
                    setSelectedBatchId(id)
                    setImagePage(0)
                  }
                }}
                className={`group relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg shadow-sm transition hover:shadow-md ${
                  selectedRaw === source && !removeRawMode
                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
                    : ''
                } ${
                  selectedRawsToRemove.has(batch)
                    ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                    : ''
                }`}
              >
                <img
                  src={`/api${previews[0]}`}
                alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {removeRawMode && (
                  <div
                    className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ${
                      selectedRawsToRemove.has(batch)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/50 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                )}
                {sourceInfo && (
                  <div className="absolute left-1.5 top-1.5 rounded bg-indigo-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                    {sourceInfo.name} · v{sourceInfo.version}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 text-left text-xs font-medium text-white">
                  <span className="truncate">{source}</span>
                  {count != null && (
                    <span className="shrink-0 text-[10px] text-white/70">
                      {count}
                    </span>
                  )}
                </div>
              </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          {rawSourceGroups.length === 0 && (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
              No batches yet — upload images to get started
            </div>
          )}
          {selectedRaw && (
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-800">
                  {selectedRaw}
                </h3>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {selectedRawImages.length} images
                </span>
                {selectedRawInfo?.type && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {selectedRawInfo.type}
                  </span>
                )}
                {selectedRawInfo?.sourceInfo && (
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                    {selectedRawInfo.sourceInfo.name} · v
                    {selectedRawInfo.sourceInfo.version}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">
                      Generate crops
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Detect objects in this batch and crop them into a new
                      batch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={doGenerateRaw}
                    disabled={
                      rawGenerating || rawSelectedClasses.length === 0
                    }
                    className="shrink-0 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {rawGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
                  <label className="text-xs font-medium text-slate-700">
                    Crop margin (px)
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={rawCropMargin}
                      onChange={(e) =>
                        setRawCropMargin(
                          Math.min(200, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Confidence (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rawConfidence}
                      onChange={(e) =>
                        setRawConfidence(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={rawRemoveSource}
                      onChange={(e) => setRawRemoveSource(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                    />
                    Remove source batch after generate
                  </label>
                </div>

                <div className="mt-4 border-t border-slate-200/70 pt-4">
                  <span className="text-xs font-medium text-slate-700">
                    YOLO classes
                  </span>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && !rawSelectedClasses.includes(value)) {
                          setRawSelectedClasses((prev) => [...prev, value])
                        }
                        e.target.value = ''
                      }}
                      className="w-48 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                    >
                      <option value="">Add a class</option>
                      {yoloClasses
                        .filter((cls) => !rawSelectedClasses.includes(cls))
                        .map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                    </select>
                    {rawSelectedClasses.length > 0 ? (
                      rawSelectedClasses.map((cls) => (
                        <span
                          key={cls}
                          className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                        >
                          {cls}
                          <button
                            type="button"
                            onClick={() =>
                              setRawSelectedClasses((prev) =>
                                prev.filter((c) => c !== cls),
                              )
                            }
                            className="text-indigo-500 transition hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Pick at least one class
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-6 gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
                {pageImages.map((image, index) => (
                  <button
                    key={image.id ?? image}
                    type="button"
                    onClick={() =>
                      setModalIndex(index)
                    }
                    className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                  >
                    <img
                      src={`/api${image.path ?? image}`}
                      alt=""
                      className="aspect-video w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
          {activeImages.length === 0 && (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
              No images yet
            </div>
          )}
          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setImagePage((p) => Math.max(0, p - 1))}
                disabled={imagePage === 0}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">
                Page {imagePage + 1} of {pageCount} · {totalForPaging}{' '}
                images
              </span>
              <button
                type="button"
                onClick={() =>
                  setImagePage((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={imagePage >= pageCount - 1}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
          </div>
          )}
        </section>
        )}

        {activePage === 'datasets' && (
          <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Datasets</h2>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {datasets.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {!removeDatasetMode && !createDatasetOpen && (
                  <div ref={newDatasetMenuRef} className="relative">
                    <button
                      type="button"
                      disabled={creatingDataset}
                      onClick={() => setNewDatasetMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
                    >
                      {!creatingDataset && <PlusIcon className="h-4 w-4" />}
                      {creatingDataset ? 'Creating...' : 'New dataset'}
                      <svg
                        className={`h-4 w-4 transition-transform ${newDatasetMenuOpen ? 'rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {newDatasetMenuOpen && (
                      <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setNewDatasetMenuOpen(false)
                            setCreateDatasetOpen(true)
                            setCreateDatasetName('')
                            setCreateDatasetTemplate('')
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                        >
                          <span className="block font-medium">New dataset</span>
                          <span className="block text-xs text-slate-400">
                            Create an empty dataset
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewDatasetMenuOpen(false)
                            setImportArchiveOpen(true)
                          }}
                          className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                        >
                          <span className="block font-medium">Import</span>
                          <span className="block text-xs text-slate-400">
                            Restore from a stored archive
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!removeDatasetMode && !createDatasetOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveDatasetMode(true)
                      setSelectedDatasetsToRemove(new Set())
                    }}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                  >
                    Remove datasets
                  </button>
                )}
                {removeDatasetMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveDatasets(true)}
                      disabled={selectedDatasetsToRemove.size === 0}
                      className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Delete {selectedDatasetsToRemove.size} dataset{selectedDatasetsToRemove.size === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveDatasetMode(false)
                        setSelectedDatasetsToRemove(new Set())
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          {datasets.length === 0 ? (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
              No datasets yet — assign a batch to create one
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-6 gap-3">
              {datasets.map((d) => (
                <div
                  key={d.name}
                  onClick={() => {
                    if (removeDatasetMode) {
                      setSelectedDatasetsToRemove((prev) => {
                        const next = new Set(prev)
                        if (next.has(d.name)) {
                          next.delete(d.name)
                        } else {
                          next.add(d.name)
                        }
                        return next
                      })
                    } else {
                      openDataset(d.name)
                    }
                  }}
                  className={`group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg shadow-sm transition hover:shadow-md ${
                    activeDataset === d.name && !removeDatasetMode
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
                      : ''
                  } ${
                    selectedDatasetsToRemove.has(d.name)
                      ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                      : ''
                  }`}
                >
                  {d.previews && d.previews.length > 0 ? (
                    <img
                      src={`/api${d.previews[0]}`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
                      No images
                    </div>
                  )}
                  {removeDatasetMode && (
                    <div
                      className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ${
                        selectedDatasetsToRemove.has(d.name)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/50 text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left">
                    <p className="truncate text-xs font-medium text-white">
                      {d.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-200">
                      {d.framework ? `${d.framework}` : 'No framework'}
                      {d.framework && d.model ? ` / ${d.model}` : ''}
                    </p>
                    {d.last_annotated_at && (
                      <p className="truncate text-[10px] text-slate-300">
                        Updated {formatRelativeTime(d.last_annotated_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDataset && (() => {
            const visibleStems = datasetBatchFilter
              ? [datasetBatchFilter]
              : datasetBatches
            const currentDataset = datasets.find((d) => d.name === activeDataset)
            const templatePath =
              currentDataset?.framework && currentDataset?.model
                ? `${currentDataset.framework}/${currentDataset.model}`.toLowerCase()
                : ''
            return (
            <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  {activeDataset}
                </h2>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {datasetTotals.annotated} / {datasetTotals.total} annotated
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportBatchOpen(true)}
                    className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Import batch
                  </button>
                  <div ref={exportMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setExportMenuOpen((v) => !v)}
                      disabled={datasetBatches.length === 0}
                      className="flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                    >
                      Export
                      <svg
                        className={`h-4 w-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {exportMenuOpen && (
                      <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false)
                            setShowExportPanel(true)
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                        >
                          <span className="block font-medium">Export dataset</span>
                          <span className="block text-xs text-slate-400">
                            Train-format archive for the model
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExportMenuOpen(false)
                            setArchivesOpen(true)
                          }}
                          className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                        >
                          <span className="block font-medium">Archives</span>
                          <span className="block text-xs text-slate-400">
                            Restorable snapshots stored on the server
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={fetchPrelabelStats}
                    disabled={!templatePath || prelabelStatsLoading}
                    className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-600 transition hover:bg-amber-100 disabled:opacity-40"
                  >
                    {prelabelStatsLoading ? 'Loading...' : 'Pre-label Stats'}
                  </button>
                  <button
                    type="button"
                    onClick={fetchActivity}
                    disabled={activityLoading}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                  >
                    {activityLoading ? 'Loading...' : 'Leaderboard'}
                  </button>
                  <button
                    type="button"
                    onClick={openDatasetSettings}
                    title="Dataset settings"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDataset('')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                  >
                    ×
                  </button>
                </div>
              </div>

              {datasetBatches.length > 0 && (
                <div className="flex items-center gap-3 border-y border-slate-200/70 bg-slate-50/60 px-6 py-3">
                  <span className="text-sm font-medium text-slate-500">Batch</span>
                  <select
                    value={datasetBatchFilter ?? datasetBatches[0] ?? ''}
                    onChange={(e) => {
                      setDatasetBatchFilter(e.target.value)
                      setSelectedDatasetImages(new Set())
                      setSimilarView(null)
                    }}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 outline-none"
                  >
                    {datasetBatches.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                        {datasetBatchSources[batch]
                          ? ` — ${datasetBatchSources[batch].name} · v${datasetBatchSources[batch].version}`
                          : ''}
                      </option>
                    ))}
                  </select>
                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {(datasetBatchStats[datasetBatchFilter]?.annotated ??
                      0)}{' '}
                    / {datasetBatchStats[datasetBatchFilter]?.total ?? 0}{' '}
                    annotated
                  </span>
                  {(() => {
                    const info = batchHandlers[datasetBatchFilter]
                    const hs = info?.handlers ?? []
                    if (!hs.length) return null
                    const pct = info.coverage != null ? Math.round(info.coverage * 100) : null
                    const hasOthers = hs.some((h) => h.user !== currentUser)
                    return (
                      <div ref={handlersMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setHandlersMenuOpen((v) => !v)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                            hasOthers
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {pct ?? '—'}% ▾
                        </button>
                        {handlersMenuOpen && (
                          <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                            <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Contributors
                            </div>
                            {hs.map((h) => (
                              <div
                                key={h.user}
                                className="flex items-center justify-between px-3 py-1.5 text-sm"
                              >
                                <span className="text-slate-700">
                                  {h.user}
                                  {h.user === currentUser ? ' (you)' : ''}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {h.coverage != null ? `${Math.round(h.coverage * 100)}%` : '—'}
                                  {h.last_activity ? ` · ${formatRelativeTime(h.last_activity)}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <button
                    type="button"
                    onClick={() => setDatasetGridPortrait((v) => !v)}
                    title={datasetGridPortrait ? 'Switch to landscape grid' : 'Switch to portrait grid'}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
                  >
                    {datasetGridPortrait ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <rect x="3" y="7" width="18" height="10" rx="1.5" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <rect x="7" y="3" width="10" height="18" rx="1.5" />
                      </svg>
                    )}
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <div ref={prelabelMenuRef} className="relative">
                      <div className="flex overflow-hidden rounded-full border border-indigo-300 bg-indigo-50">
                        <button
                          type="button"
                          onClick={() => doPrelabel(true)}
                          disabled={!templatePath || preLabeling}
                          title="Runs the model and overwrites both the corrected value and the pre-label prediction"
                          className="px-4 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
                        >
                          {preLabeling ? 'Pre-labeling...' : 'Pre-label'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrelabelMenuOpen((v) => !v)}
                          disabled={!templatePath || preLabeling}
                          className="border-l border-indigo-300 px-2 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${prelabelMenuOpen ? 'rotate-180' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>
                      {prelabelMenuOpen && (
                        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setPrelabelMenuOpen(false)
                              doPrelabel(true)
                            }}
                            disabled={!templatePath || preLabeling}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-40"
                          >
                            <span className="block font-medium">Pre-label</span>
                            <span className="block text-xs text-slate-400">
                              Overwrites value and pre-label
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPrelabelMenuOpen(false)
                              doPrelabel(false)
                            }}
                            disabled={!templatePath || preLabeling}
                            className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-sky-50 disabled:opacity-40"
                          >
                            <span className="block font-medium">Pre-label Only</span>
                            <span className="block text-xs text-slate-400">
                              Only updates the pre-label, keeps your value
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div ref={attrMenuRef} className="relative">
                      <div className="flex overflow-hidden rounded-full border border-emerald-300 bg-emerald-50">
                        <button
                          type="button"
                          onClick={() => requireUser(() => openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter))}
                          disabled={!templatePath || preLabeling}
                          className="px-4 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40"
                        >
                          Correct Attribute
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttrMenuOpen((v) => !v)}
                          disabled={!templatePath || preLabeling}
                          className="border-l border-emerald-300 px-2 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40"
                        >
                          <svg
                            className={`h-4 w-4 transition-transform ${attrMenuOpen ? 'rotate-180' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>
                      </div>
                      {attrMenuOpen && (
                        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setAttrMenuOpen(false)
                              requireUser(() => openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter))
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                          >
                            <span className="block font-medium">From start</span>
                            <span className="block text-xs text-slate-400">
                              Begin at the first image
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttrMenuOpen(false)
                              requireUser(async (name) => {
                                let target = name === currentUser ? myLastEdit : null
                                if (!target) {
                                  const batch = datasetBatchFilter?.replace(/^raw-images_/, '')
                                  try {
                                    const params = new URLSearchParams({ user: name })
                                    if (batch) params.set('batch', batch)
                                    const res = await fetch(
                                      `/api/datasets/${encodeURIComponent(activeDataset)}/last-edit?${params}`,
                                    )
                                    const data = await res.json()
                                    target = res.ok && data.image ? data : null
                                    setMyLastEdit(target)
                                  } catch {
                                    target = null
                                  }
                                }
                                openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter, target?.image, target?.attr_index)
                              })
                            }}
                            disabled={currentUser ? !myLastEdit?.image : false}
                            className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 disabled:opacity-40"
                          >
                            <span className="block font-medium">From last edited</span>
                            <span className="block text-xs text-slate-400">
                              {myLastEdit?.image
                                ? `Resume at your last edited image${
                                    datasetAttributes?.[myLastEdit.attr_index]
                                      ? ` (${datasetAttributes[myLastEdit.attr_index].alias ?? datasetAttributes[myLastEdit.attr_index].name})`
                                      : ''
                                  }`
                                : "You haven't edited this batch yet"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (datasetRemoveMode) {
                          setSelectedDatasetImages(new Set())
                        }
                        setDatasetRemoveMode((v) => !v)
                      }}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                        datasetRemoveMode
                          ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {datasetRemoveMode ? 'Cancel' : 'Remove images'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        similarView ? setSimilarView(null) : fetchSimilar()
                      }
                      disabled={similarLoading || !datasetBatchFilter}
                      title="Group near-duplicate images together for review"
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
                        similarView
                          ? 'border-violet-300 bg-violet-50 text-violet-600 hover:bg-violet-100'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {similarLoading
                        ? 'Analyzing...'
                        : similarView
                          ? 'Exit similar'
                          : 'Group similar'}
                    </button>
                    {datasetBatchFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setDatasetBatchToRemove(datasetBatchFilter)
                          setConfirmingRemoveDatasetBatch(true)
                        }}
                        className="rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20"
                      >
                        Remove current batch
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="px-6 py-5">
              {similarView ? (
                <DatasetSimilarView
                  clusters={similarView.clusters}
                  singles={similarView.singles}
                  annotations={datasetAnnotations}
                  annotationTimes={datasetAnnotationTimes}
                  reviewed={datasetReviewed}
                  selected={selectedDatasetImages}
                  onToggleSelect={toggleDatasetImageSelect}
                  onOpenImage={(src) =>
                    setDatasetModalIndex(datasetActiveImages.indexOf(src))
                  }
                  onKeepRest={selectClusterRest}
                  onKeepRestAll={selectAllClusterRest}
                  threshold={similarThreshold}
                  onThresholdChange={(t) => {
                    setSimilarThreshold(t)
                    fetchSimilar(t)
                  }}
                  portrait={datasetGridPortrait}
                  lastEdited={lastEditedImage}
                />
              ) : visibleStems.length === 0 ? (
                <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                  No images in this dataset
                </div>
              ) : (
                visibleStems.map((stem) => (
                  <DatasetBatchSection
                    key={`${stem}-${datasetRefreshKey}`}
                    dataset={activeDataset}
                    stem={stem}
                    source={datasetBatchSources[stem]}
                    stats={datasetBatchStats[stem]}
                    images={datasetImageGroups[stem] ?? []}
                    annotations={datasetAnnotations}
                    annotationTimes={datasetAnnotationTimes}
                    reviewed={datasetReviewed}
                    refreshKey={datasetRefreshKey}
                    onImagesLoaded={handleDatasetImagesLoaded}
                    onOpenImage={(src) =>
                      setDatasetModalIndex(datasetActiveImages.indexOf(src))
                    }
                    removeMode={datasetRemoveMode}
                    selected={selectedDatasetImages}
                    onToggleSelect={toggleDatasetImageSelect}
                    portrait={datasetGridPortrait}
                    lastEdited={lastEditedImage}
                  />
                ))
              )}
              </div>
            </section>
            )
          })()}
        </section>
        )}

        {activePage === 'archives' && (
          <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Archives</h2>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {archives.length}
              </span>
            </div>
            {archives.length === 0 ? (
              <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                No archives stored. Create one from a dataset's Export ▾ menu.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {archives.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-700">
                        {a.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {a.dataset ?? 'unknown dataset'} ·{' '}
                        {(a.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                        {a.counts?.images ?? 0} images,{' '}
                        {a.counts?.annotated ?? 0} annotated
                        {a.created_at &&
                          ` · ${formatRelativeTime(a.created_at)}`}
                        {!a.exists && ' · file missing'}
                      </div>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <a
                        href={`/api/archives/${a.id}/download`}
                        className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => doRestoreArchive(a.id)}
                        disabled={!a.exists || restoringArchiveId !== null}
                        className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                      >
                        {restoringArchiveId === a.id
                          ? 'Restoring...'
                          : 'Restore'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteArchive(a)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <ImageModal
        images={activeImages}
        index={removeMode ? null : modalIndex}
        onClose={() => setModalIndex(null)}
        onNavigate={navigateModal}
        onSelect={setModalIndex}
      />

      <ImageModal
        images={videoImages}
        index={videoModalIndex}
        onClose={() => setVideoModalIndex(null)}
        onNavigate={navigateVideoModal}
        onSelect={setVideoModalIndex}
      />

      <ImageModal
        images={datasetActiveImages}
        index={datasetModalIndex}
        onClose={() => setDatasetModalIndex(null)}
        onNavigate={navigateDatasetModal}
        onSelect={setDatasetModalIndex}
        attributes={datasetAttributes}
        annotations={datasetAnnotations}
        reviewed={datasetReviewed}
      />

      {attrAnnotate && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-4">
          <div className="relative flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-200/80 px-3 py-1.5 text-sm font-medium text-slate-800">
                  {attrAnnotate.dataset}
                  {attrAnnotate.batchFilter && (
                    <>
                      {' · '}
                      {attrAnnotate.batchFilter.replace(/_/g, '/')}
                    </>
                  )}
                  {' · '}{attrAnnotate.imgIndex + 1} / {attrAnnotate.images.length}
                </span>
                <select
                  value={attrAnnotate.attrIndex}
                  onChange={(e) =>
                    setAttrAnnotate((s) => ({
                      ...s,
                      attrIndex: parseInt(e.target.value, 10),
                      imgIndex: 0,
                      done: false,
                      doneReviewed: null,
                    }))
                  }
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none"
                >
                  {attrAnnotate.attributes.map((attr, i) => (
                    <option key={attr.name} value={i}>
                      {attr.alias ?? attr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {!attrAnnotate.done && (
                <button
                  type="button"
                  title="Remove from dataset"
                  onClick={() => setConfirmingRemoveAttrImage(true)}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-red-500/80 px-3 text-sm font-medium text-white transition hover:bg-red-500"
                >
                  Remove
                </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAttrAnnotate(null)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
                >
                  ×
                </button>
              </div>
            </div>

            {attrAnnotate.done ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    You're done with{' '}
                    {attrAnnotate.attributes[attrAnnotate.attrIndex]?.alias ??
                      attrAnnotate.attributes[attrAnnotate.attrIndex]?.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {attrAnnotate.batchFilter
                      ? attrAnnotate.batchFilter.replace(/^raw-images_/, '').replace(/_/g, '/')
                      : attrAnnotate.dataset}
                    {attrAnnotate.doneReviewed != null && (
                      <>
                        {' — '}
                        {attrAnnotate.doneReviewed} / {attrAnnotate.images.length}{' '}
                        images reviewed by you
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {attrAnnotate.attributes.map((attr, i) =>
                    i === attrAnnotate.attrIndex ? null : (
                      <button
                        key={attr.name}
                        type="button"
                        onClick={() =>
                          setAttrAnnotate((s) => ({
                            ...s,
                            attrIndex: i,
                            imgIndex: 0,
                            done: false,
                            doneReviewed: null,
                          }))
                        }
                        className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        {attr.alias ?? attr.name}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAttrAnnotate(null)}
                  className="mt-2 rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600"
                >
                  Close
                </button>
              </div>
            ) : (
            <>
            {attrAnnotate.images.length > 0 && (
              <div
                ref={attrStripRef}
                className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-slate-100/80 p-2"
              >
                {attrAnnotate.images.map((src, i) => {
                  const isAnnotated = attrAnnotate.annotations[src] !== undefined
                  return (
                    <button
                      key={src}
                      type="button"
                      data-active={i === attrAnnotate.imgIndex}
                      onClick={() =>
                        setAttrAnnotate((s) => ({ ...s, imgIndex: i }))
                      }
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === attrAnnotate.imgIndex
                          ? 'border-indigo-500'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      } ${isAnnotated ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <img
                        src={`/api${src}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {isAnnotated && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-1 overflow-hidden">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-100/80 p-2">
                {attrAnnotate.images[attrAnnotate.imgIndex] ? (
                  <img
                    src={`/api${attrAnnotate.images[attrAnnotate.imgIndex]}`}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="text-slate-500">No image</p>
                )}
              </div>

              <div className="flex w-80 flex-col border-l border-slate-200 bg-slate-100/90 p-4">
                {(() => {
                  const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
                  const image = attrAnnotate.images[attrAnnotate.imgIndex]
                  const values = attrValuesFor(image)
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {group.alias ?? group.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Press a number, then use ← → to move.
                      </p>
                      {(() => {
                        const merged = mergeReviewerMaps(
                          datasetReviewed[image]?.[String(attrAnnotate.attrIndex)],
                          datasetReviewed[image]?.all,
                        )
                        const reviewers = sortedReviewers(merged)
                        if (reviewers.length === 0) return null
                        return (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5 shrink-0"
                          >
                            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                            <path
                              fillRule="evenodd"
                              d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            Reviewed by{' '}
                            {reviewers
                              .map(([user, at]) => `${user} · ${formatRelativeTime(at)}`)
                              .join(', ')}
                          </span>
                        </p>
                        )
                      })()}
                      <div className="mt-4 flex flex-col gap-2">
                        {group.options.map((option, i) => {
                          const selected = values[group.indices[i]] === 1
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                applyAttrValue(i, group.type === 'single' ? true : !selected)
                              }}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-700'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                selected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {i + 1}
                              </span>
                              {group.option_aliases?.[i] ?? option}
                            </button>
                          )
                        })}
                        {group.type === 'single' && (
                          <button
                            type="button"
                            onClick={() => {
                              applyAttrValue(-1, false)
                            }}
                            className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              0
                            </span>
                            None
                          </button>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100/80 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  attrPrevImage()
                }}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-sm text-slate-800 transition hover:bg-slate-300"
              >
                ← Prev
              </button>
              {attrAnnotate.imgIndex >= attrAnnotate.images.length - 1 ? (
                <button
                  type="button"
                  onClick={finishAttrReview}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  ✓ Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    attrNextImage()
                  }}
                  className="rounded-full bg-slate-200 px-4 py-1.5 text-sm text-slate-800 transition hover:bg-slate-300"
                >
                  Next →
                </button>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {annotate && (
        <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-black/50 px-4 py-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                {annotate.dataset}{annotate.batchFilter ? ` (${annotate.batchFilter})` : ''} · {annotate.index + 1} / {annotate.images.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnnotate(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>

            {annotate.images.length > 0 && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-black/40 p-2">
                {annotate.images.map((src, i) => {
                  const isAnnotated = annotate.annotations[src] !== undefined
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => jumpAnnotate(i)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === annotate.index
                          ? 'border-indigo-500'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      } ${isAnnotated ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <img
                        src={`/api${src}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {isAnnotated && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
              {annotate.images.length === 0 ? (
                <p className="text-sm text-slate-400">No images to annotate</p>
              ) : (
                <img
                  src={`/api${annotate.images[annotate.index]}`}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => navigateAnnotate(-1)}
                disabled={annotate.index === 0}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => navigateAnnotate(1)}
                disabled={annotate.index >= annotate.images.length - 1}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>

          <div className="w-[28rem] shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                {annotate.wizardMode ? 'Wizard' : 'Attributes'} ({annotate.template})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setAnnotate((s) => ({ ...s, wizardMode: !s.wizardMode }))
                }
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                {annotate.wizardMode ? 'Freeform' : 'Wizard'}
              </button>
            </div>

            {annotate.wizardMode ? (
              <div className="mt-4">
                {(() => {
                  const group = annotate.attributes[annotate.step]
                  const values = annotateValuesFor(
                    annotate.images[annotate.index],
                  )
                  const isLast =
                    annotate.step === annotate.attributes.length - 1
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {annotate.step + 1} / {annotate.attributes.length}
                        </span>
                        <span className="uppercase tracking-wide">
                          {group.alias ?? group.name}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{
                            width: `${((annotate.step + 1) / annotate.attributes.length) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {group.options.map((option, i) => {
                          const selected =
                            values[group.indices[i]] === 1
                          const highlighted = i === annotate.optionIndex
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setAnnotate((s) => ({
                                  ...s,
                                  optionIndex: i,
                                }))
                                setAnnotateValue(group, i, true)
                              }}
                              className={`rounded-lg border px-3 py-2 text-left text-sm text-white transition ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-600'
                                  : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                              } ${
                                highlighted
                                  ? 'ring-2 ring-indigo-400'
                                  : ''
                              }`}
                            >
                              {group.option_aliases?.[i] ?? option}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={wizardPrev}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white transition hover:bg-slate-700"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          onClick={wizardNext}
                          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-600"
                        >
                          {isLast ? 'Save & next image' : 'Next →'}
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        ↑↓ move · Space toggle · → next · ← prev
                      </p>
                    </>
                  )
                })()}
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-4">
                  {annotate.attributes.map((group) => {
                    const values = annotateValuesFor(
                      annotate.images[annotate.index],
                    )
                    return (
                      <div key={group.name}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {group.alias ?? group.name}
                        </h4>
                        <div className="mt-1.5 space-y-1">
                          {group.options.map((option, i) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 text-sm text-white"
                            >
                              <input
                                type={
                                  group.type === 'single'
                                    ? 'radio'
                                    : 'checkbox'
                                }
                                name={
                                  group.type === 'single'
                                    ? group.name
                                    : undefined
                                }
                                checked={values[group.indices[i]] === 1}
                                onChange={(e) =>
                                  setAnnotateValue(group, i, e.target.checked)
                                }
                                className="accent-indigo-500"
                              />
                              {group.option_aliases?.[i] ?? option}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={saveAnnotation}
                  className="mt-4 w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-600"
                >
                  Save annotation
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {removeMode && removeIndex === null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
          <div className="relative z-30 flex items-center gap-4 border-b border-white/10 bg-black/50 px-6 py-3 backdrop-blur-md">
            <h2 className="text-base font-semibold text-white">
              Remove Mode — pick a starting image
            </h2>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setRemoveMode(false)}
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-6 gap-2">
              {activeImages.map((image, i) => (
                <img
                  key={image.id ?? image}
                  src={`/api${image.path ?? image}`}
                  alt=""
                  onClick={() => setRemoveIndex(i)}
                  className="aspect-video w-full cursor-pointer rounded object-cover opacity-60 shadow transition hover:opacity-100 hover:ring-2 hover:ring-indigo-400"
                />
              ))}
              {activeImages.length === 0 && (
                <p className="col-span-6 text-sm text-slate-400">
                  No images yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {removeMode && removeIndex !== null && (
        <RemoveModeModal
          images={activeImages}
          index={removeIndex}
          marked={markedForRemoval}
          onToggleMark={toggleMarked}
          onNavigate={(delta) =>
            setRemoveIndex(
              (i) =>
                (i + delta + activeImages.length) % activeImages.length,
            )
          }
          onSelect={setRemoveIndex}
          onClose={() => {
            setRemoveMode(false)
            setMarkedForRemoval(new Set())
          }}
          onDone={() => {
            if (markedForRemoval.size === 0) {
              setRemoveMode(false)
              return
            }
            setConfirmingDelete(true)
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmModal
          count={markedForRemoval.size}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            try {
              await fetch('/api/images/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...markedForRemoval] }),
              })
              if (selectedBatchId) {
                fetchRawImages(selectedBatchId)
              }
            } catch {
              setStatus('Failed: could not reach the server')
            }
            setConfirmingDelete(false)
            setRemoveMode(false)
            setMarkedForRemoval(new Set())
          }}
        />
      )}

      {confirmingRemoveImage && (
        <ConfirmModal
          count={1}
          onCancel={() => setConfirmingRemoveImage(false)}
          onConfirm={removeCurrentImage}
        />
      )}

      {confirmingRemoveAttrImage && (
        <ConfirmModal
          count={1}
          title="Remove from this dataset ?"
          message="This removes the image from the dataset list only. The original file will not be deleted."
          onCancel={() => setConfirmingRemoveAttrImage(false)}
          onConfirm={removeFromDatasetImage}
        />
      )}

      {(datasetRemoveMode || similarView) && selectedDatasetImages.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-xl backdrop-blur">
          <span className="text-sm font-medium text-slate-700">
            {selectedDatasetImages.size} selected
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedDatasetImages(new Set(datasetActiveImages))
            }
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedDatasetImages(new Set())}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemoveDatasetImages(true)}
            className="rounded-full bg-red-500 px-4 py-1 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      )}

      {confirmingRemoveDatasetImages && (
        <ConfirmModal
          count={selectedDatasetImages.size}
          title={`Remove ${selectedDatasetImages.size} image${selectedDatasetImages.size === 1 ? '' : 's'} from ${activeDataset}?`}
          message="This removes the images from the dataset list only. The original files will not be deleted."
          onCancel={() => setConfirmingRemoveDatasetImages(false)}
          onConfirm={removeSelectedDatasetImages}
        />
      )}

      {confirmingRemoveDatasetBatch && (
        <ConfirmModal
          count={
            datasetBatchStats[datasetBatchToRemove]?.total ??
            (datasetImageGroups[datasetBatchToRemove] ?? []).length
          }
          title={`Remove ${datasetBatchToRemove}?`}
          message="This removes all images in this batch from the dataset. The original files will not be deleted."
          onCancel={() => setConfirmingRemoveDatasetBatch(false)}
          onConfirm={removeDatasetBatch}
        />
      )}

      {confirmingRemoveActiveDataset && (
        <ConfirmModal
          count={datasetTotals.total}
          title={`Remove ${activeDataset}?`}
          message="This will remove the dataset and its annotations. Batches and images will remain in Raw Image. This action cannot be undone."
          onCancel={() => setConfirmingRemoveActiveDataset(false)}
          onConfirm={doRemoveActiveDataset}
        />
      )}

      {confirmingRemoveRaws && (
        <ConfirmModal
          count={selectedRawsToRemove.size}
          title={`Delete ${selectedRawsToRemove.size} raw image batch${selectedRawsToRemove.size === 1 ? '' : 'es'}?`}
          message="This will permanently remove the selected raw image batches and all their images. This action cannot be undone."
          onCancel={() => setConfirmingRemoveRaws(false)}
          onConfirm={doDeleteSelectedRaws}
        />
      )}

      {confirmingRemoveDatasets && (
        <ConfirmModal
          count={selectedDatasetsToRemove.size}
          title={`Delete ${selectedDatasetsToRemove.size} dataset${selectedDatasetsToRemove.size === 1 ? '' : 's'}?`}
          message="This will remove the selected datasets and their annotations. Batches and images will remain in Raw Image. This action cannot be undone."
          onCancel={() => setConfirmingRemoveDatasets(false)}
          onConfirm={doRemoveDatasets}
        />
      )}

      {batchWarn && (
        <BatchWarnModal
          warn={batchWarn}
          currentUser={currentUser}
          onClose={() => setBatchWarn(null)}
        />
      )}

      {prelabelConfirmOpen && (
        <ConfirmModal
          count={prelabelConfirmCount}
          title="Pre-label will overwrite annotations"
          message={
            datasetBatchFilter
              ? `This batch already has ${prelabelConfirmCount} annotated image${prelabelConfirmCount === 1 ? '' : 's'}. Running pre-label will overwrite only this batch. Are you sure?`
              : `This dataset already has ${prelabelConfirmCount} annotated image${prelabelConfirmCount === 1 ? '' : 's'}. Running pre-label will overwrite them. Are you sure?`
          }
          onCancel={() => setPrelabelConfirmOpen(false)}
          onConfirm={() => runPrelabel(true)}
          confirmLabel="Overwrite"
        />
      )}

      {prelabelStatsOpen && prelabelStats && (
        <PrelabelStatsModal
          stats={prelabelStats}
          onClose={() => setPrelabelStatsOpen(false)}
        />
      )}

      {activityOpen && (
        <LeaderboardModal
          dataset={activeDataset}
          leaderboard={leaderboard}
          activity={activity}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {userPickerOpen && (
        <UserPickerModal
          users={users}
          onConfirm={confirmUser}
          onClose={closeUserPicker}
        />
      )}

      {showExportPanel && (
        <ExportDatasetModal
          dataset={activeDataset}
          batches={datasetBatches}
          split={datasetSplit}
          onSplitChange={setDatasetSplit}
          format={exportFormat}
          onFormatChange={setExportFormat}
          groupSplit={exportGroupSplit}
          onGroupSplitChange={setExportGroupSplit}
          selectedBatches={selectedExportBatches}
          onSelectedBatchesChange={setSelectedExportBatches}
          result={exportResult}
          exporting={exporting}
          onExport={doExportDataset}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {createDatasetOpen && (
        <CreateDatasetModal
          templates={templates}
          creating={creatingDataset}
          onCreate={doCreateDataset}
          onClose={() => setCreateDatasetOpen(false)}
        />
      )}

      {importBatchOpen && (
        <ImportBatchModal
          dataset={activeDataset}
          importedBatches={datasetBatches}
          importing={importingBatch}
          onImport={doImportBatch}
          onError={() => setStatus('Failed: could not reach the server')}
          onClose={() => setImportBatchOpen(false)}
        />
      )}

      {datasetSettingsOpen && (
        <DatasetSettingsModal
          dataset={datasets.find((d) => d.name === activeDataset)}
          templates={templates}
          batches={datasetBatches}
          batchStats={datasetBatchStats}
          saving={savingDatasetSettings}
          onSave={doSaveDatasetSettings}
          onRemoveBatch={(batch) => {
            setDatasetBatchToRemove(batch)
            setConfirmingRemoveDatasetBatch(true)
          }}
          onRemoveDataset={() => setConfirmingRemoveActiveDataset(true)}
          onClose={() => setDatasetSettingsOpen(false)}
        />
      )}

      {uploadSourceOpen && (
        <UploadSourceModal
          sources={sources}
          selectedId={uploadSourceId}
          onSelect={setUploadSourceId}
          onCreateSource={createSource}
          onContinue={() => {
            setUploadSourceOpen(false)
            tarInputRef.current?.click()
          }}
          onClose={() => setUploadSourceOpen(false)}
        />
      )}

      {sourceModalOpen && (
        <SourceModal
          sources={sources}
          onCreateSource={createSource}
          onDeleteSource={deleteSource}
          onClose={() => setSourceModalOpen(false)}
        />
      )}

      {archivesOpen && (
        <ArchivesModal
          dataset={activeDataset}
          archives={archives}
          format={archiveFormat}
          onFormatChange={setArchiveFormat}
          archiving={archiving}
          onCreateArchive={doArchiveDataset}
          onDeleteArchive={setConfirmingDeleteArchive}
          onClose={() => setArchivesOpen(false)}
        />
      )}

      {importArchiveOpen && (
        <ImportArchiveModal
          archives={archives}
          uploading={uploadingArchive}
          restoringId={restoringArchiveId}
          onUploadFile={handleImportArchiveFile}
          onRestore={doRestoreArchive}
          onClose={() => setImportArchiveOpen(false)}
        />
      )}

      {confirmingDeleteArchive && (
        <ConfirmModal
          count={1}
          title={`Delete ${confirmingDeleteArchive.name}?`}
          message="This permanently deletes the archive file from the server. This action cannot be undone."
          onCancel={() => setConfirmingDeleteArchive(null)}
          onConfirm={() => doDeleteArchive(confirmingDeleteArchive.id)}
        />
      )}

      {assignToDatasetOpen && (
        <AssignToDatasetModal
          dataset={activeDataset}
          batches={batches}
          onAssign={doAssignBatchToDataset}
          onClose={() => setAssignToDatasetOpen(false)}
        />
      )}

    </div>
  )
}

export default App
