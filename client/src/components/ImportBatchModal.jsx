import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import {
  GRID_COLS,
  GRID_COL_OPTIONS,
  MASONRY_COLS,
  useLocalStorage,
} from '../utils'

const PREVIEW_LIMIT = 60

export default function ImportBatchModal({
  dataset,
  importedBatches,
  importing,
  onImport,
  onError,
  onClose,
}) {
  const [batches, setBatches] = useState([])
  const [sourceFilter, setSourceFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [previewBatch, setPreviewBatch] = useState(null)
  const [previewImages, setPreviewImages] = useState([])
  const [previewTotal, setPreviewTotal] = useState(0)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewMode, setPreviewMode] = useLocalStorage(
    'import-preview-grid-mode',
    'landscape',
  )
  const [previewCols, setPreviewCols] = useLocalStorage(
    'import-preview-grid-cols',
    { landscape: 4, portrait: 6, natural: 4 },
  )
  const previewReq = useRef(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/batches/covers')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setBatches(data.batches ?? [])
      })
      .catch(() => onError?.())
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!previewBatch?.id) return undefined
    const req = ++previewReq.current
    setPreviewLoading(true)
    setPreviewImages([])
    fetch(
      `/api/images?id=${encodeURIComponent(previewBatch.id)}&page=0&limit=${PREVIEW_LIMIT}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (previewReq.current !== req) return
        setPreviewImages(data.images ?? [])
        setPreviewTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => {
        if (previewReq.current === req) setPreviewLoading(false)
      })
    return undefined
  }, [previewBatch])

  const sources = useMemo(() => {
    const map = {}
    for (const b of batches) {
      const s = b.source
      const key = s ? `s-${s.id}` : 'none'
      if (!map[key]) {
        map[key] = {
          key,
          id: s?.id ?? null,
          label: s ? `${s.name} · v${s.version}` : 'Untagged',
          count: 0,
        }
      }
      map[key].count++
    }
    return Object.values(map).sort((a, b) => {
      if (a.key === 'none') return 1
      if (b.key === 'none') return -1
      return a.label.localeCompare(b.label)
    })
  }, [batches])

  const filteredBatches = useMemo(() => {
    if (!sourceFilter) return batches
    return batches.filter((b) =>
      sourceFilter === 'none'
        ? !b.source
        : b.source?.id === Number(sourceFilter),
    )
  }, [batches, sourceFilter])

  const isNatural = previewMode === 'natural'
  const previewColCount = previewCols[previewMode] ?? 4

  const batchCard = (batch) => {
    const isSelected = batch.id && selected.has(batch.id)
    const isPreviewing = previewBatch?.id === batch.id
    const imported = importedBatches.includes(batch.name.replace(/\//g, '_'))
    return (
      <button
        key={batch.id ?? batch.name}
        type="button"
        title={batch.name}
        disabled={!batch.id}
        onClick={() => {
          if (batch.id) setPreviewBatch(batch)
          setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(batch.id)) {
              next.delete(batch.id)
            } else {
              next.add(batch.id)
            }
            return next
          })
        }}
        className={`group relative aspect-video w-full overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md ${
          isPreviewing
            ? 'border-indigo-500 ring-2 ring-indigo-500'
            : isSelected
              ? 'border-indigo-400 ring-1 ring-indigo-300'
              : 'border-slate-200'
        }`}
      >
        {batch.cover ? (
          <img
            src={`/api${batch.cover}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            No image
          </div>
        )}
        <div className="absolute left-0 right-0 top-0 bg-black/70 px-2 py-1 text-left opacity-0 transition group-hover:opacity-100">
          <p className="text-[10px] font-medium text-white">{batch.name}</p>
        </div>
        {isSelected && (
          <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-[11px] font-bold text-white shadow">
            ✓
          </div>
        )}
        {imported && (
          <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-sm font-bold text-white shadow">
            ✓
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1">
          <p className="truncate text-[10px] font-medium text-white">
            {batch.name}
          </p>
          <span className="shrink-0 text-[10px] text-white/70">
            {batch.count ?? 0}
          </span>
        </div>
      </button>
    )
  }

  return (
    <Modal
      onClose={onClose}
      maxWidth={previewBatch ? 'max-w-5xl' : 'max-w-2xl'}
      bodyClassName="flex max-h-[85vh] flex-col p-6"
    >
      <h3 className="text-lg font-semibold text-slate-800">Import Batch</h3>
      <p className="mt-1 text-sm text-slate-500">
        Pick a source, then batches to import into {dataset}.
      </p>
      {sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSourceFilter('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              sourceFilter === ''
                ? 'bg-indigo-500 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All · {batches.length}
          </button>
          {sources.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                setSourceFilter(s.id === null ? 'none' : String(s.id))
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sourceFilter === (s.id === null ? 'none' : String(s.id))
                  ? 'bg-indigo-500 text-white shadow'
                  : s.key === 'none'
                    ? 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              {s.label} · {s.count}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        <div
          className={`${previewBatch ? 'w-2/5' : 'w-full'} min-h-0 overflow-y-auto`}
        >
          {filteredBatches.length === 0 ? (
            <p className="text-sm text-slate-500">
              {batches.length === 0
                ? 'No batches available.'
                : 'No batches for this source.'}
            </p>
          ) : (
            <div
              className={`grid gap-3 p-1 ${
                previewBatch ? 'grid-cols-2' : 'grid-cols-4'
              }`}
            >
              {filteredBatches.map(batchCard)}
            </div>
          )}
        </div>
        {previewBatch && (
          <div className="flex w-3/5 min-w-0 flex-col">
            <div className="mb-2 flex items-center gap-2">
              <p
                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700"
                title={previewBatch.name}
              >
                {previewBatch.name}
                <span className="ml-1.5 text-xs font-normal text-slate-400">
                  {previewTotal} images
                  {previewTotal > previewImages.length
                    ? ` · showing ${previewImages.length}`
                    : ''}
                </span>
              </p>
              <button
                type="button"
                onClick={() =>
                  setPreviewMode((m) =>
                    m === 'landscape'
                      ? 'portrait'
                      : m === 'portrait'
                        ? 'natural'
                        : 'landscape',
                  )
                }
                title={`Grid: ${previewMode} — click to switch`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
              >
                {previewMode === 'landscape' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="3" y="7" width="18" height="10" rx="1.5" />
                  </svg>
                ) : previewMode === 'portrait' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="7" y="3" width="10" height="18" rx="1.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="3" y="4" width="8" height="9" rx="1" />
                    <rect x="13" y="4" width="8" height="5" rx="1" />
                    <rect x="3" y="15" width="8" height="5" rx="1" />
                    <rect x="13" y="11" width="8" height="9" rx="1" />
                  </svg>
                )}
              </button>
              <select
                value={previewColCount}
                onChange={(e) =>
                  setPreviewCols((prev) => ({
                    ...prev,
                    [previewMode]: Number(e.target.value),
                  }))
                }
                title="Columns"
                className="h-6 shrink-0 rounded-full border border-slate-300 bg-white px-1.5 text-[11px] font-medium text-slate-600 outline-none transition hover:bg-slate-100"
              >
                {GRID_COL_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} col
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                title="Close preview"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {previewLoading ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Loading preview...
                </p>
              ) : previewImages.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No images in this batch.
                </p>
              ) : (
                <div
                  className={
                    isNatural
                      ? `${MASONRY_COLS[previewColCount]} gap-2`
                      : `grid ${GRID_COLS[previewColCount]} gap-2`
                  }
                >
                  {previewImages.map((img) => (
                    <img
                      key={img.id}
                      src={`/api${img.path}`}
                      alt=""
                      loading="lazy"
                      className={
                        isNatural
                          ? 'mb-2 w-full break-inside-avoid rounded-md border border-slate-200'
                          : `w-full rounded-md border border-slate-200 object-cover ${
                              previewMode === 'portrait'
                                ? 'aspect-[9/16]'
                                : 'aspect-video'
                            }`
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex shrink-0 justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onImport(Array.from(selected))}
          disabled={selected.size === 0 || importing}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
        >
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>
    </Modal>
  )
}
