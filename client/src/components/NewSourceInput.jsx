import { useState } from 'react'

export default function NewSourceInput({ onSubmit, submitLabel = 'Add source', dashed = false }) {
  const [name, setName] = useState('')
  const submit = async () => {
    const res = await onSubmit(name)
    if (res) setName('')
  }
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 ${
        dashed ? 'border-dashed border-slate-300' : 'border-slate-200'
      }`}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        placeholder="New source name (e.g. Shop A)"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!name.trim()}
        className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  )
}
