import { useMemo } from 'react'

export default function SourceGroups({
  sources,
  onAddVersion,
  selectedId,
  onSelectVersion,
  onDeleteVersion,
}) {
  const groups = useMemo(() => {
    const map = {}
    for (const s of sources) {
      if (!map[s.name]) map[s.name] = []
      map[s.name].push(s)
    }
    return Object.entries(map)
  }, [sources])
  return (
    <div className="space-y-2">
      {groups.map(([name, versions]) => (
        <div
          key={name}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{name}</span>
            <button
              type="button"
              onClick={() => onAddVersion(name)}
              className="rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
              title={`Create ${name} · v${
                Math.max(
                  0,
                  ...versions.map((v) =>
                    /^\d+$/.test(v.version) ? parseInt(v.version, 10) : 0,
                  ),
                ) + 1
              }`}
            >
              + version
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {versions.map((s) =>
              onSelectVersion ? (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectVersion(String(s.id))}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    selectedId === String(s.id)
                      ? 'bg-indigo-500 text-white shadow'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  v{s.version}
                  <span className="ml-1 opacity-60">
                    {s.batches} batch{s.batches === 1 ? '' : 'es'}
                  </span>
                </button>
              ) : (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700"
                  title={`${s.batches} batch${s.batches === 1 ? '' : 'es'}`}
                >
                  v{s.version}
                  <span className="text-indigo-400">
                    {s.batches} batch{s.batches === 1 ? '' : 'es'}
                  </span>
                  {onDeleteVersion && (
                    <button
                      type="button"
                      onClick={() => onDeleteVersion(s.id)}
                      className="ml-0.5 text-indigo-400 transition hover:text-red-500"
                      title="Delete (untags batches)"
                    >
                      ×
                    </button>
                  )}
                </span>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
