import { useEffect } from 'react'
import Filmstrip from './Filmstrip'
import { ArrowIcon } from './icons'

export default function RemoveModeModal({
  images,
  index,
  marked,
  onToggleMark,
  onNavigate,
  onSelect,
  onClose,
  onDone,
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
      if (e.key === ' ') {
        e.preventDefault()
        const current = images[index]
        if (current) {
          onToggleMark(current.id ?? current)
          onNavigate(1)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNavigate, onToggleMark, images, index])

  const current = images[index]
  const isMarked = current ? marked.has(current.id ?? current) : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <Filmstrip
        images={images}
        index={index}
        marked={marked}
        onSelect={onSelect}
      />

      <div className="absolute left-4 top-24 z-10 flex items-center gap-3">
        <span className="rounded-full border border-red-400/30 bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-200 backdrop-blur-md">
          Remove Mode — {marked.size} marked
        </span>
      </div>

      <div className="absolute right-4 top-24 z-10 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
        >
          Done
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(-1)}
        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
      >
        <ArrowIcon direction="left" className="h-6 w-6" />
      </button>

      {current && (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden pt-24 pb-12">
          <img
            src={`/api${current.path ?? current}`}
            alt=""
            className={`h-full w-full rounded-lg object-contain shadow-2xl transition ${
              isMarked ? 'ring-4 ring-red-500' : ''
            }`}
          />
          {isMarked && (
            <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-lg font-bold text-white shadow-lg">
              ✓
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate(1)}
        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/20"
      >
        <ArrowIcon direction="right" className="h-6 w-6" />
      </button>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <span className="rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md">
          {index + 1} / {images.length}
        </span>
        {current && (
          <button
            type="button"
            onClick={() => onToggleMark(current.id ?? current)}
            className={`rounded-full px-5 py-2 text-sm font-medium text-white shadow-lg transition ${
              isMarked
                ? 'border border-white/10 bg-white/10 backdrop-blur-md hover:bg-white/20'
                : 'bg-red-500 shadow-red-500/30 hover:bg-red-600'
            }`}
          >
            {isMarked ? 'Unmark' : 'Mark for removal'}
          </button>
        )}
      </div>
    </div>
  )
}
