import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

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

  return (
    <Modal onClose={onClose} maxWidth="max-w-2xl" bodyClassName="p-6">
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
      <div className="mt-4">
        {filteredBatches.length === 0 ? (
          <p className="text-sm text-slate-500">
            {batches.length === 0
              ? 'No batches available.'
              : 'No batches for this source.'}
          </p>
        ) : (
          <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto p-1">
            {filteredBatches.map((batch) => {
              const isSelected = batch.id && selected.has(batch.id)
              const imported = importedBatches.includes(
                batch.name.replace(/\//g, '_'),
              )
              return (
                <button
                  key={batch.id ?? batch.name}
                  type="button"
                  title={batch.name}
                  disabled={!batch.id}
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(batch.id)) {
                        next.delete(batch.id)
                      } else {
                        next.add(batch.id)
                      }
                      return next
                    })
                  }
                  className={`group relative aspect-video w-full overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500'
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
                    <p className="text-[10px] font-medium text-white">
                      {batch.name}
                    </p>
                  </div>
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
            })}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
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
