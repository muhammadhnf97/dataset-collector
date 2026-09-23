import { useState } from 'react'
import Modal from './Modal'
import { formatRelativeTime } from '../utils'

export default function LeaderboardModal({ dataset, leaderboard, activity, onClose }) {
  const [logOpen, setLogOpen] = useState(false)
  return (
    <Modal
      onClose={onClose}
      maxWidth="max-w-2xl"
      cardClassName="max-h-[80vh] overflow-hidden"
      title={`Leaderboard — ${dataset}`}
      subtitle="Ranked by attribute bits corrected vs the model"
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
      {leaderboard.length === 0 ? (
        <p className="text-sm text-slate-400">No contributors yet.</p>
      ) : (
        <ul className="space-y-2">
          {leaderboard.map((u, i) => (
            <li
              key={u.user}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                i === 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`w-8 shrink-0 text-center ${
                    i === 0 ? 'text-lg' : 'text-xs font-semibold text-slate-400'
                  }`}
                >
                  {i === 0 ? '👑' : `#${i + 1}`}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">{u.user}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {u.images_annotated} annotated · {u.reviewed} reviewed
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={`text-sm font-semibold ${i === 0 ? 'text-amber-700' : 'text-slate-800'}`}
                >
                  {u.corrections} corrections
                </div>
                <div className="text-xs text-slate-400">
                  {u.images_corrected} image{u.images_corrected === 1 ? '' : 's'} fixed
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
        >
          {logOpen ? 'Hide full log' : 'Show full log'}
        </button>
      </div>
      {logOpen &&
        (activity.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No activity recorded yet.</p>
        ) : (
          <ul className="mt-2 space-y-2 border-t border-slate-100 pt-3">
            {activity.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-800">{a.user_name}</span>
                  <span className="text-slate-400">
                    {' · '}
                    {{
                      annotate: 'annotated',
                      check: 'reviewed',
                      prelabel: 'prelabeled',
                      remove_image: 'removed image',
                    }[a.action] ?? a.action}
                  </span>
                  {a.image_path && (
                    <span className="ml-1 truncate text-slate-400" title={a.image_path}>
                      · {a.image_path.split('/').pop()}
                    </span>
                  )}
                  {a.detail?.attr_index !== undefined &&
                    a.detail.attr_index !== null && (
                      <span className="ml-1 text-slate-400">
                        · attr #{a.detail.attr_index}
                      </span>
                    )}
                  {a.action === 'annotate' && a.detail?.changed > 0 && (
                    <span className="ml-1 text-slate-400">
                      · {a.detail.changed} bit{a.detail.changed === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatRelativeTime(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  )
}
