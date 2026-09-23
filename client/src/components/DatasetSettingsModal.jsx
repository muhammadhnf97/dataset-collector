import { useState } from 'react'
import Modal from './Modal'
import TemplateSelect from './TemplateSelect'

export default function DatasetSettingsModal({
  dataset,
  templates,
  batches,
  batchStats,
  saving,
  onSave,
  onRemoveBatch,
  onRemoveDataset,
  onClose,
}) {
  const [name, setName] = useState(dataset?.name ?? '')
  const [template, setTemplate] = useState(() => {
    const match = templates.find(
      (t) => t.framework === dataset?.framework && t.label === dataset?.model,
    )
    return match ? match.name : ''
  })
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-lg"
      cardClassName="max-h-[85vh] overflow-y-auto"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-slate-800">Dataset Settings</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Model template
          </label>
          <TemplateSelect
            templates={templates}
            value={template}
            onChange={setTemplate}
          />
        </div>
      </div>

      {batches.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Batches in dataset
          </h3>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {batches.map((batch) => (
              <div
                key={batch}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-700">{batch}</span>
                <span className="text-xs text-slate-400">
                  {batchStats[batch]?.total ?? 0} images
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveBatch(batch)}
                  className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-red-400">
          Danger zone
        </h3>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 px-3 py-2">
          <span className="text-sm text-slate-700">Remove this dataset</span>
          <button
            type="button"
            onClick={onRemoveDataset}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600"
          >
            Remove dataset
          </button>
        </div>
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
          onClick={() => onSave(name, template)}
          disabled={saving || !name.trim() || !template}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
