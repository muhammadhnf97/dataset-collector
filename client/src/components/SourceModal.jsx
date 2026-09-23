import Modal from './Modal'
import SourceGroups from './SourceGroups'
import NewSourceInput from './NewSourceInput'

export default function SourceModal({
  sources,
  onCreateSource,
  onDeleteSource,
  onClose,
}) {
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-lg"
      cardClassName="max-h-[85vh] overflow-y-auto"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-slate-800">Sources</h2>
      <p className="mt-1 text-xs text-slate-500">
        Where the images came from. Click a shop to mint its next version —
        deleting a source only untags its batches.
      </p>
      <div className="mt-4">
        <NewSourceInput onSubmit={onCreateSource} submitLabel="Add source" />
      </div>
      <div className="mt-4">
        {sources.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No sources yet
          </p>
        ) : (
          <SourceGroups
            sources={sources}
            onAddVersion={onCreateSource}
            onDeleteVersion={onDeleteSource}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-lg border border-slate-300 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
      >
        Close
      </button>
    </Modal>
  )
}
