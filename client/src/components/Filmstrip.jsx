import { useEffect, useRef } from 'react'

export default function Filmstrip({ images, index, marked, onSelect }) {
  const stripRef = useRef(null)

  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [index])

  return (
    <div
      ref={stripRef}
      className="absolute left-0 right-0 top-0 z-10 flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-100/80 px-3 py-2.5 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      {images.map((image, i) => (
        <img
          key={image.id ?? image}
          data-active={i === index}
          src={`/api${image.path ?? image}`}
          alt=""
          onClick={(e) => {
            e.stopPropagation()
            onSelect(i)
          }}
          className={`h-16 w-28 shrink-0 cursor-pointer rounded-md object-cover shadow-md transition duration-150 ${
            marked?.has(image.id ?? image)
              ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-100'
              : i === index
                ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100'
                : 'opacity-50 hover:opacity-90'
          }`}
        />
      ))}
    </div>
  )
}
