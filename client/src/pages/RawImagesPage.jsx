import { useEffect, useMemo, useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import ImageModal from '../components/ImageModal'
import SkeletonImg from '../components/SkeletonImg'
import SkeletonGrid from '../components/SkeletonGrid'
import SourceModal from '../components/SourceModal'
import UploadSourceModal from '../components/UploadSourceModal'
import { ArchiveIcon } from '../components/icons'
import { useAppData } from '../context/AppDataContext'

const IMAGES_PER_PAGE = 50

export default function RawImagesPage() {
  const {
    setStatus,
    batches,
    yoloClasses,
    sources,
    fetchBatches,
    createSource,
    deleteSource,
  } = useAppData()

  const tarInputRef = useRef(null)
  const [selectedRaw, setSelectedRaw] = useState(null)
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [selectedRawImages, setSelectedRawImages] = useState([])
  const [rawImagesLoading, setRawImagesLoading] = useState(false)
  const [rawSelectedClasses, setRawSelectedClasses] = useState([])
  const [rawConfidence, setRawConfidence] = useState(70)
  const [rawCropMargin, setRawCropMargin] = useState(0)
  const [rawRemoveSource, setRawRemoveSource] = useState(false)
  const [rawGenerating, setRawGenerating] = useState(false)
  const [removeRawMode, setRemoveRawMode] = useState(false)
  const [selectedRawsToRemove, setSelectedRawsToRemove] = useState(new Set())
  const [confirmingRemoveRaws, setConfirmingRemoveRaws] = useState(false)
  const [modalIndex, setModalIndex] = useState(null)
  const [imagePage, setImagePage] = useState(0)
  const [rawImagesTotal, setRawImagesTotal] = useState(0)
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [uploadSourceId, setUploadSourceId] = useState('')
  const [uploadSourceOpen, setUploadSourceOpen] = useState(false)

  const activeImages = selectedRawImages

  const rawSources = useMemo(() => {
    return (batches ?? [])
      .map((b) => (typeof b === 'string' ? { name: b } : b))
      .map((b) => {
        const source = b.name.split('/').pop()
        return {
          id: b.id,
          source,
          batch: b.name,
          previews: b.cover ? [b.cover] : [],
          count: b.count,
          type: b.type,
          sourceInfo: b.source && typeof b.source === 'object' ? b.source : null,
        }
      })
      .sort((a, b) => a.source.localeCompare(b.source))
  }, [batches])

  const rawSourceGroups = useMemo(() => {
    const groups = []
    const byKey = {}
    for (const r of rawSources) {
      const key = r.sourceInfo ? `s-${r.sourceInfo.id}` : 'untagged'
      if (!byKey[key]) {
        byKey[key] = {
          key,
          label: r.sourceInfo
            ? `${r.sourceInfo.name} · v${r.sourceInfo.version}`
            : 'Untagged',
          items: [],
        }
        groups.push(byKey[key])
      }
      byKey[key].items.push(r)
    }
    groups.sort((a, b) => {
      if (a.key === 'untagged') return 1
      if (b.key === 'untagged') return -1
      return a.label.localeCompare(b.label)
    })
    return groups
  }, [rawSources])

  const selectedRawInfo = useMemo(
    () => rawSources.find((r) => r.source === selectedRaw) ?? null,
    [rawSources, selectedRaw],
  )

  const totalForPaging = rawImagesTotal
  const pageCount = Math.max(1, Math.ceil(totalForPaging / IMAGES_PER_PAGE))
  const pageImages = activeImages

  const navigateModal = (delta) => {
    setModalIndex((i) =>
      i === null
        ? null
        : (i + delta + activeImages.length) % activeImages.length,
    )
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
      setSelectedBatchId(null)
      setSelectedRawImages([])
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
        fetchBatches()
        if (selectedBatchId) {
          fetchRawImages(selectedBatchId)
        }
      } else {
        setStatus(`Failed: ${data.detail ?? 'Generation failed'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRawGenerating(false)
    }
  }

  const fetchRawImages = async (batchId, page = imagePage) => {
    setRawImagesLoading(true)
    try {
      const response = await fetch(
        `/api/images?id=${encodeURIComponent(batchId)}&page=${page}&limit=${IMAGES_PER_PAGE}`,
      )
      const data = await response.json()
      setSelectedRawImages(data.images ?? [])
      setRawImagesTotal(data.total ?? data.images?.length ?? 0)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRawImagesLoading(false)
    }
  }

  useEffect(() => {
    if (selectedBatchId !== null) {
      fetchRawImages(selectedBatchId, imagePage)
    }
  }, [selectedBatchId, imagePage])

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    if (uploadSourceId) {
      formData.append('source_id', uploadSourceId)
    }

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
        setStatus(`Uploaded ${batchLabel}: ${data.image_count} images`)
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
    <>
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
            onClick={() => setSourceModalOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-40"
          >
            Sources
          </button>
          <button
            type="button"
            disabled={removeRawMode}
            onClick={() => setUploadSourceOpen(true)}
            className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  onClick={() =>
                    selectedRawsToRemove.size === rawSources.length
                      ? setSelectedRawsToRemove(new Set())
                      : setSelectedRawsToRemove(new Set(rawSources.map((r) => r.batch)))
                  }
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  {selectedRawsToRemove.size === rawSources.length ? 'Deselect all' : 'Select all'}
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
        <div className="mt-4 max-w-full space-y-4">
          {rawSourceGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-1.5 flex items-baseline gap-2 px-1">
                <span
                  className={`text-xs font-semibold ${
                    group.key === 'untagged'
                      ? 'text-slate-400'
                      : 'text-indigo-600'
                  }`}
                >
                  {group.label}
                </span>
                <span className="text-[10px] text-slate-400">
                  {group.items.length} batch
                  {group.items.length === 1 ? '' : 'es'}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto overscroll-x-contain p-1.5">
                {group.items.map(
                  ({ id, source, batch, previews, count, sourceInfo }) => (
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
                  setSelectedBatchId(id)
                  setSelectedRawImages([])
                  setRawImagesLoading(id !== null && id !== undefined)
                  setImagePage(0)
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
              {sourceInfo && (
                <div className="absolute left-1.5 top-1.5 rounded bg-indigo-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                  {sourceInfo.name} · v{sourceInfo.version}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1 text-left text-xs font-medium text-white">
                <span className="truncate">{source}</span>
                {count != null && (
                  <span className="shrink-0 text-[10px] text-white/70">
                    {count}
                  </span>
                )}
              </div>
            </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
        {rawSourceGroups.length === 0 && (
          <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
            No batches yet — upload images to get started
          </div>
        )}
        {selectedRaw && (
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-slate-800">
                {selectedRaw}
              </h3>
              <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {selectedRawImages.length} images
              </span>
              {selectedRawInfo?.type && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {selectedRawInfo.type}
                </span>
              )}
              {selectedRawInfo?.sourceInfo && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                  {selectedRawInfo.sourceInfo.name} · v
                  {selectedRawInfo.sourceInfo.version}
                </span>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Generate crops
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Detect objects in this batch and crop them into a new
                    batch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={doGenerateRaw}
                  disabled={
                    rawGenerating || rawSelectedClasses.length === 0
                  }
                  className="shrink-0 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                >
                  {rawGenerating ? 'Generating...' : 'Generate'}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
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

                <label className="flex items-center gap-2 pb-1.5 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={rawRemoveSource}
                    onChange={(e) => setRawRemoveSource(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-500"
                  />
                  Remove source batch after generate
                </label>
              </div>

              <div className="mt-4 border-t border-slate-200/70 pt-4">
                <span className="text-xs font-medium text-slate-700">
                  YOLO classes
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
                  {rawSelectedClasses.length > 0 ? (
                    rawSelectedClasses.map((cls) => (
                      <span
                        key={cls}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                      >
                        {cls}
                        <button
                          type="button"
                          onClick={() =>
                            setRawSelectedClasses((prev) =>
                              prev.filter((c) => c !== cls),
                            )
                          }
                          className="text-indigo-500 transition hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Pick at least one class
                    </span>
                  )}
                </div>
              </div>
            </div>

            {rawImagesLoading && activeImages.length === 0 ? (
              <div className="mt-4">
                <SkeletonGrid count={12} />
              </div>
            ) : (
            <div className="mt-4 grid grid-cols-6 gap-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
              {pageImages.map((image, index) => (
                <button
                  key={image.id ?? image}
                  type="button"
                  onClick={() =>
                    setModalIndex(index)
                  }
                  className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                >
                  <SkeletonImg
                    src={`/api${image.path ?? image}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-video w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
            )}
        {activeImages.length === 0 && !rawImagesLoading && (
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
              Page {imagePage + 1} of {pageCount} · {totalForPaging}{' '}
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

      <ImageModal
        images={activeImages}
        index={modalIndex}
        onClose={() => setModalIndex(null)}
        onNavigate={navigateModal}
        onSelect={setModalIndex}
      />

      {confirmingRemoveRaws && (
        <ConfirmModal
          count={selectedRawsToRemove.size}
          title={`Delete ${selectedRawsToRemove.size} raw image batch${selectedRawsToRemove.size === 1 ? '' : 'es'}?`}
          message="This will permanently remove the selected raw image batches and all their images. This action cannot be undone."
          onCancel={() => setConfirmingRemoveRaws(false)}
          onConfirm={doDeleteSelectedRaws}
        />
      )}

      {uploadSourceOpen && (
        <UploadSourceModal
          sources={sources}
          selectedId={uploadSourceId}
          onSelect={setUploadSourceId}
          onCreateSource={createSource}
          onContinue={() => {
            setUploadSourceOpen(false)
            tarInputRef.current?.click()
          }}
          onClose={() => setUploadSourceOpen(false)}
        />
      )}

      {sourceModalOpen && (
        <SourceModal
          sources={sources}
          onCreateSource={createSource}
          onDeleteSource={deleteSource}
          onClose={() => setSourceModalOpen(false)}
        />
      )}
    </>
  )
}
