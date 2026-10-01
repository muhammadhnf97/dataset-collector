import { useEffect, useState } from 'react'
import Filmstrip from './Filmstrip'
import ConfirmModal from './ConfirmModal'
import { ArrowIcon } from './icons'
import { formatRelativeTime, mergeReviewerMaps, sortedReviewers } from '../utils'

export default function ImageModal({ images, index, onClose, onNavigate, onSelect, onRemove, onAnnotate, attributes, annotations, reviewed }) {
  const [pendingAttr, setPendingAttr] = useState(null)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
      if (onRemove && (e.key === 'x' || e.key === 'X')) {
        const current = images[index]
        onRemove(current.path ?? current)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNavigate, onRemove, images, index])

  if (index === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <Filmstrip images={images} index={index} onSelect={onSelect} />

      {(onRemove || onAnnotate) && (
        <div className="absolute left-4 top-24 z-10 flex items-center gap-2">
          {onAnnotate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const current = images[index]
                onAnnotate(current.path ?? current)
              }}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-500/80 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-emerald-500"
            >
              Annotate
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const current = images[index]
                onRemove(current.path ?? current)
              }}
              className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-red-500/80 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-red-500"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-24 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-xl text-slate-800 backdrop-blur-md transition hover:bg-slate-300"
      >
        ×
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(-1)
        }}
        className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-800 backdrop-blur-md transition hover:scale-105 hover:bg-slate-300"
      >
        <ArrowIcon direction="left" className="h-6 w-6" />
      </button>

      <div className="flex flex-1 items-center justify-center overflow-hidden pt-24 pb-12">
        <img
          src={`/api${images[index].path ?? images[index]}`}
          alt=""
          className="h-full w-full object-contain p-4"
        />
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onNavigate(1)
        }}
        className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-slate-800 backdrop-blur-md transition hover:scale-105 hover:bg-slate-300"
      >
        <ArrowIcon direction="right" className="h-6 w-6" />
      </button>

      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-slate-300 bg-slate-200 px-4 py-1.5 text-sm font-medium text-slate-800 backdrop-blur-md">
        {index + 1} / {images.length}
      </span>

      {attributes && (
        <div className="absolute bottom-5 left-4 z-10 w-64 rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-xs shadow backdrop-blur-md">
          {(() => {
            const current = images[index].path ?? images[index]
            const values = annotations?.[current]
            const attrReview = reviewed?.[current] ?? {}
            const reviewersFor = (gi) =>
              sortedReviewers(
                mergeReviewerMaps(attrReview[String(gi)], attrReview.all),
              )
            if (!values) {
              const any = sortedReviewers(
                mergeReviewerMaps(...Object.values(attrReview)),
              )
              return (
                <>
                  <p className="flex items-center gap-1.5 py-1 text-slate-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                    Not annotated
                  </p>
                  {any.length > 0 && (
                    <p className="py-0.5 text-[10px] text-slate-400">
                      Reviewed by{' '}
                      {any
                        .map(([u, at]) => `${u} · ${formatRelativeTime(at)}`)
                        .join(', ')}
                    </p>
                  )}
                </>
              )
            }
            return attributes.map((group, gi) => {
              const selected = (group.options ?? [])
                .map((opt, i) => group.option_aliases?.[i] ?? opt)
                .filter((_, i) => values[group.indices[i]] === 1)
              const hasValue = selected.length > 0
              const rowReviewers = reviewersFor(gi)
              return (
                <div
                  key={group.name}
                  onClick={
                    onAnnotate ? () => setPendingAttr(gi) : undefined
                  }
                  className={`flex items-center gap-1.5 py-0.5 leading-relaxed ${
                    onAnnotate
                      ? '-mx-1 cursor-pointer rounded px-1 transition hover:bg-slate-200/70'
                      : ''
                  }`}
                  title={
                    onAnnotate
                      ? `Annotate ${group.alias ?? group.name} from here`
                      : undefined
                  }
                >
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      hasValue ? 'bg-emerald-500' : 'bg-red-400'
                    }`}
                  />
                  <span className="font-semibold text-slate-500">
                    {group.alias ?? group.name}
                  </span>{' '}
                  <span
                    className={`font-medium ${
                      hasValue ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {hasValue ? selected.join(', ') : '—'}
                  </span>
                  {rowReviewers.length > 0 && (
                    <span
                      className="ml-auto shrink-0 text-[10px] font-normal text-slate-400"
                      title={rowReviewers
                        .map(([u, at]) => `${u} · ${formatRelativeTime(at)}`)
                        .join('\n')}
                    >
                      {rowReviewers.map(([u]) => u).join(', ')}
                    </span>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
      {pendingAttr !== null && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmModal
            title={`Annotate ${attributes[pendingAttr].alias ?? attributes[pendingAttr].name}?`}
            message="Open annotation for this attribute starting from the current image."
            confirmLabel="Annotate"
            danger={false}
            onCancel={() => setPendingAttr(null)}
            onConfirm={() => {
              const gi = pendingAttr
              setPendingAttr(null)
              const current = images[index]
              onAnnotate?.(current.path ?? current, gi)
            }}
          />
        </div>
      )}
    </div>
  )
}
