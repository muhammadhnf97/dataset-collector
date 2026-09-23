import { formatRelativeTime } from '../utils'

export default function ArchiveList({
  archives,
  emptyText,
  showDataset = false,
  showCounts = false,
  renderActions,
}) {
  if (archives.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>
  }
  return (
    <div className="space-y-2">
      {archives.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-700">{a.name}</div>
            <div className="text-xs text-slate-400">
              {showDataset && `${a.dataset ?? 'unknown dataset'} · `}
              {(a.size / 1024 / 1024).toFixed(1)} MB
              {showCounts && ` · ${a.counts?.images ?? 0} images`}
              {a.created_at && ` · ${formatRelativeTime(a.created_at)}`}
              {!a.exists && ' · file missing'}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {renderActions(a)}
          </div>
        </div>
      ))}
    </div>
  )
}
