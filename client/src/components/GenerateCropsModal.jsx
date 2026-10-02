import { useState } from 'react'
import Modal from './Modal'

export default function GenerateCropsModal({ batch, yoloClasses, generating, onGenerate, onClose }) {
  const [selectedClasses, setSelectedClasses] = useState([])
  const [confidence, setConfidence] = useState(70)
  const [cropMargin, setCropMargin] = useState(0)
  const [removeSource, setRemoveSource] = useState(false)

  return (
    <Modal onClose={onClose} maxWidth="max-w-md" bodyClassName="p-6">
      <h2 className="text-lg font-semibold text-slate-800">Generate crops</h2>
      <p className="mt-1 text-xs text-slate-500">
        Detect objects in <span className="font-medium text-slate-700">{batch}</span> and
        crop them into a new batch.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="text-xs font-medium text-slate-700">
          Crop margin (px)
          <input
            type="number"
            min={0}
            max={200}
            value={cropMargin}
            onChange={(e) =>
              setCropMargin(Math.min(200, Math.max(0, Number(e.target.value) || 0)))
            }
            className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Confidence (%)
          <input
            type="number"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) =>
              setConfidence(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
            }
            className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={removeSource}
            onChange={(e) => setRemoveSource(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-500"
          />
          Remove source batch after generate
        </label>
      </div>

      <div className="mt-4 border-t border-slate-200/70 pt-4">
        <span className="text-xs font-medium text-slate-700">YOLO classes</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value
              if (value && !selectedClasses.includes(value)) {
                setSelectedClasses((prev) => [...prev, value])
              }
              e.target.value = ''
            }}
            className="w-48 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
          >
            <option value="">Add a class</option>
            {yoloClasses
              .filter((cls) => !selectedClasses.includes(cls))
              .map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
          </select>
          {selectedClasses.length > 0 ? (
            selectedClasses.map((cls) => (
              <span
                key={cls}
                className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700"
              >
                {cls}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClasses((prev) => prev.filter((c) => c !== cls))
                  }
                  className="text-indigo-500 transition hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-400">Pick at least one class</span>
          )}
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
          onClick={() =>
            onGenerate({
              margin: cropMargin,
              classes: selectedClasses.join(','),
              confidence: confidence / 100,
              removeSource,
            })
          }
          disabled={generating || selectedClasses.length === 0}
          className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </Modal>
  )
}
