import { useState } from 'react'
import Modal from './Modal'

export default function AssignToDatasetModal({ dataset, batches, onAssign, onClose }) {
  const [selected, setSelected] = useState('')
  return (
    <Modal onClose={onClose} maxWidth="max-w-md" bodyClassName="p-6">
      <h3 className="text-lg font-semibold text-slate-800">
        Assign batch to {dataset}
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Select an import or video-extracted batch to add.
      </p>
      <div className="mt-4">
        {batches.length === 0 ? (
          <p className="text-sm text-slate-500">No batches available.</p>
        ) : (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {batches.map((batch) => {
              const name = typeof batch === 'string' ? batch : batch.name
              return (
                <option key={name} value={name}>
                  {name}
                </option>
              )
            })}
          </select>
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
          onClick={() => onAssign(selected)}
          disabled={!selected || batches.length === 0}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
        >
          Assign
        </button>
      </div>
    </Modal>
  )
}
