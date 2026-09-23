import Modal from './Modal'
import SourceGroups from './SourceGroups'
import NewSourceInput from './NewSourceInput'

export default function UploadSourceModal({
  sources,
  selectedId,
  onSelect,
  onCreateSource,
  onContinue,
  onClose,
}) {
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-md"
      cardClassName="max-h-[85vh] overflow-y-auto"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-slate-800">Select source</h2>
      <p className="mt-1 text-xs text-slate-500">
        Batches created from this upload will be tagged with the selected
        source.
      </p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`flex w-full items-center rounded-lg border px-3 py-2 text-sm transition ${
            selectedId === ''
              ? 'border-indigo-400 bg-indigo-50 font-medium text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          No source
        </button>
        <SourceGroups
          sources={sources}
          selectedId={selectedId}
          onSelectVersion={onSelect}
          onAddVersion={async (name) => {
            const s = await onCreateSource(name)
            if (s) onSelect(String(s.id))
          }}
        />
      </div>
      <NewSourceInput
        dashed
        submitLabel="Add &amp; select"
        onSubmit={async (name) => {
          const s = await onCreateSource(name)
          if (s) onSelect(String(s.id))
          return s
        }}
      />
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex-1 rounded-lg bg-indigo-500 py-2 text-sm font-medium text-white transition hover:bg-indigo-600"
        >
          Continue → choose file
        </button>
      </div>
    </Modal>
  )
}
