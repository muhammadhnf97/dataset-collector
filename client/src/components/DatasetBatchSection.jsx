import { useEffect, useState } from 'react'
import DatasetImageThumb from './DatasetImageThumb'
import SkeletonGrid from './SkeletonGrid'
import {
  DATASET_PAGE_LIMIT,
  GRID_COLS,
  MASONRY_COLS,
  formatRelativeTime,
} from '../utils'

export default function DatasetBatchSection({
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
  mode,
  cols,
  attributes,
  lastEdited,
}) {
  const [loading, setLoading] = useState(true)
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
        <SkeletonGrid
          count={cols * 2}
          cols={GRID_COLS[cols]}
          aspect={mode === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}
        />
      ) : (
        <div
          className={
            mode === 'natural'
              ? `${MASONRY_COLS[cols]} gap-3`
              : `grid gap-3 ${GRID_COLS[cols]}`
          }
        >
          {images.map((src) => (
            <DatasetImageThumb
              key={src}
              src={src}
              attributes={attributes}
              annotatedAgo={formatRelativeTime(annotationTimes[src])}
              reviewedBy={reviewed?.[src]}
              isLastEdited={src === lastEdited}
              selectable={removeMode}
              isSelected={selected?.has(src)}
              mode={mode}
              onOpen={onOpenImage}
              onToggle={onToggleSelect}
            />
          ))}
          {loading &&
            Array.from({
              length: Math.min(DATASET_PAGE_LIMIT, total - loadedCount),
            }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className={`animate-pulse rounded bg-slate-200 ${
                  mode === 'natural'
                    ? 'mb-3 aspect-video break-inside-avoid'
                    : mode === 'portrait'
                      ? 'aspect-[9/16]'
                      : 'aspect-video'
                }`}
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
