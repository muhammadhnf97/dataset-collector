import Modal from './Modal'
import ArchiveList from './ArchiveList'

export default function ArchivesModal({
  dataset,
  archives,
  format,
  onFormatChange,
  archiving,
  onCreateArchive,
  onDeleteArchive,
  onClose,
}) {
  const datasetArchives = archives.filter((a) => a.dataset === dataset)
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-lg"
      cardClassName="max-h-[85vh] overflow-y-auto"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-slate-800">Archives</h2>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-sm text-slate-700">
          New archive of {dataset}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={format}
            onChange={(e) => onFormatChange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none"
          >
            <option value="tar">tar</option>
            <option value="zip">zip</option>
          </select>
          <button
            type="button"
            onClick={onCreateArchive}
            disabled={archiving}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:opacity-40"
          >
            {archiving ? 'Creating...' : 'Create archive'}
          </button>
        </div>
      </div>
      <div className="mt-4">
        <ArchiveList
          archives={datasetArchives}
          emptyText="No archives for this dataset yet"
          renderActions={(a) => (
            <>
              <a
                href={`/api/archives/${a.id}/download`}
                className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => onDeleteArchive(a)}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
              >
                Delete
              </button>
            </>
          )}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
