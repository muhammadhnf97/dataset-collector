import Modal from './Modal'
import { formatRelativeTime } from '../utils'

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
      <div className="mt-4 space-y-2">
        {datasetArchives.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No archives for this dataset yet
          </p>
        ) : (
          datasetArchives.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-700">
                  {a.name}
                </div>
                <div className="text-xs text-slate-400">
                  {(a.size / 1024 / 1024).toFixed(1)} MB
                  {a.created_at && ` · ${formatRelativeTime(a.created_at)}`}
                  {!a.exists && ' · file missing'}
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
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
              </div>
            </div>
          ))
        )}
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
