import { useEffect, useMemo, useRef, useState } from 'react'

function UploadIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  )
}

function VideoThumb({
  video,
  selected,
  removeMode,
  marked,
  onSelect,
  onToggleRemove,
}) {
  return (
    <div className="flex w-40 shrink-0 flex-col">
      <div className="relative">
        <button
          type="button"
          onClick={removeMode ? onToggleRemove : onSelect}
          className={`group relative w-full overflow-hidden rounded-xl shadow transition hover:shadow-lg ${
            selected
              ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
              : ''
          } ${marked ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white' : ''}`}
        >
          {video.thumbnail_url ? (
            <img
              src={`/api${video.thumbnail_url}`}
              alt=""
              className="aspect-video w-full object-cover transition duration-150 group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-slate-200 text-xs text-slate-500">
              No thumbnail
            </div>
          )}
          {removeMode ? (
            <div className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${marked ? 'border-red-500 bg-red-500 text-white' : 'border-white bg-white/50 text-transparent'}`}>
              ✓
            </div>
          ) : video.batch_count > 0 ? (
            <div
              title={`${video.batch_count} batch${video.batch_count === 1 ? '' : 'es'}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-sm font-bold text-white shadow"
            >
              ✓
            </div>
          ) : null}
        </button>
      </div>
    </div>
  )
}

function ArrowIcon({ className, direction }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          direction === 'left'
            ? 'M15.75 19.5 8.25 12l7.5-7.5'
            : 'M8.25 4.5 15.75 12l-7.5 7.5'
        }
      />
    </svg>
  )
}

function Filmstrip({ images, index, marked, onSelect }) {
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
          key={image}
          data-active={i === index}
          src={`/api${image}`}
          alt=""
          onClick={(e) => {
            e.stopPropagation()
            onSelect(i)
          }}
          className={`h-16 w-28 shrink-0 cursor-pointer rounded-md object-cover shadow-md transition duration-150 ${
            marked?.has(image)
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

function ImageModal({ images, index, onClose, onNavigate, onSelect, onRemove }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === 'ArrowRight') onNavigate(1)
      if (onRemove && (e.key === 'x' || e.key === 'X')) {
        onRemove(images[index])
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

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(images[index])
          }}
          className="absolute left-4 top-24 z-10 flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-red-500/80 px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-red-500"
        >
          Remove
        </button>
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

      <img
        src={`/api${images[index]}`}
        alt=""
        className="h-full w-full object-contain p-4"
      />

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
    </div>
    </div>
  )
}

function RemoveModeModal({
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
        if (images[index]) {
          onToggleMark(images[index])
          onNavigate(1)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNavigate, onToggleMark, images, index])

  const current = images[index]
  const isMarked = current ? marked.has(current) : false

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
        <div className="relative">
          <img
            src={`/api${current}`}
            alt=""
            className={`h-[72vh] w-[85vw] rounded-lg object-contain shadow-2xl transition ${
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
            onClick={() => onToggleMark(current)}
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

function ConfirmModal({ count, onCancel, onConfirm, title, message, confirmLabel = 'Delete' }) {
  const confirmRef = useRef(null)
  const onConfirmRef = useRef(onConfirm)
  const onCancelRef = useRef(onCancel)
  onConfirmRef.current = onConfirm
  onCancelRef.current = onCancel

  useEffect(() => {
    confirmRef.current?.focus()
    const handleKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onConfirmRef.current()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onCancelRef.current()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-center text-base font-semibold text-white">
          {title ?? `Delete ${count} image${count === 1 ? '' : 's'}?`}
        </h3>
        <p className="mt-1.5 text-center text-sm text-slate-400">
          {message ??
            'This will permanently remove the marked images. This action cannot be undone.'}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ArchiveIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  )
}

function App() {
  const fileInputRef = useRef(null)
  const tarInputRef = useRef(null)
  const [status, setStatus] = useState(null)
  const [videos, setVideos] = useState([])
  const [importedImages, setImportedImages] = useState([])
  const [frameImages, setFrameImages] = useState([])
  const [cropImages, setCropImages] = useState([])
  const [selectedRaw, setSelectedRaw] = useState(null)
  const [selectedRawImages, setSelectedRawImages] = useState([])
  const [yoloClasses, setYoloClasses] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selectedFilename, setSelectedFilename] = useState(null)
  const [videoMode, setVideoMode] = useState('frames')
  const [videoFramesPerMinute, setVideoFramesPerMinute] = useState(30)
  const [videoCropMargin, setVideoCropMargin] = useState(0)
  const [videoSelectedClasses, setVideoSelectedClasses] = useState([])
  const [videoConfidence, setVideoConfidence] = useState(70)
  const [videoExtracting, setVideoExtracting] = useState(false)
  const [removeVideoMode, setRemoveVideoMode] = useState(false)
  const [selectedVideosToRemove, setSelectedVideosToRemove] = useState(new Set())
  const [confirmingRemoveVideos, setConfirmingRemoveVideos] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState(null)
  const [videoImages, setVideoImages] = useState([])
  const [videoModalIndex, setVideoModalIndex] = useState(null)
  const [confirmingRemoveVideoBatch, setConfirmingRemoveVideoBatch] = useState(false)
  const [rawSelectedClasses, setRawSelectedClasses] = useState([])
  const [rawConfidence, setRawConfidence] = useState(70)
  const [rawCropMargin, setRawCropMargin] = useState(0)
  const [rawRemoveSource, setRawRemoveSource] = useState(false)
  const [rawGenerating, setRawGenerating] = useState(false)
  const [removeDatasetMode, setRemoveDatasetMode] = useState(false)
  const [selectedDatasetsToRemove, setSelectedDatasetsToRemove] = useState(new Set())
  const [removeRawMode, setRemoveRawMode] = useState(false)
  const [selectedRawsToRemove, setSelectedRawsToRemove] = useState(new Set())
  const [confirmingRemoveRaws, setConfirmingRemoveRaws] = useState(false)
  const [confirmingRemoveDatasets, setConfirmingRemoveDatasets] = useState(false)
  const [selectedVideoBatch, setSelectedVideoBatch] = useState(null)

  const videoImageGroups = useMemo(() => {
    const groups = {}
    for (const src of videoImages) {
      const match = src.match(/\/imgs\/([^/]+)\//)
      const batch = match ? match[1] : 'unknown'
      if (!groups[batch]) groups[batch] = []
      groups[batch].push(src)
    }
    return groups
  }, [videoImages])

  useEffect(() => {
    const batches = Object.keys(videoImageGroups).sort()
    setSelectedVideoBatch((current) =>
      current && videoImageGroups[current] ? current : batches[0] ?? null,
    )
  }, [videoImageGroups])

  const [modalIndex, setModalIndex] = useState(null)
  const [datasetModalIndex, setDatasetModalIndex] = useState(null)
  const [imagePage, setImagePage] = useState(0)

  const [removeMode, setRemoveMode] = useState(false)
  const [removeIndex, setRemoveIndex] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingRemoveImage, setConfirmingRemoveImage] = useState(false)
  const [confirmingRemoveAttrImage, setConfirmingRemoveAttrImage] = useState(false)
  const [confirmingRemoveDatasetBatch, setConfirmingRemoveDatasetBatch] = useState(false)
  const [datasetBatchToRemove, setDatasetBatchToRemove] = useState('')
  const [splitCount, setSplitCount] = useState(2)
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false)
  const [deleteBatchConfirmOpen, setDeleteBatchConfirmOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [activePage, setActivePage] = useState('raw_video')
  const [activeDataset, setActiveDataset] = useState('')
  const [datasetBatches, setDatasetBatches] = useState([])
  const [datasetImages, setDatasetImages] = useState([])
  const [datasetImageGroups, setDatasetImageGroups] = useState({})
  const [datasetAnnotations, setDatasetAnnotations] = useState({})
  const [datasetBatchFilter, setDatasetBatchFilter] = useState(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [datasetSplit, setDatasetSplit] = useState({
    train: 70,
    val: 20,
    test: 10,
  })
  const attrStripRef = useRef(null)
  const [exportResult, setExportResult] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [selectedExportBatches, setSelectedExportBatches] = useState([])
  const [newDatasetName, setNewDatasetName] = useState('')
  const [createDatasetOpen, setCreateDatasetOpen] = useState(false)
  const [createDatasetName, setCreateDatasetName] = useState('')
  const [createDatasetTemplate, setCreateDatasetTemplate] = useState('')
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [assignToDatasetOpen, setAssignToDatasetOpen] = useState(false)
  const [assignToDatasetBatch, setAssignToDatasetBatch] = useState('')
  const [importBatchOpen, setImportBatchOpen] = useState(false)
  const [availableBatches, setAvailableBatches] = useState([])
  const [selectedImportBatches, setSelectedImportBatches] = useState(new Set())
  const [importingBatch, setImportingBatch] = useState(false)
  const [preLabeling, setPreLabeling] = useState(false)
  const [prelabelConfirmOpen, setPrelabelConfirmOpen] = useState(false)
  const [prelabelConfirmCount, setPrelabelConfirmCount] = useState(0)
  const [exportFormat, setExportFormat] = useState('tar')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [templates, setTemplates] = useState([])
  const [annotate, setAnnotate] = useState(null)
  const [attrAnnotate, setAttrAnnotate] = useState(null)
  const [markedForRemoval, setMarkedForRemoval] = useState(new Set())

  const toggleMarked = (image) => {
    setMarkedForRemoval((prev) => {
      const next = new Set(prev)
      if (next.has(image)) {
        next.delete(image)
      } else {
        next.add(image)
      }
      return next
    })
  }

  const activeImages = selectedRawImages

  const rawSources = useMemo(() => {
    const map = {}
    for (const url of importedImages) {
      const match = url.match(/\/uploads\/raw-images\/([^/]+)\//)
      if (!match) continue
      const source = match[1]
      if (!map[source]) map[source] = { source, batch: `raw-images/${source}`, previews: [] }
      if (map[source].previews.length < 1) map[source].previews.push(url)
    }
    return Object.values(map).sort((a, b) => a.source.localeCompare(b.source))
  }, [importedImages])

  const IMAGES_PER_PAGE = 50
  const pageCount = Math.max(
    1,
    Math.ceil(activeImages.length / IMAGES_PER_PAGE),
  )
  const pageImages = activeImages.slice(
    imagePage * IMAGES_PER_PAGE,
    (imagePage + 1) * IMAGES_PER_PAGE,
  )

  const navigateModal = (delta) => {
    setModalIndex((i) =>
      i === null
        ? null
        : (i + delta + activeImages.length) % activeImages.length,
    )
  }

  const navigateVideoModal = (delta) => {
    setVideoModalIndex((i) =>
      i === null
        ? null
        : (i + delta + videoImages.length) % videoImages.length,
    )
  }

  const navigateDatasetModal = (delta) => {
    setDatasetModalIndex((i) =>
      i === null
        ? null
        : (i + delta + datasetImages.length) % datasetImages.length,
    )
  }

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      setVideos(data.videos ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchVideoImages = async (filename) => {
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(filename)}/images`,
      )
      const data = await response.json()
      setVideoImages(data.images ?? [])
    } catch {
      setVideoImages([])
    }
  }

  const doDeleteSelectedVideos = async () => {
    if (selectedVideosToRemove.size === 0) return
    setConfirmingRemoveVideos(false)
    let deleted = 0
    let failed = 0
    for (const filename of selectedVideosToRemove) {
      try {
        const response = await fetch(
          `/api/videos/${encodeURIComponent(filename)}`,
          { method: 'DELETE' },
        )
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    if (deleted > 0) {
      setSelectedFilename(null)
      setVideoImages([])
      fetchVideos()
      fetchImages()
    }
    setSelectedVideosToRemove(new Set())
    setRemoveVideoMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} video${deleted === 1 ? '' : 's'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doDeleteSelectedRaws = async () => {
    if (selectedRawsToRemove.size === 0) return
    setConfirmingRemoveRaws(false)
    let deleted = 0
    let failed = 0
    for (const batch of selectedRawsToRemove) {
      try {
        const response = await fetch(
          `/api/batches/${encodeURIComponent(batch)}`,
          { method: 'DELETE' },
        )
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    if (deleted > 0) {
      setSelectedRaw(null)
      setSelectedRawImages([])
      fetchImages()
      fetchBatches()
    }
    setSelectedRawsToRemove(new Set())
    setRemoveRawMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} raw image batch${deleted === 1 ? '' : 'es'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doRemoveVideoBatch = async () => {
    if (!selectedFilename || !selectedVideoBatch) return
    setConfirmingRemoveVideoBatch(false)
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(selectedFilename)}/batches/${encodeURIComponent(selectedVideoBatch)}`,
        { method: 'DELETE' },
      )
      if (response.ok) {
        setVideoModalIndex(null)
        fetchVideoImages(selectedFilename)
        fetchImages()
        setStatus(`Deleted ${selectedVideoBatch}`)
      } else {
        const data = await response.json()
        setStatus(`Failed: ${data.detail ?? 'Could not delete batch'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doRemoveDatasets = async () => {
    if (selectedDatasetsToRemove.size === 0) return
    setConfirmingRemoveDatasets(false)
    let deleted = 0
    let failed = 0
    for (const name of selectedDatasetsToRemove) {
      try {
        const response = await fetch(
          `/api/datasets/${encodeURIComponent(name)}`,
          { method: 'DELETE' },
        )
        if (response.ok) {
          deleted += 1
        } else {
          failed += 1
        }
      } catch {
        failed += 1
      }
    }
    if (deleted > 0) {
      if (selectedDatasetsToRemove.has(activeDataset)) {
        setActiveDataset('')
      }
      fetchDatasets()
    }
    setSelectedDatasetsToRemove(new Set())
    setRemoveDatasetMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} dataset${deleted === 1 ? '' : 's'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doVideoExtract = async () => {
    if (!selectedFilename || videoExtracting) return
    setVideoExtracting(true)
    setStatus('Extracting...')
    try {
      const params = new URLSearchParams({
        frames_per_minute: String(videoFramesPerMinute),
        margin: String(videoCropMargin),
        classes: videoSelectedClasses.join(','),
        mode: videoMode,
        confidence: String(videoConfidence / 100),
      })
      const response = await fetch(
        `/api/videos/${encodeURIComponent(selectedFilename)}/frames?${params}`,
        { method: 'POST' },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Extracted ${videoMode} for ${selectedFilename}`)
        fetchImages()
        fetchVideoImages(selectedFilename)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Extraction failed'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setVideoExtracting(false)
    }
  }

  const doGenerateRaw = async () => {
    if (!selectedRaw || rawGenerating) return
    setRawGenerating(true)
    setStatus('Generating...')
    try {
      const response = await fetch(
        `/api/raw-images/${encodeURIComponent(`raw-images/${selectedRaw}`)}/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'crops',
            margin: rawCropMargin,
            classes: rawSelectedClasses.join(','),
            confidence: rawConfidence / 100,
            remove_source: rawRemoveSource,
          }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Generated ${data.count} images`)
        fetchImages()
        fetchRawImages(`raw-images/${selectedRaw}`)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Generation failed'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRawGenerating(false)
    }
  }

  const fetchImages = async (batch = null) => {
    const url = batch
      ? `/api/images?batch=${encodeURIComponent(batch)}`
      : '/api/images'
    try {
      const response = await fetch(url)
      const data = await response.json()
      setImportedImages(data.imported ?? [])
      setFrameImages(data.frames ?? [])
      setCropImages(data.crops ?? [])
      setImagePage(0)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchRawImages = async (source) => {
    try {
      const response = await fetch(
        `/api/images?batch=${encodeURIComponent(source)}`,
      )
      const data = await response.json()
      setSelectedRawImages(data.imported ?? [])
      setImagePage(0)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches')
      const data = await response.json()
      setBatches(data.batches ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSplit = async () => {
    const label = selectedBatch ? `batch ${selectedBatch}` : 'loose imports'
    setStatus(`Splitting ${label}...`)
    try {
      const body = { count: splitCount }
      if (selectedBatch) body.source = selectedBatch
      const response = await fetch('/api/split-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus(
          `Split ${data.moved} images into ${data.batches.length} batches`,
        )
        setSelectedBatch(null)
        setSplitConfirmOpen(false)
        fetchBatches()
        fetchImages()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchDatasets = async () => {
    try {
      const response = await fetch('/api/datasets')
      const data = await response.json()
      setDatasets((data.datasets ?? []).map((d) => (typeof d === 'string' ? { name: d, previews: [], batches: [] } : d)))
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const refreshDataset = async (name) => {
    try {
      const [datasetRes, imagesRes, annotRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(name)}`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/images`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
      ])
      const data = await datasetRes.json()
      const imagesData = await imagesRes.json()
      const annotData = await annotRes.json()
      if (datasetRes.ok && imagesRes.ok) {
        setActiveDataset(data.name)
        setDatasetBatches(data.batches ?? [])
        setDatasetSplit(data.split ?? { train: 70, val: 20, test: 10 })
        setDatasetImages(imagesData.images ?? [])
        setDatasetImageGroups(imagesData.groups ?? {})
        setDatasetAnnotations(annotData.annotations ?? {})
      } else {
        setStatus(`Failed: ${data.detail ?? imagesData.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openDataset = async (name) => {
    if (activeDataset === name) {
      setActiveDataset('')
      return
    }
    setExportResult(null)
    setExportFormat('tar')
    setShowExportPanel(false)
    setDatasetBatchFilter(null)
    await refreshDataset(name)
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      setTemplates(data.templates ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSetTemplate = async (name, templateName) => {
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(name)}/template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: templateName }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Set model for ${name} to ${templateName}`)
        fetchDatasets()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openAnnotate = async (name, templateName, batchFilter = null, startImage = null) => {
    if (!templateName) {
      setStatus('Set a model for this dataset before annotating')
      return
    }
    try {
      const [imagesRes, attrsRes, annotRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(name)}/images`),
        fetch(`/api/templates/${encodeURIComponent(templateName)}/attributes`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
      ])
      const images = await imagesRes.json()
      const attrs = await attrsRes.json()
      const annot = await annotRes.json()
      if (!imagesRes.ok || !attrsRes.ok || !annotRes.ok) {
        setStatus('Failed to load annotation data')
        return
      }
      const attributes = attrs.attributes ?? []
      const length =
        Math.max(
          0,
          ...attributes.flatMap((g) => g.indices),
        ) + 1
      const filteredImages = batchFilter
        ? (images.images ?? []).filter((src) =>
            src.includes(`/imports/${batchFilter}/`),
          )
        : images.images ?? []
      const annotations = annot.annotations ?? {}
      // Resume where you left off: start on the requested image, or the
      // first not-yet-annotated one, or the first image as a fallback.
      const startIndex = startImage
        ? Math.max(0, filteredImages.indexOf(startImage))
        : Math.max(
            0,
            filteredImages.findIndex((src) => annotations[src] === undefined),
          )
      const initialValues = annotations[filteredImages[startIndex]] ?? Array(length).fill(0)
      const initialOptionIndex = (group) => {
        if (!group) return 0
        const selected = group.indices.findIndex((idx) => initialValues[idx] === 1)
        return selected >= 0 ? selected : 0
      }
      setAnnotate({
        dataset: name,
        template: templateName,
        batchFilter,
        images: filteredImages,
        attributes,
        annotations,
        length,
        index: startIndex,
        step: 0,
        optionIndex: initialOptionIndex(attributes[0]),
        wizardMode: true,
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const openAttrAnnotate = async (name, templateName, batchFilter = null) => {
    if (!templateName) {
      setStatus('Set a model for this dataset before annotating')
      return
    }
    try {
      const [imagesRes, attrsRes, annotRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(name)}/images`),
        fetch(`/api/templates/${encodeURIComponent(templateName)}/attributes`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
      ])
      const images = await imagesRes.json()
      const attrs = await attrsRes.json()
      const annot = await annotRes.json()
      if (!imagesRes.ok || !attrsRes.ok || !annotRes.ok) {
        setStatus('Failed to load annotation data')
        return
      }
      const attributes = attrs.attributes ?? []
      const length =
        Math.max(0, ...attributes.flatMap((g) => g.indices)) + 1
      const filteredImages = batchFilter
        ? (images.images ?? []).filter((src) =>
            src.includes(`/imports/${batchFilter}/`),
          )
        : images.images ?? []
      const annotations = annot.annotations ?? {}
      setAttrAnnotate({
        dataset: name,
        template: templateName,
        batchFilter,
        images: filteredImages,
        attributes,
        length,
        annotations,
        attrIndex: 0,
        imgIndex: 0,
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const attrValuesFor = (image) => {
    if (!attrAnnotate) return []
    return (
      attrAnnotate.annotations[image] ?? Array(attrAnnotate.length).fill(0)
    )
  }

  const applyAttrValue = async (optionIndex, selected, advance = true) => {
    if (!attrAnnotate) return
    const image = attrAnnotate.images[attrAnnotate.imgIndex]
    const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
    const current = [...(attrAnnotate.annotations[image] ?? Array(attrAnnotate.length).fill(0))]
    if (group.type === 'single') {
      group.indices.forEach((idx) => {
        current[idx] = 0
      })
      if (selected && optionIndex >= 0) {
        current[group.indices[optionIndex]] = 1
      }
    } else if (optionIndex >= 0) {
      current[group.indices[optionIndex]] = selected ? 1 : 0
    }
    setAttrAnnotate((s) => ({
      ...s,
      annotations: { ...s.annotations, [image]: current },
    }))
    try {
      await fetch(`/api/datasets/${encodeURIComponent(attrAnnotate.dataset)}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, values: current }),
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
    if (advance && group.type === 'single') {
      attrNextImage()
    }
  }

  const attrNextImage = () => {
    if (!attrAnnotate) return
    const next = Math.min(attrAnnotate.imgIndex + 1, attrAnnotate.images.length - 1)
    setAttrAnnotate((s) => ({ ...s, imgIndex: next }))
  }

  const attrPrevImage = () => {
    if (!attrAnnotate) return
    const prev = Math.max(attrAnnotate.imgIndex - 1, 0)
    setAttrAnnotate((s) => ({ ...s, imgIndex: prev }))
  }

  const removeFromDatasetImage = async () => {
    setConfirmingRemoveAttrImage(false)
    if (!attrAnnotate) return
    const image = attrAnnotate.images[attrAnnotate.imgIndex]
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(attrAnnotate.dataset)}/images/remove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed image from dataset`)
      await refreshDataset(attrAnnotate.dataset)
      setAttrAnnotate((state) => {
        if (!state) return state
        const newImages = state.images.filter((s) => s !== image)
        const newAnnotations = { ...state.annotations }
        delete newAnnotations[image]
        if (newImages.length === 0) {
          return null
        }
        const nextIndex = Math.min(state.imgIndex, newImages.length - 1)
        return { ...state, images: newImages, annotations: newAnnotations, imgIndex: nextIndex }
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const removeDatasetBatch = async () => {
    setConfirmingRemoveDatasetBatch(false)
    if (!activeDataset || !datasetBatchToRemove) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/batches/${encodeURIComponent(datasetBatchToRemove)}/remove`,
        {
          method: 'POST',
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed ${data.removed} image${data.removed === 1 ? '' : 's'} from dataset`)
      await refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const annotateValuesFor = (image) => {
    if (!annotate) return []
    return annotate.annotations[image] ?? Array(annotate.length).fill(0)
  }

  const setAnnotateValue = (group, optionIndex, checked) => {
    setAnnotate((state) => {
      if (!state) return state
      const image = state.images[state.index]
      const current = [...(state.annotations[image] ?? Array(state.length).fill(0))]
      if (group.type === 'single') {
        group.indices.forEach((idx) => {
          current[idx] = 0
        })
        current[group.indices[optionIndex]] = 1
      } else {
        current[group.indices[optionIndex]] = checked ? 1 : 0
      }
      return {
        ...state,
        annotations: { ...state.annotations, [image]: current },
      }
    })
  }

  const saveAnnotation = async () => {
    if (!annotate) return
    const image = annotate.images[annotate.index]
    const values = annotateValuesFor(image)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(annotate.dataset)}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image, values }),
        },
      )
      if (!response.ok) {
        const data = await response.json()
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      } else {
        setStatus('Annotation saved')
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const requestRemoveImage = () => {
    if (!annotate) return
    setConfirmingRemoveImage(true)
  }

  const removeCurrentImage = async () => {
    setConfirmingRemoveImage(false)
    if (!annotate) return
    const image = annotate.images[annotate.index]
    try {
      const response = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [image] }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed image (${data.deleted} deleted)`)
      setDatasetImages((prev) => prev.filter((s) => s !== image))
      setDatasetAnnotations((prev) => {
        const next = { ...prev }
        delete next[image]
        return next
      })
      setAnnotate((state) => {
        if (!state) return state
        const newImages = state.images.filter((s) => s !== image)
        const newAnnotations = { ...state.annotations }
        delete newAnnotations[image]
        if (newImages.length === 0) {
          return null
        }
        const nextIndex = Math.min(state.index, newImages.length - 1)
        const nextValues = newAnnotations[newImages[nextIndex]] ?? Array(state.length).fill(0)
        return {
          ...state,
          images: newImages,
          annotations: newAnnotations,
          index: nextIndex,
          step: 0,
          optionIndex: initialOptionIndex(state.attributes[0], nextValues),
        }
      })
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const initialOptionIndex = (group, values) => {
    if (!group) return 0
    const selected = group.indices.findIndex((idx) => values[idx] === 1)
    return selected >= 0 ? selected : 0
  }

  const navigateAnnotate = async (delta) => {
    await saveAnnotation()
    setAnnotate((state) => {
      if (!state) return state
      const nextIndex = Math.min(
        Math.max(0, state.index + delta),
        state.images.length - 1,
      )
      const nextImage = state.images[nextIndex]
      const values = state.annotations[nextImage] ?? Array(state.length).fill(0)
      return {
        ...state,
        index: nextIndex,
        step: 0,
        optionIndex: initialOptionIndex(state.attributes[0], values),
      }
    })
  }

  const jumpAnnotate = async (index) => {
    await saveAnnotation()
    setAnnotate((state) => {
      if (!state) return state
      const nextImage = state.images[index]
      const values =
        state.annotations[nextImage] ?? Array(state.length).fill(0)
      return {
        ...state,
        index,
        step: 0,
        optionIndex: initialOptionIndex(state.attributes[0], values),
      }
    })
  }

  const optionNav = (delta) => {
    setAnnotate((state) => {
      if (!state) return state
      const group = state.attributes[state.step]
      if (!group) return state
      const next =
        (state.optionIndex + delta + group.options.length) %
        group.options.length
      return { ...state, optionIndex: next }
    })
  }

  const wizardToggle = () => {
    setAnnotate((state) => {
      if (!state) return state
      const group = state.attributes[state.step]
      if (!group) return state
      const image = state.images[state.index]
      const values = [...(state.annotations[image] ?? Array(state.length).fill(0))]
      const optionIdx = state.optionIndex
      const isSelected = values[group.indices[optionIdx]] === 1
      if (group.type === 'single') {
        if (isSelected) return state
        group.indices.forEach((idx) => {
          values[idx] = 0
        })
        values[group.indices[optionIdx]] = 1
      } else {
        values[group.indices[optionIdx]] = isSelected ? 0 : 1
      }
      return {
        ...state,
        annotations: { ...state.annotations, [image]: values },
      }
    })
  }

  const wizardStepOptionIndex = (step, values) => {
    return initialOptionIndex(annotate?.attributes?.[step], values)
  }

  const wizardNext = async () => {
    if (!annotate) return
    if (annotate.step < annotate.attributes.length - 1) {
      setAnnotate((state) => {
        if (!state) return state
        const nextStep = state.step + 1
        const image = state.images[state.index]
        const values = state.annotations[image] ?? Array(state.length).fill(0)
        return {
          ...state,
          step: nextStep,
          optionIndex: initialOptionIndex(state.attributes[nextStep], values),
        }
      })
    } else {
      await navigateAnnotate(1)
    }
  }

  const wizardPrev = async () => {
    if (!annotate) return
    if (annotate.step > 0) {
      setAnnotate((state) => {
        if (!state) return state
        const prevStep = state.step - 1
        const image = state.images[state.index]
        const values = state.annotations[image] ?? Array(state.length).fill(0)
        return {
          ...state,
          step: prevStep,
          optionIndex: initialOptionIndex(state.attributes[prevStep], values),
        }
      })
    } else {
      await navigateAnnotate(-1)
    }
  }

  const doSaveSplit = async () => {
    const total =
      Number(datasetSplit.train) +
      Number(datasetSplit.val) +
      Number(datasetSplit.test)
    if (total !== 100) {
      setStatus(`Split must sum to 100 (currently ${total})`)
      return
    }
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datasetSplit),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Saved split for ${activeDataset}`)
        setDatasetSplit(data.split)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doExportDataset = async () => {
    const total =
      Number(datasetSplit.train) +
      Number(datasetSplit.val) +
      Number(datasetSplit.test)
    if (total !== 100) {
      setStatus(`Split must sum to 100 (currently ${total})`)
      return
    }
    if (selectedExportBatches.length === 0) {
      setStatus('Select at least one batch to export')
      return
    }
    setExporting(true)
    setExportResult(null)
    setStatus(`Exporting ${activeDataset}...`)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/export`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            split: datasetSplit,
            format: exportFormat,
            batches: selectedExportBatches,
          }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        const total = data.counts.train + data.counts.val + data.counts.test
        const missing = data.missing_annotations ?? 0
        setStatus(
          `Exported ${activeDataset}: train ${data.counts.train}, val ${data.counts.val}, test ${data.counts.test}` +
            (missing > 0 ? ` — ${missing}/${total} images not annotated` : ''),
        )
        setExportResult(data)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setExporting(false)
    }
  }

  const doAssignBatch = async () => {
    if (!selectedBatch) return
    const name = newDatasetName.trim() || selectedDataset
    if (!name) {
      setStatus('Choose or enter a dataset name')
      return
    }
    if (newDatasetName.trim() && !datasets.some((d) => d.name === newDatasetName.trim())) {
      try {
        const response = await fetch('/api/datasets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newDatasetName.trim() }),
        })
        if (!response.ok) {
          const data = await response.json()
          setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
          return
        }
      } catch {
        setStatus('Failed: could not reach the server')
        return
      }
    }
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(name)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: selectedBatch }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(
          `Assigned ${data.batch} to ${data.dataset} as ${data.split}`,
        )
        setNewDatasetName('')
        setSelectedDataset('')
        setAssignOpen(false)
        fetchDatasets()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doAssignBatchToDataset = async () => {
    if (!activeDataset || !assignToDatasetBatch) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: assignToDatasetBatch }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Assigned ${data.batch} to ${data.dataset}`)
        setAssignToDatasetOpen(false)
        setAssignToDatasetBatch('')
        fetchDatasets()
        openDataset(activeDataset)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doCreateDataset = async () => {
    if (creatingDataset) return
    const name = createDatasetName.trim()
    if (!name) return
    setCreatingDataset(true)
    setCreateDatasetOpen(false)
    try {
      const createRes = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          template: createDatasetTemplate,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        setStatus(`Failed: ${createData.detail ?? 'Unknown error'}`)
        return
      }
      setCreateDatasetName('')
      setCreateDatasetTemplate('')
      setStatus(`Created dataset ${createData.dataset}`)
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setCreatingDataset(false)
    }
  }

  const openImportBatch = async () => {
    setImportBatchOpen(true)
    setSelectedImportBatches(new Set())
    try {
      const response = await fetch('/api/batches/covers')
      const data = await response.json()
      setAvailableBatches(data.batches ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doImportBatch = async () => {
    if (selectedImportBatches.size === 0) return
    setImportingBatch(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batches: Array.from(selectedImportBatches),
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Imported ${data.count} images into ${data.files.length} .txt files`)
      setImportBatchOpen(false)
      setSelectedImportBatches(new Set())
      fetchDatasets()
      refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setImportingBatch(false)
    }
  }

  const runPrelabel = async () => {
    if (!activeDataset) return
    setPrelabelConfirmOpen(false)
    setPreLabeling(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/prelabel`,
        { method: 'POST' },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Pre-labeled ${data.images} images`)
      openDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setPreLabeling(false)
    }
  }

  const doPrelabel = () => {
    if (!activeDataset) return
    const existing = datasetImages.filter(
      (src) => datasetAnnotations[src] !== undefined,
    )
    if (existing.length > 0) {
      setPrelabelConfirmCount(existing.length)
      setPrelabelConfirmOpen(true)
    } else {
      runPrelabel()
    }
  }

  const doDeleteBatch = async () => {
    if (!selectedBatch) return
    setStatus(`Deleting batch ${selectedBatch}...`)
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(selectedBatch)}`,
        { method: 'DELETE' },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Deleted batch ${selectedBatch}`)
        setSelectedBatch(null)
        setDeleteBatchConfirmOpen(false)
        fetchBatches()
        fetchImages()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  useEffect(() => {
    fetchVideos()
    fetchImages()
    fetchBatches()
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => setYoloClasses(d.classes ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchDatasets()
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedFilename) {
      fetchVideoImages(selectedFilename)
    } else {
      setVideoImages([])
    }
  }, [selectedFilename])

  useEffect(() => {
    if (!annotate) return
    const handleKey = (e) => {
      if (!annotate.wizardMode) {
        if (e.key === 'ArrowLeft') navigateAnnotate(-1)
        if (e.key === 'ArrowRight') navigateAnnotate(1)
        if (e.key === 'Escape') setAnnotate(null)
        return
      }
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)
      ) {
        e.preventDefault()
      }
      if (e.key === 'ArrowUp') optionNav(-1)
      if (e.key === 'ArrowDown') optionNav(1)
      if (e.key === 'ArrowLeft') wizardPrev()
      if (e.key === 'ArrowRight' || e.key === 'Enter') wizardNext()
      if (e.key === ' ') wizardToggle()
      if (e.key === 'Escape') setAnnotate(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [annotate])

  useEffect(() => {
    if (!attrAnnotate) return
    const handleKey = (e) => {
      const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
      if (!group) return
      if (e.key === 'Escape') {
        applyAttrValue(0, false, false)
        setAttrAnnotate(null)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        attrPrevImage()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        attrNextImage()
      }
      if (/^[1-9]$/.test(e.key)) {
        const i = parseInt(e.key, 10) - 1
        if (i >= 0 && i < group.options.length) {
          e.preventDefault()
          const current = attrValuesFor(attrAnnotate.images[attrAnnotate.imgIndex])
          const isOneOf = group.type === 'single'
          const newSelected = isOneOf ? true : current[group.indices[i]] !== 1
          applyAttrValue(i, newSelected)
        }
      }
      if (e.key === '0') {
        e.preventDefault()
        if (group.type === 'single') {
          applyAttrValue(-1, false)
        }
      }
      if (e.key === 'x' || e.key === 'X') {
        setConfirmingRemoveAttrImage(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [attrAnnotate])

  useEffect(() => {
    if (!attrAnnotate) return
    const el = attrStripRef.current?.querySelector('[data-active="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [attrAnnotate?.imgIndex])

  useEffect(() => {
    if (showExportPanel) {
      setSelectedExportBatches(datasetBatches)
      setExportResult(null)
    }
  }, [showExportPanel, datasetBatches])

  const handleFileChange = async (event) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (files.length === 0) return

    const uploaded = []
    const failed = []
    setStatus(`Uploading ${files.length} video${files.length === 1 ? '' : 's'}...`)
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const response = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json()
        if (response.ok) {
          uploaded.push(data.filename)
        } else {
          failed.push(`${file.name}: ${data.detail ?? 'Unknown error'}`)
        }
      } catch {
        failed.push(`${file.name}: could not reach server`)
      }
    }

    if (failed.length === 0) {
      setStatus(`Uploaded ${uploaded.length} video${uploaded.length === 1 ? '' : 's'}`)
    } else {
      setStatus(
        `Uploaded ${uploaded.length}, failed ${failed.length}: ${failed.join('; ')}`,
      )
    }
    if (uploaded.length > 0) fetchVideos()
    event.target.value = ''
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setStatus('Uploading image...')
    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        const batchLabel = data.batches?.length
          ? `batches ${data.batches.join(', ')}`
          : `batch ${data.batch}`
        setStatus(
          `Uploaded ${batchLabel}: ${data.image_count} images, ${data.video_count} videos`,
        )
        fetchVideos()
        fetchImages()
        fetchBatches()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50">
      <main className="min-w-0 flex-1 p-8">
        <header className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Dataset Collector
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activePage === 'raw_video'
                ? 'Upload videos and extract frames or crops'
                : activePage === 'raw_image'
                ? 'Upload TARs and curate imported, frames, and crops'
                : 'Organize batches and export datasets'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage('raw_video')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'raw_video'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Raw Video
            </button>
            <button
              type="button"
              onClick={() => setActivePage('raw_image')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'raw_image'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Raw Image
            </button>
            <button
              type="button"
              onClick={() => setActivePage('datasets')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'datasets'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Datasets
            </button>
          </div>
        </header>

        {activePage === 'raw_video' && (
          <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Videos</h2>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {videos.length}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                disabled={removeVideoMode}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <UploadIcon className="h-4 w-4" />
                Upload Video
              </button>
              {videos.length > 0 ? (
                !removeVideoMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveVideoMode(true)
                      setSelectedVideosToRemove(new Set())
                    }}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                  >
                    Remove videos
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveVideos(true)}
                      disabled={selectedVideosToRemove.size === 0}
                      className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Delete {selectedVideosToRemove.size} video{selectedVideosToRemove.size === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveVideoMode(false)
                        setSelectedVideosToRemove(new Set())
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                )
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain p-3">
            {videos.map((video) => (
              <VideoThumb
                key={video.filename}
                video={video}
                selected={selectedFilename === video.filename}
                removeMode={removeVideoMode}
                marked={selectedVideosToRemove.has(video.filename)}
                onSelect={() => setSelectedFilename(video.filename)}
                onToggleRemove={() =>
                  setSelectedVideosToRemove((prev) => {
                    const next = new Set(prev)
                    if (next.has(video.filename)) {
                      next.delete(video.filename)
                    } else {
                      next.add(video.filename)
                    }
                    return next
                  })
                }
              />
            ))}
            {videos.length === 0 && (
              <div className="flex w-full shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                No videos yet — click Upload Video
              </div>
            )}
          </div>

          {selectedFilename && (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <h3 className="text-base font-semibold text-slate-800">
                  Menu generate image
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1">
                    {[
                      { value: 'frames', label: 'Get frame' },
                      { value: 'crops', label: 'Get crop' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVideoMode(option.value)}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                          videoMode === option.value
                            ? 'bg-white text-indigo-600 shadow'
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {videoMode === 'crops' && (
                    <label className="text-xs font-medium text-slate-700">
                      Crop margin (px)
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={videoCropMargin}
                        onChange={(e) =>
                          setVideoCropMargin(
                            Math.min(200, Math.max(0, Number(e.target.value) || 0)),
                          )
                        }
                        className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                      />
                    </label>
                  )}

                  <label className="text-xs font-medium text-slate-700">
                    Frames / min
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={videoFramesPerMinute}
                      onChange={(e) =>
                        setVideoFramesPerMinute(
                          Math.min(60, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Confidence (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={videoConfidence}
                      onChange={(e) =>
                        setVideoConfidence(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  {(videoMode === 'frames' || videoMode === 'crops') && (
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-xs font-medium text-slate-700">
                        YOLO classes
                      </span>
                      <div className="flex w-full items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            const value = e.target.value
                            if (value && !videoSelectedClasses.includes(value)) {
                              setVideoSelectedClasses((prev) => [...prev, value])
                            }
                            e.target.value = ''
                          }}
                          className="w-48 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                        >
                          <option value="">Add a class</option>
                          {yoloClasses
                            .filter((cls) => !videoSelectedClasses.includes(cls))
                            .map((cls) => (
                              <option key={cls} value={cls}>
                                {cls}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={doVideoExtract}
                          disabled={videoExtracting || videoSelectedClasses.length === 0}
                          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {videoExtracting ? 'Extracting...' : 'Extract'}
                        </button>
                        {videoSelectedClasses.length > 0 ? (
                          <div className="ml-auto flex flex-wrap justify-end gap-2">
                            {videoSelectedClasses.map((cls) => (
                              <span
                                key={cls}
                                className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700"
                              >
                                {cls}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVideoSelectedClasses((prev) =>
                                      prev.filter((c) => c !== cls),
                                    )
                                  }
                                  className="text-indigo-700 hover:text-indigo-900"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Pick at least one class to extract
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-800">
                    Images (batch)
                  </h3>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedVideoBatch ?? ''}
                      onChange={(e) => setSelectedVideoBatch(e.target.value)}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 shadow-sm"
                    >
                      {Object.entries(videoImageGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([batch, images]) => (
                          <option key={batch} value={batch}>
                            Batch {batch} ({images.length})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveVideoBatch(true)}
                      disabled={!selectedVideoBatch}
                      className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Remove batch
                    </button>
                  </div>
                </div>

                {videoImages.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No extracted images yet.
                  </p>
                ) : selectedVideoBatch ? (
                  <div className="mt-4 grid grid-cols-6 gap-3">
                    {(videoImageGroups[selectedVideoBatch] ?? []).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() =>
                          setVideoModalIndex(videoImages.indexOf(src))
                        }
                        className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                      >
                        <img
                          src={`/api${src}`}
                          alt=""
                          className="aspect-video w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
        )}

        {activePage === 'raw_image' && (
        <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Raw Images</h2>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {rawSources.length}
            </span>
            <input
              ref={tarInputRef}
              type="file"
              accept=".tar,.tar.gz,.tgz,.tar.bz2,.tar.xz,.zip,.rar,.jpg,.jpeg,.png,.gif,.bmp,.webp"
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              disabled={removeRawMode}
              onClick={() => tarInputRef.current?.click()}
              className="ml-auto flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArchiveIcon className="h-4 w-4" />
              Upload Image
            </button>
            {rawSources.length > 0 ? (
              !removeRawMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveRawMode(true)
                    setSelectedRawsToRemove(new Set())
                  }}
                  className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                >
                  Remove raw images
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingRemoveRaws(true)}
                    disabled={selectedRawsToRemove.size === 0}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                  >
                    Delete {selectedRawsToRemove.size} raw image
                    {selectedRawsToRemove.size === 1 ? '' : 's'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveRawMode(false)
                      setSelectedRawsToRemove(new Set())
                    }}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </>
              )
            ) : null}
          </div>
          <div className="mt-4 flex max-w-full gap-3 overflow-x-auto overscroll-x-contain p-3">
            {rawSources.map(({ source, batch, previews }) => (
              <button
                key={source}
                type="button"
                onClick={() => {
                  if (removeRawMode) {
                    setSelectedRawsToRemove((prev) => {
                      const next = new Set(prev)
                      if (next.has(batch)) {
                        next.delete(batch)
                      } else {
                        next.add(batch)
                      }
                      return next
                    })
                  } else {
                    setSelectedRaw(source)
                    setImagePage(0)
                    fetchRawImages(batch)
                  }
                }}
                className={`group relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg shadow-sm transition hover:shadow-md ${
                  selectedRaw === source && !removeRawMode
                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
                    : ''
                } ${
                  selectedRawsToRemove.has(batch)
                    ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                    : ''
                }`}
              >
                <img
                  src={`/api${previews[0]}`}
                alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {removeRawMode && (
                  <div
                    className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ${
                      selectedRawsToRemove.has(batch)
                        ? 'bg-red-500 text-white'
                        : 'bg-white/50 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left text-xs font-medium text-white">
                  {source}
                </div>
              </button>
            ))}
          </div>
          {selectedRaw && (
            <div className="mt-6">
              <div className="flex items-baseline gap-3">
                <h3 className="text-base font-semibold text-slate-800">
                  {selectedRaw}
                </h3>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {selectedRawImages.length}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
                <h4 className="text-base font-semibold text-slate-800">
                  Menu generate image
                </h4>

                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <label className="text-xs font-medium text-slate-700">
                    Crop margin (px)
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={rawCropMargin}
                      onChange={(e) =>
                        setRawCropMargin(
                          Math.min(200, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="text-xs font-medium text-slate-700">
                    Confidence (%)
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rawConfidence}
                      onChange={(e) =>
                        setRawConfidence(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-1 block w-20 rounded border border-slate-300 bg-white px-1.5 py-1 text-xs text-slate-800"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={rawRemoveSource}
                      onChange={(e) => setRawRemoveSource(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                    />
                    Remove source batch after generate
                  </label>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-xs font-medium text-slate-700">
                      YOLO classes
                    </span>
                    <div className="flex w-full items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const value = e.target.value
                          if (value && !rawSelectedClasses.includes(value)) {
                            setRawSelectedClasses((prev) => [...prev, value])
                          }
                          e.target.value = ''
                        }}
                        className="w-48 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                      >
                        <option value="">Add a class</option>
                        {yoloClasses
                          .filter((cls) => !rawSelectedClasses.includes(cls))
                          .map((cls) => (
                            <option key={cls} value={cls}>
                              {cls}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={doGenerateRaw}
                        disabled={
                          rawGenerating || rawSelectedClasses.length === 0
                        }
                        className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                      >
                        {rawGenerating ? 'Generating...' : 'Generate'}
                      </button>
                      {rawSelectedClasses.length > 0 ? (
                        <div className="ml-auto flex flex-wrap justify-end gap-2">
                          {rawSelectedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700"
                            >
                              {cls}
                              <button
                                type="button"
                                onClick={() =>
                                  setRawSelectedClasses((prev) =>
                                    prev.filter((c) => c !== cls),
                                  )
                                }
                                className="text-indigo-700 hover:text-indigo-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Pick at least one class
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-6 gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
                {pageImages.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() =>
                      setModalIndex(imagePage * IMAGES_PER_PAGE + index)
                    }
                    className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                  >
                    <img
                      src={`/api${image}`}
                      alt=""
                      className="aspect-video w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
          {activeImages.length === 0 && (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
              No images yet
            </div>
          )}
          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setImagePage((p) => Math.max(0, p - 1))}
                disabled={imagePage === 0}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500">
                Page {imagePage + 1} of {pageCount} · {activeImages.length}{' '}
                images
              </span>
              <button
                type="button"
                onClick={() =>
                  setImagePage((p) => Math.min(pageCount - 1, p + 1))
                }
                disabled={imagePage >= pageCount - 1}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
          </div>
          )}
        </section>
        )}

        {activePage === 'datasets' && (
          <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex items-baseline gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Datasets</h2>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {datasets.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {!removeDatasetMode && !createDatasetOpen && (
                  <button
                    type="button"
                    disabled={creatingDataset}
                    onClick={() => {
                      setCreateDatasetOpen(true)
                      setCreateDatasetName('')
                      setCreateDatasetTemplate('')
                    }}
                    className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
                  >
                    {!creatingDataset && <PlusIcon className="h-4 w-4" />}
                    {creatingDataset ? 'Creating...' : 'New dataset'}
                  </button>
                )}
                {!removeDatasetMode && !createDatasetOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveDatasetMode(true)
                      setSelectedDatasetsToRemove(new Set())
                    }}
                    className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600"
                  >
                    Remove datasets
                  </button>
                )}
                {removeDatasetMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveDatasets(true)}
                      disabled={selectedDatasetsToRemove.size === 0}
                      className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-red-600 disabled:opacity-40"
                    >
                      Delete {selectedDatasetsToRemove.size} dataset{selectedDatasetsToRemove.size === 1 ? '' : 's'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveDatasetMode(false)
                        setSelectedDatasetsToRemove(new Set())
                      }}
                      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          {datasets.length === 0 ? (
            <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
              No datasets yet — assign a batch to create one
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-6 gap-3">
              {datasets.map((d) => (
                <div
                  key={d.name}
                  onClick={() => {
                    if (removeDatasetMode) {
                      setSelectedDatasetsToRemove((prev) => {
                        const next = new Set(prev)
                        if (next.has(d.name)) {
                          next.delete(d.name)
                        } else {
                          next.add(d.name)
                        }
                        return next
                      })
                    } else {
                      openDataset(d.name)
                    }
                  }}
                  className={`group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg shadow-sm transition hover:shadow-md ${
                    activeDataset === d.name && !removeDatasetMode
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
                      : ''
                  } ${
                    selectedDatasetsToRemove.has(d.name)
                      ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                      : ''
                  }`}
                >
                  {d.previews && d.previews.length > 0 ? (
                    <img
                      src={`/api${d.previews[0]}`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
                      No images
                    </div>
                  )}
                  {removeDatasetMode && (
                    <div
                      className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ${
                        selectedDatasetsToRemove.has(d.name)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/50 text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left">
                    <p className="truncate text-xs font-medium text-white">
                      {d.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-200">
                      {d.framework ? `${d.framework}` : 'No framework'}
                      {d.framework && d.model ? ` / ${d.model}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDataset && (() => {
            const filteredImages = datasetBatchFilter
              ? (datasetImageGroups[datasetBatchFilter] ?? [])
              : datasetImages
            const groups = datasetBatchFilter
              ? { [datasetBatchFilter]: filteredImages }
              : datasetImageGroups
            const annotatedCount = filteredImages.filter(
              (src) => datasetAnnotations[src] !== undefined,
            ).length
            const currentDataset = datasets.find((d) => d.name === activeDataset)
            const templatePath =
              currentDataset?.framework && currentDataset?.model
                ? `${currentDataset.framework}/${currentDataset.model}`.toLowerCase()
                : ''
            return (
            <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-800">
                  {activeDataset}
                </h2>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {annotatedCount} / {filteredImages.length} annotated
                </span>
                {datasetBatches.length > 0 && (
                  <select
                    value={datasetBatchFilter ?? ''}
                    onChange={(e) =>
                      setDatasetBatchFilter(
                        e.target.value === '' ? null : e.target.value,
                      )
                    }
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 outline-none"
                  >
                    <option value="">All batches</option>
                    {datasetBatches.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                )}
                {datasetBatchFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setDatasetBatchToRemove(datasetBatchFilter)
                      setConfirmingRemoveDatasetBatch(true)
                    }}
                    className="rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-500/20"
                  >
                    Remove from dataset
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <select
                    value=""
                    disabled={!templatePath || preLabeling}
                    onChange={(e) => {
                      const mode = e.target.value
                      e.target.value = ''
                      if (mode === 'prelabel') {
                        doPrelabel()
                      }
                      if (mode === 'attribute') {
                        openAttrAnnotate(activeDataset, templatePath)
                      }
                    }}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none disabled:opacity-40"
                  >
                    <option value="" disabled>
                      Label
                    </option>
                    <option value="prelabel">
                      {preLabeling ? 'Pre-labeling...' : 'Pre-label'}
                    </option>
                    <option value="attribute">Correct Attribute</option>
                  </select>
                  <button
                    type="button"
                    onClick={openImportBatch}
                    className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
                  >
                    Import batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportPanel(true)}
                    disabled={datasetBatches.length === 0}
                    className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                  >
                    Export dataset
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDataset('')}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                  >
                    ×
                  </button>
                </div>
              </div>

              {Object.keys(groups).length === 0 ? (
                <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                  No images in this dataset
                </div>
              ) : (
                Object.entries(groups).map(([batch, images]) => (
                  <div key={batch} className="mt-4">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">
                      {batch}
                    </h3>
                    <div className="grid grid-cols-6 gap-3">
                      {images.map((src) => {
                        const isAnnotated = datasetAnnotations[src] !== undefined
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() =>
                              setDatasetModalIndex(datasetImages.indexOf(src))
                            }
                            className={`relative block overflow-hidden rounded-lg shadow transition hover:shadow-lg ${
                              isAnnotated ? 'ring-2 ring-emerald-500' : ''
                            }`}
                          >
                            <img
                              src={`/api${src}`}
                              alt=""
                              className="aspect-video w-full object-cover"
                            />
                            {isAnnotated && (
                              <span className="absolute right-1 top-1 flex h-5 items-center gap-1 rounded-full bg-emerald-500 px-2 text-[10px] font-bold text-white shadow">
                                ✓ Annotated
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>
            )
          })()}
        </section>
        )}
      </main>

      <ImageModal
        images={activeImages}
        index={removeMode ? null : modalIndex}
        onClose={() => setModalIndex(null)}
        onNavigate={navigateModal}
        onSelect={setModalIndex}
      />

      <ImageModal
        images={videoImages}
        index={videoModalIndex}
        onClose={() => setVideoModalIndex(null)}
        onNavigate={navigateVideoModal}
        onSelect={setVideoModalIndex}
      />

      <ImageModal
        images={datasetImages}
        index={datasetModalIndex}
        onClose={() => setDatasetModalIndex(null)}
        onNavigate={navigateDatasetModal}
        onSelect={setDatasetModalIndex}
      />

      {attrAnnotate && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-4">
          <div className="relative flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-200/80 px-3 py-1.5 text-sm font-medium text-slate-800">
                  {attrAnnotate.dataset} · {attrAnnotate.imgIndex + 1} / {attrAnnotate.images.length}
                </span>
                <select
                  value={attrAnnotate.attrIndex}
                  onChange={(e) =>
                    setAttrAnnotate((s) => ({
                      ...s,
                      attrIndex: parseInt(e.target.value, 10),
                      imgIndex: 0,
                    }))
                  }
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none"
                >
                  {attrAnnotate.attributes.map((attr, i) => (
                    <option key={attr.name} value={i}>
                      {attr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Remove from dataset"
                  onClick={() => setConfirmingRemoveAttrImage(true)}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-red-500/80 px-3 text-sm font-medium text-white transition hover:bg-red-500"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttrAnnotate(null)
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300"
                >
                  ×
                </button>
              </div>
            </div>

            {attrAnnotate.images.length > 0 && (
              <div
                ref={attrStripRef}
                className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-slate-100/80 p-2"
              >
                {attrAnnotate.images.map((src, i) => {
                  const isAnnotated = attrAnnotate.annotations[src] !== undefined
                  return (
                    <button
                      key={src}
                      type="button"
                      data-active={i === attrAnnotate.imgIndex}
                      onClick={() =>
                        setAttrAnnotate((s) => ({ ...s, imgIndex: i }))
                      }
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === attrAnnotate.imgIndex
                          ? 'border-indigo-500'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      } ${isAnnotated ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <img
                        src={`/api${src}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {isAnnotated && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-1 overflow-hidden">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-100/80 p-2">
                {attrAnnotate.images[attrAnnotate.imgIndex] ? (
                  <img
                    src={`/api${attrAnnotate.images[attrAnnotate.imgIndex]}`}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <p className="text-slate-500">No image</p>
                )}
              </div>

              <div className="flex w-80 flex-col border-l border-slate-200 bg-slate-100/90 p-4">
                {(() => {
                  const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
                  const image = attrAnnotate.images[attrAnnotate.imgIndex]
                  const values = attrValuesFor(image)
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Press a number, then use ← → to move.
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        {group.options.map((option, i) => {
                          const selected = values[group.indices[i]] === 1
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                applyAttrValue(i, group.type === 'single' ? true : !selected)
                              }}
                              className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-700'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                selected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {i + 1}
                              </span>
                              {option}
                            </button>
                          )
                        })}
                        {group.type === 'single' && (
                          <button
                            type="button"
                            onClick={() => {
                              applyAttrValue(-1, false)
                            }}
                            className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              0
                            </span>
                            None
                          </button>
                        )}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100/80 px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  attrPrevImage()
                }}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-sm text-slate-800 transition hover:bg-slate-300"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => {
                  attrNextImage()
                }}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-sm text-slate-800 transition hover:bg-slate-300"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {annotate && (
        <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="relative z-10 flex items-center gap-3 border-b border-white/10 bg-black/50 px-4 py-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white">
                {annotate.dataset}{annotate.batchFilter ? ` (${annotate.batchFilter})` : ''} · {annotate.index + 1} / {annotate.images.length}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnnotate(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  ×
                </button>
              </div>
            </div>

            {annotate.images.length > 0 && (
              <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 bg-black/40 p-2">
                {annotate.images.map((src, i) => {
                  const isAnnotated = annotate.annotations[src] !== undefined
                  return (
                    <button
                      key={src}
                      type="button"
                      onClick={() => jumpAnnotate(i)}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        i === annotate.index
                          ? 'border-indigo-500'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      } ${isAnnotated ? 'ring-2 ring-emerald-500' : ''}`}
                    >
                      <img
                        src={`/api${src}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {isAnnotated && (
                        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
              {annotate.images.length === 0 ? (
                <p className="text-sm text-slate-400">No images to annotate</p>
              ) : (
                <img
                  src={`/api${annotate.images[annotate.index]}`}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => navigateAnnotate(-1)}
                disabled={annotate.index === 0}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => navigateAnnotate(1)}
                disabled={annotate.index >= annotate.images.length - 1}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
              >
                →
              </button>
            </div>
          </div>

          <div className="w-[28rem] shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                {annotate.wizardMode ? 'Wizard' : 'Attributes'} ({annotate.template})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setAnnotate((s) => ({ ...s, wizardMode: !s.wizardMode }))
                }
                className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
              >
                {annotate.wizardMode ? 'Freeform' : 'Wizard'}
              </button>
            </div>

            {annotate.wizardMode ? (
              <div className="mt-4">
                {(() => {
                  const group = annotate.attributes[annotate.step]
                  const values = annotateValuesFor(
                    annotate.images[annotate.index],
                  )
                  const isLast =
                    annotate.step === annotate.attributes.length - 1
                  return (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {annotate.step + 1} / {annotate.attributes.length}
                        </span>
                        <span className="uppercase tracking-wide">
                          {group.name}
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{
                            width: `${((annotate.step + 1) / annotate.attributes.length) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {group.options.map((option, i) => {
                          const selected =
                            values[group.indices[i]] === 1
                          const highlighted = i === annotate.optionIndex
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setAnnotate((s) => ({
                                  ...s,
                                  optionIndex: i,
                                }))
                                setAnnotateValue(group, i, true)
                              }}
                              className={`rounded-lg border px-3 py-2 text-left text-sm text-white transition ${
                                selected
                                  ? 'border-indigo-500 bg-indigo-600'
                                  : 'border-slate-600 bg-slate-800 hover:bg-slate-700'
                              } ${
                                highlighted
                                  ? 'ring-2 ring-indigo-400'
                                  : ''
                              }`}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={wizardPrev}
                          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-white transition hover:bg-slate-700"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          onClick={wizardNext}
                          className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-600"
                        >
                          {isLast ? 'Save & next image' : 'Next →'}
                        </button>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        ↑↓ move · Space toggle · → next · ← prev
                      </p>
                    </>
                  )
                })()}
              </div>
            ) : (
              <>
                <div className="mt-3 space-y-4">
                  {annotate.attributes.map((group) => {
                    const values = annotateValuesFor(
                      annotate.images[annotate.index],
                    )
                    return (
                      <div key={group.name}>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {group.name}
                        </h4>
                        <div className="mt-1.5 space-y-1">
                          {group.options.map((option, i) => (
                            <label
                              key={option}
                              className="flex items-center gap-2 text-sm text-white"
                            >
                              <input
                                type={
                                  group.type === 'single'
                                    ? 'radio'
                                    : 'checkbox'
                                }
                                name={
                                  group.type === 'single'
                                    ? group.name
                                    : undefined
                                }
                                checked={values[group.indices[i]] === 1}
                                onChange={(e) =>
                                  setAnnotateValue(group, i, e.target.checked)
                                }
                                className="accent-indigo-500"
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={saveAnnotation}
                  className="mt-4 w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-600"
                >
                  Save annotation
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {removeMode && removeIndex === null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm">
          <div className="relative z-30 flex items-center gap-4 border-b border-white/10 bg-black/50 px-6 py-3 backdrop-blur-md">
            <h2 className="text-base font-semibold text-white">
              Remove Mode — pick a starting image
            </h2>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setRemoveMode(false)}
              className="rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-6 gap-2">
              {activeImages.map((image, i) => (
                <img
                  key={image}
                  src={`/api${image}`}
                  alt=""
                  onClick={() => setRemoveIndex(i)}
                  className="aspect-video w-full cursor-pointer rounded object-cover opacity-60 shadow transition hover:opacity-100 hover:ring-2 hover:ring-indigo-400"
                />
              ))}
              {activeImages.length === 0 && (
                <p className="col-span-6 text-sm text-slate-400">
                  No images yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {removeMode && removeIndex !== null && (
        <RemoveModeModal
          images={activeImages}
          index={removeIndex}
          marked={markedForRemoval}
          onToggleMark={toggleMarked}
          onNavigate={(delta) =>
            setRemoveIndex(
              (i) =>
                (i + delta + activeImages.length) % activeImages.length,
            )
          }
          onSelect={setRemoveIndex}
          onClose={() => {
            setRemoveMode(false)
            setMarkedForRemoval(new Set())
          }}
          onDone={() => {
            if (markedForRemoval.size === 0) {
              setRemoveMode(false)
              return
            }
            setConfirmingDelete(true)
          }}
        />
      )}

      {confirmingDelete && (
        <ConfirmModal
          count={markedForRemoval.size}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={async () => {
            try {
              await fetch('/api/images/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths: [...markedForRemoval] }),
              })
              await fetchImages()
            } catch {
              setStatus('Failed: could not reach the server')
            }
            setConfirmingDelete(false)
            setRemoveMode(false)
            setMarkedForRemoval(new Set())
          }}
        />
      )}

      {confirmingRemoveImage && (
        <ConfirmModal
          count={1}
          onCancel={() => setConfirmingRemoveImage(false)}
          onConfirm={removeCurrentImage}
        />
      )}

      {confirmingRemoveAttrImage && (
        <ConfirmModal
          count={1}
          title="Remove from this dataset ?"
          message="This removes the image from the dataset list only. The original file will not be deleted."
          onCancel={() => setConfirmingRemoveAttrImage(false)}
          onConfirm={removeFromDatasetImage}
        />
      )}

      {confirmingRemoveDatasetBatch && (
        <ConfirmModal
          count={(datasetImageGroups[datasetBatchToRemove] ?? []).length}
          title={`Remove ${datasetBatchToRemove}?`}
          message="This removes all images in this batch from the dataset. The original files will not be deleted."
          onCancel={() => setConfirmingRemoveDatasetBatch(false)}
          onConfirm={removeDatasetBatch}
        />
      )}

      {confirmingRemoveVideos && (
        <ConfirmModal
          count={selectedVideosToRemove.size}
          title={`Delete ${selectedVideosToRemove.size} video${selectedVideosToRemove.size === 1 ? '' : 's'}?`}
          message="This will permanently remove the selected videos and all their extracted images. This action cannot be undone."
          onCancel={() => setConfirmingRemoveVideos(false)}
          onConfirm={doDeleteSelectedVideos}
        />
      )}

      {confirmingRemoveVideoBatch && (
        <ConfirmModal
          count={1}
          title="Remove batch?"
          message={`This will permanently remove ${selectedVideoBatch} and all its images. This action cannot be undone.`}
          onCancel={() => setConfirmingRemoveVideoBatch(false)}
          onConfirm={doRemoveVideoBatch}
        />
      )}

      {confirmingRemoveRaws && (
        <ConfirmModal
          count={selectedRawsToRemove.size}
          title={`Delete ${selectedRawsToRemove.size} raw image batch${selectedRawsToRemove.size === 1 ? '' : 'es'}?`}
          message="This will permanently remove the selected raw image batches and all their images. This action cannot be undone."
          onCancel={() => setConfirmingRemoveRaws(false)}
          onConfirm={doDeleteSelectedRaws}
        />
      )}

      {confirmingRemoveDatasets && (
        <ConfirmModal
          count={selectedDatasetsToRemove.size}
          title={`Delete ${selectedDatasetsToRemove.size} dataset${selectedDatasetsToRemove.size === 1 ? '' : 's'}?`}
          message="This will remove the selected datasets and their annotations. Batches and images will remain in Raw Image. This action cannot be undone."
          onCancel={() => setConfirmingRemoveDatasets(false)}
          onConfirm={doRemoveDatasets}
        />
      )}

      {prelabelConfirmOpen && (
        <ConfirmModal
          count={prelabelConfirmCount}
          title="Pre-label will overwrite annotations"
          message={`This dataset already has ${prelabelConfirmCount} annotated image${prelabelConfirmCount === 1 ? '' : 's'}. Running pre-label will overwrite them. Are you sure?`}
          onCancel={() => setPrelabelConfirmOpen(false)}
          onConfirm={runPrelabel}
          confirmLabel="Overwrite"
        />
      )}

      {showExportPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowExportPanel(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              Export {activeDataset}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Set the split ratio before exporting.
            </p>
            <div className="mt-4 flex justify-center gap-4">
              {['train', 'val', 'test'].map((key) => (
                <label
                  key={key}
                  className="flex flex-col items-center gap-1 text-sm font-medium text-slate-700"
                >
                  <span className="capitalize">{key}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={datasetSplit[key]}
                    onChange={(e) =>
                      setDatasetSplit((s) => ({
                        ...s,
                        [key]: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-16 rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-center text-sm text-slate-800"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="tar">tar</option>
                <option value="zip">zip</option>
                <option value="tar.gz">tar.gz</option>
                <option value="rar">rar</option>
              </select>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Batches
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedExportBatches(
                      selectedExportBatches.length === datasetBatches.length
                        ? []
                        : [...datasetBatches],
                    )
                  }
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {selectedExportBatches.length === datasetBatches.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                {datasetBatches.length === 0 && (
                  <p className="text-sm text-slate-500">No batches imported</p>
                )}
                {datasetBatches.map((batch) => (
                  <label
                    key={batch}
                    className="flex items-center gap-2 py-1 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExportBatches.includes(batch)}
                      onChange={(e) =>
                        setSelectedExportBatches((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, batch])]
                            : prev.filter((b) => b !== batch),
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="truncate" title={batch}>
                      {batch}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {exportResult && (
              <div className="mt-4 flex flex-col items-center gap-2 text-sm text-slate-600">
                <span>
                  train {exportResult.counts.train} / val {exportResult.counts.val} / test {exportResult.counts.test}
                </span>
                <a
                  href={`/api${exportResult.download}`}
                  className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/20"
                >
                  Download
                </a>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportPanel(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doExportDataset}
                disabled={exporting || selectedExportBatches.length === 0}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
              >
                {exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createDatasetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setCreateDatasetOpen(false)
            setCreateDatasetName('')
            setCreateDatasetTemplate('')
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">New Dataset</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter a name and pick a model template.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  value={createDatasetName}
                  onChange={(e) => setCreateDatasetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doCreateDataset()
                  }}
                  placeholder="my-dataset"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Model template
                </label>
                <select
                  value={createDatasetTemplate}
                  onChange={(e) => setCreateDatasetTemplate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">No template</option>
                  {Object.entries(
                    templates.reduce((acc, t) => {
                      const group = t.framework || 'Other'
                      if (!acc[group]) acc[group] = []
                      acc[group].push(t)
                      return acc
                    }, {}),
                  )
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([model, items]) => (
                      <optgroup key={model} label={model}>
                        {items.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateDatasetOpen(false)
                  setCreateDatasetName('')
                  setCreateDatasetTemplate('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doCreateDataset}
                disabled={!createDatasetName.trim() || creatingDataset}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
              >
                {creatingDataset ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {importBatchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setImportBatchOpen(false)
            setSelectedImportBatches(new Set())
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">Import Batch</h3>
            <p className="mt-1 text-sm text-slate-500">
              Pick raw-image or video batches to import into {activeDataset}.
            </p>
            <div className="mt-4">
              {availableBatches.length === 0 ? (
                <p className="text-sm text-slate-500">No batches available.</p>
              ) : (
                <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto p-1">
                  {availableBatches.map((batch) => {
                    const selected = selectedImportBatches.has(batch.name)
                    const imported = datasetBatches.includes(
                      batch.name.replace(/\//g, '_'),
                    )
                    return (
                      <button
                        key={batch.name}
                        type="button"
                        title={batch.name}
                        onClick={() =>
                          setSelectedImportBatches((prev) => {
                            const next = new Set(prev)
                            if (next.has(batch.name)) {
                              next.delete(batch.name)
                            } else {
                              next.add(batch.name)
                            }
                            return next
                          })
                        }
                        className={`group relative aspect-video w-full overflow-hidden rounded-lg border text-left shadow-sm transition hover:shadow-md ${
                          selected
                            ? 'border-indigo-500 ring-2 ring-indigo-500'
                            : 'border-slate-200'
                        }`}
                      >
                        {batch.cover ? (
                          <img
                            src={`/api${batch.cover}`}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                            No image
                          </div>
                        )}
                        <div className="absolute left-0 right-0 top-0 bg-black/70 px-2 py-1 text-left opacity-0 transition group-hover:opacity-100">
                          <p className="text-[10px] font-medium text-white">
                            {batch.name}
                          </p>
                        </div>
                        {imported && (
                          <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-sm font-bold text-white shadow">
                            ✓
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-left">
                          <p className="truncate text-[10px] font-medium text-white">
                            {batch.name}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportBatchOpen(false)
                  setSelectedImportBatches(new Set())
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doImportBatch}
                disabled={selectedImportBatches.size === 0 || importingBatch}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
              >
                {importingBatch ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignToDatasetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setAssignToDatasetOpen(false)
            setAssignToDatasetBatch('')
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800">
              Assign batch to {activeDataset}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select an import or video-extracted batch to add.
            </p>
            <div className="mt-4">
              {batches.length === 0 ? (
                <p className="text-sm text-slate-500">No batches available.</p>
              ) : (
                <select
                  value={assignToDatasetBatch}
                  onChange={(e) => setAssignToDatasetBatch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignToDatasetOpen(false)
                  setAssignToDatasetBatch('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doAssignBatchToDataset}
                disabled={!assignToDatasetBatch || batches.length === 0}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
