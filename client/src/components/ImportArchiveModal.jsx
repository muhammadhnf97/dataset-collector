import { useRef } from 'react'
import Modal from './Modal'
import ArchiveList from './ArchiveList'

export default function ImportArchiveModal({
  archives,
  uploading,
  restoringId,
  onUploadFile,
  onRestore,
  onClose,
}) {
  const fileRef = useRef(null)
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-lg"
      cardClassName="max-h-[85vh] overflow-y-auto"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-slate-800">Import dataset</h2>
      <p className="mt-1 text-sm text-slate-500">
        Upload an archive file, or restore one already stored on the server.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".tar,.tar.gz,.tgz,.tar.bz2,.tar.xz,.zip,.rar"
        className="hidden"
        onChange={onUploadFile}
      />
      <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="text-sm text-slate-700">
          Archive file (.tar, .tar.gz, .zip, .rar)
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || restoringId !== null}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:opacity-40"
        >
          {uploading ? 'Uploading...' : 'Choose file'}
        </button>
      </div>
      <div className="mt-4">
        <ArchiveList
          archives={archives}
          emptyText="No archives stored yet"
          showDataset
          showCounts
          renderActions={(a) => (
            <button
              type="button"
              onClick={() => onRestore(a.id)}
              disabled={!a.exists || restoringId !== null}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
            >
              {restoringId === a.id ? 'Restoring...' : 'Restore'}
            </button>
          )}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
