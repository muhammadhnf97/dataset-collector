import { useState } from 'react'
import DatasetImageThumb from './DatasetImageThumb'
import { GRID_COLS, MASONRY_COLS, formatRelativeTime } from '../utils'

export default function DatasetSimilarView({
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
  mode,
  cols,
  attributes,
  lastEdited,
}) {
  const [expanded, setExpanded] = useState(new Set())
  const isNatural = mode === 'natural'
  // cluster covers need a fixed box for the stacked-deck effect
  const aspectCls = mode === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'
  const gridCls = isNatural
    ? `${MASONRY_COLS[cols]} gap-3`
    : `grid gap-3 ${GRID_COLS[cols]}`

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
      attributes={attributes}
      annotatedAgo={formatRelativeTime(annotationTimes[src])}
      reviewedBy={reviewed?.[src]}
      isLastEdited={src === lastEdited}
      selectable
      isSelected={selected?.has(src)}
      mode={mode}
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
                className={`rounded-xl border border-violet-200 bg-violet-50/40 p-3 ${
                  isNatural ? 'mb-3 [column-span:all]' : 'col-span-full'
                }`}
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
            <div
              key={cover}
              className={`relative ${isNatural ? 'mb-3 break-inside-avoid' : ''}`}
            >
              {cluster.length > 1 && (
                <>
                  <img
                    src={`/api${cluster[1]}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full rotate-2 rounded object-cover shadow ${aspectCls}`}
                  />
                  <img
                    src={`/api${cluster[2] ?? cluster[1]}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full -rotate-2 rounded object-cover shadow ${aspectCls}`}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => toggleExpand(cover)}
                className="group relative block w-full overflow-hidden rounded shadow transition hover:shadow-lg"
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
