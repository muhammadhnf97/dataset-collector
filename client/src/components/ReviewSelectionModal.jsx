import { useState } from 'react'
import Modal from './Modal'
import SkeletonImg from './SkeletonImg'

export default function ReviewSelectionModal({
  images,
  selected,
  onToggle,
  onRemove,
  onClose,
}) {
  const [mode, setMode] = useState('portrait')
  return (
    <Modal onClose={onClose} maxWidth="max-w-4xl" bodyClassName="p-6">
      <div className="flex items-start gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Selected images</h3>
          <p className="mt-1 text-sm text-slate-500">
            {selected.size} selected — click a thumbnail to toggle it.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setMode((m) =>
              m === 'landscape'
                ? 'portrait'
                : m === 'portrait'
                  ? 'natural'
                  : 'landscape',
            )
          }
          title={`Grid: ${mode} — click to switch`}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
        >
          {mode === 'landscape' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <rect x="3" y="7" width="18" height="10" rx="1.5" />
            </svg>
          ) : mode === 'portrait' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <rect x="7" y="3" width="10" height="18" rx="1.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <rect x="3" y="4" width="8" height="9" rx="1" />
              <rect x="13" y="4" width="8" height="5" rx="1" />
              <rect x="3" y="15" width="8" height="5" rx="1" />
              <rect x="13" y="11" width="8" height="9" rx="1" />
            </svg>
          )}
        </button>
      </div>
      {images.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
          No images selected
        </div>
      ) : (
        <div
          className={`mt-4 grid max-h-[60vh] grid-cols-6 gap-2 overflow-y-auto ${
            mode === 'natural' ? 'items-start' : ''
          }`}
        >
          {images.map((src) => {
            const sel = selected.has(src)
            return (
              <button
                key={src}
                type="button"
                onClick={() => onToggle(src)}
                className={`relative overflow-hidden rounded transition hover:shadow-md ${
                  mode === 'natural'
                    ? 'w-full'
                    : mode === 'portrait'
                      ? 'aspect-[9/16]'
                      : 'aspect-video'
                } ${sel ? '' : 'opacity-40'}`}
              >
                <SkeletonImg
                  src={`/api${src}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={`w-full ${
                    mode === 'natural' ? 'h-auto' : 'h-full object-cover'
                  }`}
                />
                <span
                  className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow ${
                    sel
                      ? 'bg-red-500 text-white'
                      : 'bg-white/50 text-transparent'
                  }`}
                >
                  ✓
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={selected.size === 0}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
        >
          Remove {selected.size}
        </button>
      </div>
    </Modal>
  )
}
