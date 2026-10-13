import { useState } from 'react'
import Modal from './Modal'

export default function SplitBatchModal({
  batch,
  totalImages,
  progress,
  splitting,
  onSplit,
  onClose,
}) {
  const [chunkSize, setChunkSize] = useState(1000)
  const numParts =
    chunkSize > 0 ? Math.ceil(totalImages / chunkSize) : 0
  const valid = chunkSize > 0 && chunkSize < totalImages

  return (
    <Modal onClose={splitting ? () => {} : onClose} maxWidth="max-w-sm" bodyClassName="p-6">
      <h2 className="text-lg font-semibold text-slate-800">Split batch</h2>
      <p className="mt-1 text-xs text-slate-500">
        Split <span className="font-medium text-slate-700">{batch}</span> (
        {totalImages} images) into smaller batches. Files are moved, not
        copied — nothing is duplicated on disk.
      </p>

      <label className="mt-4 block text-xs font-medium text-slate-700">
        Images per batch
        <input
          type="number"
          min={1}
          max={Math.max(1, totalImages - 1)}
          value={chunkSize}
          disabled={splitting}
          onChange={(e) => setChunkSize(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 block w-32 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 disabled:opacity-50"
        />
      </label>

      <p className="mt-2 text-xs text-slate-500">
        {valid
          ? `Creates ${numParts} batches: ${batch}-01 … ${batch}-${String(numParts).padStart(2, '0')}`
          : 'Enter a size smaller than the total image count'}
      </p>

      {splitting && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Splitting...</span>
            <span>
              {progress?.done ?? 0} / {progress?.total ?? totalImages}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{
                width: `${Math.min(100, ((progress?.done ?? 0) / (progress?.total || totalImages)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={splitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSplit(chunkSize)}
          disabled={!valid || splitting}
          className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {splitting ? 'Splitting...' : 'Split'}
        </button>
      </div>
    </Modal>
  )
}
