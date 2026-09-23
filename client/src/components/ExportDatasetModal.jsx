import Modal from './Modal'

export default function ExportDatasetModal({
  dataset,
  batches,
  split,
  onSplitChange,
  format,
  onFormatChange,
  groupSplit,
  onGroupSplitChange,
  selectedBatches,
  onSelectedBatchesChange,
  result,
  exporting,
  onExport,
  onClose,
}) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-md" bodyClassName="p-6">
      <h3 className="text-lg font-semibold text-slate-800">
        Export {dataset}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Set the split ratio before exporting.
      </p>
      <div className="mt-4 flex justify-center gap-4">
        {['train', 'val', 'test'].map((key) => (
          <label
            key={key}
            className="flex flex-col items-center gap-1 text-sm font-medium text-slate-700"
          >
            <span className="capitalize">{key}</span>
            <input
              type="number"
              min={0}
              max={100}
              value={split[key]}
              onChange={(e) =>
                onSplitChange((s) => ({
                  ...s,
                  [key]: Number(e.target.value) || 0,
                }))
              }
              className="w-16 rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-center text-sm text-slate-800"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <label className="text-sm font-medium text-slate-700">Format</label>
        <select
          value={format}
          onChange={(e) => onFormatChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
        >
          <option value="tar">tar</option>
          <option value="zip">zip</option>
          <option value="rar">rar</option>
        </select>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={groupSplit}
          onChange={(e) => onGroupSplitChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="font-medium">Identity-aware split</span>
          <span className="block text-xs text-slate-400">
            Keeps near-duplicate crops of the same person in one split
            (prevents val/test leakage)
          </span>
        </span>
      </label>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Batches</span>
          <button
            type="button"
            onClick={() =>
              onSelectedBatchesChange(
                selectedBatches.length === batches.length ? [] : [...batches],
              )
            }
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            {selectedBatches.length === batches.length
              ? 'Deselect all'
              : 'Select all'}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
          {batches.length === 0 && (
            <p className="text-sm text-slate-500">No batches imported</p>
          )}
          {batches.map((batch) => (
            <label
              key={batch}
              className="flex items-center gap-2 py-1 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={selectedBatches.includes(batch)}
                onChange={(e) =>
                  onSelectedBatchesChange((prev) =>
                    e.target.checked
                      ? [...new Set([...prev, batch])]
                      : prev.filter((b) => b !== batch),
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="truncate" title={batch}>
                {batch}
              </span>
            </label>
          ))}
        </div>
      </div>

      {result && (
        <div className="mt-4 flex flex-col items-center gap-2 text-sm text-slate-600">
          <span>
            train {result.counts.train} / val {result.counts.val} / test{' '}
            {result.counts.test}
            {result.split_strategy === 'cluster' && (
              <span className="text-slate-400"> · identity-aware</span>
            )}
          </span>
          <a
            href={`/api${result.download}`}
            className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/20"
          >
            Download
          </a>
        </div>
      )}

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
          onClick={onExport}
          disabled={exporting || selectedBatches.length === 0}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
        >
          {exporting ? 'Exporting...' : 'Export'}
        </button>
      </div>
    </Modal>
  )
}
