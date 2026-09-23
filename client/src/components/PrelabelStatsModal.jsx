import Modal from './Modal'

export default function PrelabelStatsModal({ stats, onClose }) {
  const groupMap = new Map()
  for (const a of stats.attributes) {
    const g = a.group || 'Other'
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g).push(a)
  }
  const groups = [...groupMap.entries()]
    .map(([name, members]) => ({
      name,
      members: [...members].sort((a, b) => a.accuracy - b.accuracy),
      minAcc: Math.min(...members.map((m) => m.accuracy)),
    }))
    .sort((a, b) => a.minAcc - b.minAcc)
  const allAttrs = stats.attributes
  const meanAcc =
    allAttrs.reduce((n, a) => n + a.accuracy, 0) / Math.max(1, allAttrs.length)
  const weakCount = allAttrs.filter((a) => a.accuracy < 0.6).length
  const metricBar = (v) => (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            v >= 0.8
              ? 'bg-emerald-500'
              : v >= 0.6
                ? 'bg-amber-400'
                : 'bg-red-400'
          }`}
          style={{ width: `${Math.min(100, v * 100)}%` }}
        />
      </div>
      <span className="w-12 text-xs tabular-nums text-slate-600">
        {(v * 100).toFixed(1)}%
      </span>
    </div>
  )
  const attrRow = (attr, indented) => (
    <tr key={attr.index} className="border-b border-slate-100">
      <td
        className={`py-2 pr-4 text-slate-800 ${indented ? 'pl-6' : 'font-medium'}`}
      >
        {attr.name}
      </td>
      <td className="py-2 pr-4">{metricBar(attr.precision)}</td>
      <td className="py-2 pr-4">{metricBar(attr.recall)}</td>
      <td className="py-2 pr-4">{metricBar(attr.accuracy)}</td>
      <td className="py-2 pr-4 text-right text-xs tabular-nums text-slate-400">
        {attr.tp}
      </td>
      <td className="py-2 pr-4 text-right text-xs tabular-nums text-slate-400">
        {attr.fp}
      </td>
      <td className="py-2 pr-4 text-right text-xs tabular-nums text-slate-400">
        {attr.fn}
      </td>
      <td className="py-2 pr-4 text-right text-xs tabular-nums text-slate-400">
        {attr.tn}
      </td>
    </tr>
  )
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-4xl"
      cardClassName="max-h-[80vh] overflow-hidden"
      title={`Pre-label stats for ${stats.dataset}`}
      subtitle={
        <>
          {stats.total} pre-labeled images · mean accuracy{' '}
          {(meanAcc * 100).toFixed(1)}%
          {weakCount > 0 && (
            <span className="text-red-500">
              {' '}
              · {weakCount} attribute{weakCount === 1 ? '' : 's'} below 60%
            </span>
          )}
        </>
      }
      bodyClassName="max-h-[60vh] overflow-auto p-4"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Close
        </button>
      }
    >
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-slate-200 text-slate-600">
            <th className="py-2 pr-4">Attribute</th>
            <th className="py-2 pr-4">Precision</th>
            <th className="py-2 pr-4">Recall</th>
            <th className="py-2 pr-4">Accuracy</th>
            <th className="py-2 pr-4 text-right">TP</th>
            <th className="py-2 pr-4 text-right">FP</th>
            <th className="py-2 pr-4 text-right">FN</th>
            <th className="py-2 pr-4 text-right">TN</th>
          </tr>
        </thead>
        {groups.map((group) => {
          if (group.members.length === 1) {
            return (
              <tbody key={group.name}>
                {attrRow(group.members[0], false)}
              </tbody>
            )
          }
          return (
            <tbody key={group.name}>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <td
                  colSpan={8}
                  className="py-1.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {group.name}
                </td>
              </tr>
              {group.members.map((attr) => attrRow(attr, true))}
            </tbody>
          )
        })}
      </table>
    </Modal>
  )
}
