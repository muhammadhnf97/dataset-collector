import { useState } from 'react'
import Modal from './Modal'
import TemplateSelect from './TemplateSelect'

export default function CreateDatasetModal({ templates, creating, onCreate, onClose }) {
  const [name, setName] = useState('')
  const [template, setTemplate] = useState('')
  return (
    <Modal onClose={onClose} maxWidth="max-w-md" bodyClassName="p-6">
      <h3 className="text-lg font-semibold text-slate-800">New Dataset</h3>
      <p className="mt-1 text-sm text-slate-500">
        Enter a name and pick a model template.
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCreate(name, template)
            }}
            placeholder="my-dataset"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Model template
          </label>
          <TemplateSelect
            templates={templates}
            value={template}
            onChange={setTemplate}
          />
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
          onClick={() => onCreate(name, template)}
          disabled={!name.trim() || creating}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
        >
          {creating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </Modal>
  )
}
