import { useEffect } from 'react'
import { useAppData } from '../context/AppDataContext'
import { formatRelativeTime } from '../utils'

export default function ArchivesPage() {
  const {
    archives,
    fetchArchives,
    doRestoreArchive,
    restoringArchiveId,
    setConfirmingDeleteArchive,
  } = useAppData()

  useEffect(() => {
    fetchArchives()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Archives</h2>
        <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {archives.length}
        </span>
      </div>
      {archives.length === 0 ? (
        <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
          No archives stored. Create one from a dataset's Export ▾ menu.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {archives.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-700">
                  {a.name}
                </div>
                <div className="text-xs text-slate-400">
                  {a.dataset ?? 'unknown dataset'} ·{' '}
                  {(a.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                  {a.counts?.images ?? 0} images,{' '}
                  {a.counts?.annotated ?? 0} annotated
                  {a.created_at &&
                    ` · ${formatRelativeTime(a.created_at)}`}
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
                  onClick={() => doRestoreArchive(a.id)}
                  disabled={!a.exists || restoringArchiveId !== null}
                  className="rounded-md px-2 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-40"
                >
                  {restoringArchiveId === a.id
                    ? 'Restoring...'
                    : 'Restore'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteArchive(a)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
