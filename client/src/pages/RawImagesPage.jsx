import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import GenerateCropsModal from '../components/GenerateCropsModal'
import ImageModal from '../components/ImageModal'
import SkeletonImg from '../components/SkeletonImg'
import SkeletonGrid from '../components/SkeletonGrid'
import SourceModal from '../components/SourceModal'
import SplitBatchModal from '../components/SplitBatchModal'
import UploadSourceModal from '../components/UploadSourceModal'
import { ArchiveIcon } from '../components/icons'
import { useAppData } from '../context/AppDataContext'
import {
  DATASET_PAGE_LIMIT,
  GRID_COLS,
  GRID_COL_OPTIONS,
  MASONRY_COLS,
  pollJob,
  useLocalStorage,
} from '../utils'

export default function RawImagesPage() {
  const {
    setStatus,
    batches,
    yoloClasses,
    sources,
    datasets,
    fetchBatches,
    createSource,
    deleteSource,
  } = useAppData()

  const navigate = useNavigate()
  const { batch: batchSlug } = useParams()

  const tarInputRef = useRef(null)
  const [selectedRawImages, setSelectedRawImages] = useState([])
  const [rawImagesLoading, setRawImagesLoading] = useState(false)
  const [rawGenerating, setRawGenerating] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [removeRawMode, setRemoveRawMode] = useState(false)
  const [selectedRawsToRemove, setSelectedRawsToRemove] = useState(new Set())
  const [confirmingRemoveRaws, setConfirmingRemoveRaws] = useState(false)
  const [deletingRaws, setDeletingRaws] = useState(false)
  const [modalIndex, setModalIndex] = useState(null)
  const [rawImagesTotal, setRawImagesTotal] = useState(0)
  const [loadingMoreRaws, setLoadingMoreRaws] = useState(false)
  const rawImagesInFlightRef = useRef(false)
  const rawImagesSentinelRef = useRef(null)
  const [rawImageSelectMode, setRawImageSelectMode] = useState(false)
  const [selectedRawImageIds, setSelectedRawImageIds] = useState(new Set())
  const [confirmingDeleteRawImages, setConfirmingDeleteRawImages] = useState(false)
  const [deletingRawImages, setDeletingRawImages] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)
  const [splittingBatch, setSplittingBatch] = useState(false)
  const [splitProgress, setSplitProgress] = useState(null)
  const [tagsMenuOpen, setTagsMenuOpen] = useState(false)
  const tagsMenuRef = useRef(null)
  // marquee (drag) selection — same mechanics as the dataset grid
  const rawGridRef = useRef(null)
  const rawMarqueeRef = useRef(null) // {sx, sy, cards, didDrag, hits} in page coords
  const suppressRawClickRef = useRef(false)
  const [rawMarqueeRect, setRawMarqueeRect] = useState(null)
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [uploadSourceId, setUploadSourceId] = useState('')
  const [uploadSourceOpen, setUploadSourceOpen] = useState(false)
  const [batchFilter, setBatchFilter] = useState('')
  const [inUseOnly, setInUseOnly] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [gridMode, setGridMode] = useLocalStorage('raw-grid-mode', 'landscape')
  // per-mode column counts so each layout keeps its own density
  const [gridCols, setGridCols] = useLocalStorage('raw-grid-cols', {
    landscape: 6,
    portrait: 8,
    natural: 6,
  })

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
          preview: b.cover,
          count: b.count,
          type: b.type,
          sourceInfo: b.source && typeof b.source === 'object' ? b.source : null,
        }
      })
  }, [batches])

  // batch name ("raw-images/X") -> ["dataset-a", ...]; dataset.batches stores
  // the same names with "/" replaced by "_"
  const datasetsByBatch = useMemo(() => {
    const map = {}
    for (const d of datasets ?? []) {
      for (const b of d.batches ?? []) {
        ;(map[b] ??= []).push(d.name)
      }
    }
    return map
  }, [datasets])

  const datasetsForBatch = (batch) =>
    datasetsByBatch[batch.replaceAll('/', '_')] ?? []

  const rawSourceGroups = useMemo(() => {
    const needle = batchFilter.trim().toLowerCase()
    const groups = []
    const byKey = {}
    for (const r of rawSources) {
      if (needle && !r.batch.toLowerCase().includes(needle)) continue
      if (inUseOnly && datasetsForBatch(r.batch).length === 0) continue
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
    for (const g of groups) {
      g.items.sort((a, b) => a.source.localeCompare(b.source))
    }
    return groups
  }, [rawSources, batchFilter, inUseOnly, datasetsByBatch])

  const selectedRawInfo = useMemo(
    () => rawSources.find((r) => r.source === batchSlug) ?? null,
    [rawSources, batchSlug],
  )
  const selectedBatchId = selectedRawInfo?.id ?? null
  const selectedRaw = selectedRawInfo?.source ?? null

  const affectedDatasets = useMemo(() => {
    const byDataset = {}
    for (const batch of selectedRawsToRemove) {
      for (const ds of datasetsForBatch(batch)) {
        ;(byDataset[ds] ??= []).push(batch.split('/').pop())
      }
    }
    return Object.entries(byDataset).sort(([a], [b]) => a.localeCompare(b))
  }, [selectedRawsToRemove, datasetsByBatch])

  const rawImagesHasMore = activeImages.length < rawImagesTotal

  const navigateModal = (delta) => {
    setModalIndex((i) =>
      i === null
        ? null
        : (i + delta + activeImages.length) % activeImages.length,
    )
  }

  const openBatch = (source) => {
    if (source === batchSlug) return
    setSelectedRawImages([])
    setModalIndex(null)
    setRawImageSelectMode(false)
    setSelectedRawImageIds(new Set())
    setTagsMenuOpen(false)
    navigate(`/raw-images/${encodeURIComponent(source)}`)
  }

  const toggleRawImageSelect = (id) => {
    setSelectedRawImageIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const onRawGridPointerDown = (e) => {
    if (!rawImageSelectMode || e.button !== 0) return
    // let real buttons (sentinel, etc.) work normally — image cards are
    // <button data-img-id> and stay marquee-capable
    if (e.target.closest('button:not([data-img-id])')) return
    const sx = e.clientX + window.scrollX
    const sy = e.clientY + window.scrollY
    const cards = [
      ...rawGridRef.current.querySelectorAll('[data-img-id]'),
    ].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        el,
        id: el.dataset.imgId,
        l: r.left + window.scrollX,
        t: r.top + window.scrollY,
        r: r.right + window.scrollX,
        b: r.bottom + window.scrollY,
      }
    })
    rawMarqueeRef.current = { sx, sy, cards, didDrag: false, hits: new Set() }
    window.addEventListener('pointermove', onRawGridPointerMove)
    window.addEventListener('pointerup', onRawGridPointerUp, { once: true })
    window.addEventListener('pointercancel', onRawGridPointerUp, { once: true })
  }

  const onRawGridPointerMove = (e) => {
    const st = rawMarqueeRef.current
    if (!st) return
    const cx = e.clientX + window.scrollX
    const cy = e.clientY + window.scrollY
    if (!st.didDrag && Math.hypot(cx - st.sx, cy - st.sy) < 5) return
    st.didDrag = true
    const l = Math.min(st.sx, cx)
    const t = Math.min(st.sy, cy)
    const r = Math.max(st.sx, cx)
    const b = Math.max(st.sy, cy)
    const cr = rawGridRef.current.getBoundingClientRect()
    setRawMarqueeRect({
      left: l - (cr.left + window.scrollX),
      top: t - (cr.top + window.scrollY),
      width: r - l,
      height: b - t,
    })
    for (const c of st.cards) {
      const hit = c.l < r && c.r > l && c.t < b && c.b > t
      if (hit && !st.hits.has(c.id)) {
        st.hits.add(c.id)
        c.el.style.outline = '2px solid #818cf8'
        c.el.style.outlineOffset = '-2px'
      } else if (!hit && st.hits.has(c.id)) {
        st.hits.delete(c.id)
        c.el.style.outline = ''
      }
    }
  }

  const onRawGridPointerUp = () => {
    window.removeEventListener('pointermove', onRawGridPointerMove)
    window.removeEventListener('pointercancel', onRawGridPointerUp)
    const st = rawMarqueeRef.current
    rawMarqueeRef.current = null
    setRawMarqueeRect(null)
    if (!st) return
    for (const c of st.cards) c.el.style.outline = ''
    if (!st.didDrag) return
    // eat the click that follows this same gesture, but only that one
    suppressRawClickRef.current = true
    setTimeout(() => {
      suppressRawClickRef.current = false
    }, 0)
    if (st.hits.size) {
      setSelectedRawImageIds((prev) => {
        const next = new Set(prev)
        for (const id of st.hits) {
          const n = Number(id)
          next.add(Number.isNaN(n) ? id : n)
        }
        return next
      })
    }
  }

  const onRawGridClickCapture = (e) => {
    if (suppressRawClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const doDeleteSelectedRawImages = async () => {
    if (selectedRawImageIds.size === 0) return
    setConfirmingDeleteRawImages(false)
    setDeletingRawImages(true)
    const ids = [...selectedRawImageIds]
    try {
      setStatus(`Deleting ${ids.length} image${ids.length === 1 ? '' : 's'}...`)
      const response = await fetch('/api/images/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      if (data.job_id) {
        const job = await pollJob(data.job_id, {
          onProgress: (j) =>
            setStatus(`Deleting images — ${j.done}/${j.total}`),
        })
        if (job.status === 'error') {
          setStatus(`Failed: ${job.error ?? 'Delete job failed'}`)
        } else {
          setStatus(`Deleted ${job.detail?.deleted ?? job.done} images`)
        }
      }
      setSelectedRawImages((prev) => prev.filter((img) => !selectedRawImageIds.has(img.id)))
      setRawImagesTotal((t) => Math.max(0, t - ids.length))
      setSelectedRawImageIds(new Set())
      setRawImageSelectMode(false)
      fetchBatches()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setDeletingRawImages(false)
    }
  }

  const doSplitBatch = async (chunkSize) => {
    if (!selectedRaw || splittingBatch) return
    setSplittingBatch(true)
    setSplitProgress({ done: 0, total: rawImagesTotal })
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(`raw-images/${selectedRaw}`)}/split`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chunk_size: chunkSize }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      const job = await pollJob(data.job_id, {
        onProgress: (j) => setSplitProgress({ done: j.done, total: j.total }),
      })
      if (job.status === 'error') {
        setStatus(`Failed: ${job.error ?? 'Split job failed'}`)
      } else {
        setStatus(
          `Split ${selectedRaw} into ${data.parts.length} batches of up to ${chunkSize} images`,
        )
        setSplitOpen(false)
        navigate('/raw-images')
      }
      fetchBatches()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setSplittingBatch(false)
      setSplitProgress(null)
    }
  }

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Groups start collapsed by default — only runs once, the first time
  // groups become available, so it never re-collapses something the user
  // already opened. The group containing a deep-linked batch (e.g. from a
  // direct URL) stays expanded so the selection is visible.
  const groupsInitRef = useRef(false)
  useEffect(() => {
    if (groupsInitRef.current || rawSourceGroups.length === 0) return
    groupsInitRef.current = true
    const activeGroupKey = rawSourceGroups.find((g) =>
      g.items.some((item) => item.source === batchSlug),
    )?.key
    setCollapsedGroups(
      new Set(
        rawSourceGroups
          .map((g) => g.key)
          .filter((key) => key !== activeGroupKey),
      ),
    )
  }, [rawSourceGroups, batchSlug])

  useEffect(() => {
    if (!tagsMenuOpen) return
    const handleClick = (e) => {
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(e.target)) {
        setTagsMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [tagsMenuOpen])

  const doDeleteSelectedRaws = async () => {
    if (selectedRawsToRemove.size === 0) return
    setConfirmingRemoveRaws(false)
    setDeletingRaws(true)
    let deleted = 0
    let failed = 0
    const batchList = [...selectedRawsToRemove]
    let batchIndex = 0
    for (const batch of batchList) {
      batchIndex += 1
      const label = batch.split('/').pop()
      try {
        setStatus(`Deleting ${label} (${batchIndex}/${batchList.length})...`)
        const response = await fetch(
          `/api/batches/${encodeURIComponent(batch)}`,
          { method: 'DELETE' },
        )
        const data = await response.json()
        if (!response.ok) {
          failed += 1
          continue
        }
        if (data.job_id) {
          const job = await pollJob(data.job_id, {
            onProgress: (j) =>
              setStatus(
                `Deleting ${label} (${batchIndex}/${batchList.length}) — ${j.done}/${j.total || '?'}`,
              ),
          })
          if (job.status === 'error') {
            failed += 1
            continue
          }
        }
        deleted += 1
      } catch {
        failed += 1
      }
    }
    setDeletingRaws(false)
    if (deleted > 0) {
      setSelectedRawImages([])
      fetchBatches()
      if (
        selectedRawInfo &&
        selectedRawsToRemove.has(selectedRawInfo.batch)
      ) {
        navigate('/raw-images')
      }
    }
    setSelectedRawsToRemove(new Set())
    setRemoveRawMode(false)
    if (failed === 0) {
      setStatus(`Deleted ${deleted} raw image batch${deleted === 1 ? '' : 'es'}`)
    } else {
      setStatus(`Deleted ${deleted}, failed ${failed}`)
    }
  }

  const doGenerateRaw = async ({ margin, classes, confidence, removeSource }) => {
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
            margin,
            classes,
            confidence,
            remove_source: removeSource,
          }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Generated ${data.count} images`)
        setGenerateOpen(false)
        fetchBatches()
      } else {
        setStatus(`Failed: ${data.detail ?? 'Generation failed'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRawGenerating(false)
    }
  }

  // Infinite scroll, same pattern as DatasetBatchSection: `replace` reloads
  // from page 0 (new batch selected), otherwise appends the next page.
  const fetchRawImages = async (batchId, page, replace) => {
    if (rawImagesInFlightRef.current && !replace) return
    rawImagesInFlightRef.current = true
    if (replace) setRawImagesLoading(true)
    else setLoadingMoreRaws(true)
    try {
      const response = await fetch(
        `/api/images?id=${encodeURIComponent(batchId)}&page=${page}&limit=${DATASET_PAGE_LIMIT}`,
      )
      const data = await response.json()
      setSelectedRawImages((prev) =>
        replace ? (data.images ?? []) : [...prev, ...(data.images ?? [])],
      )
      setRawImagesTotal(data.total ?? data.images?.length ?? 0)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      rawImagesInFlightRef.current = false
      setRawImagesLoading(false)
      setLoadingMoreRaws(false)
    }
  }

  useEffect(() => {
    if (selectedBatchId !== null) {
      fetchRawImages(selectedBatchId, 0, true)
    } else {
      setSelectedRawImages([])
      setRawImagesTotal(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId])

  // auto-load the next page when the sentinel scrolls near the viewport
  useEffect(() => {
    const el = rawImagesSentinelRef.current
    if (!el || !rawImagesHasMore || rawImagesLoading || selectedBatchId === null) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchRawImages(
            selectedBatchId,
            Math.floor(selectedRawImages.length / DATASET_PAGE_LIMIT),
            false,
          )
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawImagesHasMore, rawImagesLoading, selectedRawImages.length, selectedBatchId])

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

  const selectedDatasets = selectedRawInfo
    ? datasetsForBatch(selectedRawInfo.batch)
    : []

  return (
    <section className="relative z-20 mt-6 flex min-h-0 min-w-0 flex-1 gap-4">
      {/* ---- sidebar: sources → batches ---- */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-slate-200/70 p-3">
          <h2 className="text-sm font-semibold text-slate-800">Raw Images</h2>
          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {rawSources.length}
          </span>
        </div>
        <div className="flex items-center gap-2 border-b border-slate-200/70 p-2">
          <input
            type="text"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            placeholder="Filter batches..."
            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setInUseOnly((v) => !v)}
            title="Only show batches used by a dataset"
            className={`shrink-0 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition ${
              inUseOnly
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100'
            }`}
          >
            In use
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {rawSourceGroups.map((group) => {
            const collapsed = collapsedGroups.has(group.key)
            return (
              <div key={group.key} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  <span
                    className={`text-[9px] text-slate-400 transition-transform ${
                      collapsed ? '-rotate-90' : ''
                    }`}
                  >
                    ▼
                  </span>
                  <span
                    className={
                      group.key === 'untagged'
                        ? 'text-slate-400'
                        : 'text-indigo-600'
                    }
                  >
                    {group.label}
                  </span>
                  <span className="ml-auto text-[10px] font-normal text-slate-400">
                    {group.items.length}
                  </span>
                </button>
                {!collapsed &&
                  group.items.map(({ id, source, batch, count, type }) => {
                    const linked = datasetsForBatch(batch)
                    const active = source === batchSlug
                    const checked = selectedRawsToRemove.has(batch)
                    return (
                      <div
                        key={batch}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (removeRawMode) {
                            setSelectedRawsToRemove((prev) => {
                              const next = new Set(prev)
                              checked ? next.delete(batch) : next.add(batch)
                              return next
                            })
                          } else {
                            openBatch(source)
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && openBatch(source)}
                        className={`group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 pl-6 text-left text-xs transition ${
                          active && !removeRawMode
                            ? 'bg-indigo-100 font-semibold text-indigo-700'
                            : checked
                              ? 'bg-red-50 text-red-700'
                              : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {removeRawMode && (
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                              checked
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate" title={batch}>
                          {source}
                        </span>
                        {type === 'crops' && (
                          <span className="shrink-0 rounded bg-slate-200/80 px-1 py-px text-[9px] font-medium uppercase text-slate-500">
                            crops
                          </span>
                        )}
                        {linked.length > 0 && (
                          <span
                            title={`Used by: ${linked.join(', ')}`}
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                          />
                        )}
                        {count != null && (
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {count}
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>
            )
          })}
          {rawSourceGroups.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">
              {rawSources.length === 0
                ? 'No batches yet — upload images to get started'
                : 'No batches match the filter'}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 p-2">
          {removeRawMode ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmingRemoveRaws(true)}
                disabled={selectedRawsToRemove.size === 0}
                className="flex-1 rounded-lg bg-red-500 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-40"
              >
                Delete ({selectedRawsToRemove.size})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoveRawMode(false)
                  setSelectedRawsToRemove(new Set())
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSourceModalOpen(true)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Sources
              </button>
              {rawSources.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRemoveRawMode(true)
                    setSelectedRawsToRemove(new Set())
                  }}
                  className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setUploadSourceOpen(true)}
                className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-xs font-medium text-white shadow transition hover:bg-indigo-600"
              >
                <ArchiveIcon className="h-3.5 w-3.5" />
                Upload
              </button>
            </>
          )}
        </div>
      </aside>

      <input
        ref={tarInputRef}
        type="file"
        accept=".tar,.tar.gz,.tgz,.tar.bz2,.tar.xz,.zip,.rar,.jpg,.jpeg,.png,.gif,.bmp,.webp"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* ---- main pane ---- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
        {!selectedRawInfo ? (
          <div className="m-6 flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-400">
            Select a batch on the left to browse its images
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-slate-200/70 px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-base font-semibold text-slate-800">
                {selectedRaw}
              </h3>
              <span className="flex h-7 items-center rounded-full bg-slate-200/80 px-3 text-xs font-medium text-slate-600">
                {activeImages.length} / {rawImagesTotal} images
              </span>
              {(selectedRawInfo.type ||
                selectedRawInfo.sourceInfo ||
                selectedDatasets.length > 0) && (
                <div ref={tagsMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setTagsMenuOpen((v) => !v)}
                    className="flex h-7 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Tags
                    <span className="text-slate-400">
                      (
                      {(selectedRawInfo.type ? 1 : 0) +
                        (selectedRawInfo.sourceInfo ? 1 : 0) +
                        selectedDatasets.length}
                      )
                    </span>
                    <svg
                      className={`h-3 w-3 transition-transform ${tagsMenuOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {tagsMenuOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      {selectedRawInfo.type && (
                        <span className="mb-1 mr-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          {selectedRawInfo.type}
                        </span>
                      )}
                      {selectedRawInfo.sourceInfo && (
                        <span className="mb-1 mr-1 inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                          {selectedRawInfo.sourceInfo.name} · v
                          {selectedRawInfo.sourceInfo.version}
                        </span>
                      )}
                      {selectedDatasets.map((ds) => (
                        <span
                          key={ds}
                          className="mb-1 mr-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                        >
                          {ds}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setGridMode((m) =>
                    m === 'landscape'
                      ? 'portrait'
                      : m === 'portrait'
                        ? 'natural'
                        : 'landscape',
                  )
                }
                title={`Grid: ${gridMode} — click to switch`}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
              >
                {gridMode === 'landscape' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="3" y="7" width="18" height="10" rx="1.5" />
                  </svg>
                ) : gridMode === 'portrait' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="7" y="3" width="10" height="18" rx="1.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="3" y="4" width="8" height="9" rx="1" />
                    <rect x="13" y="4" width="8" height="5" rx="1" />
                    <rect x="3" y="15" width="8" height="5" rx="1" />
                    <rect x="13" y="11" width="8" height="9" rx="1" />
                  </svg>
                )}
              </button>
              <select
                value={gridCols[gridMode]}
                onChange={(e) =>
                  setGridCols((prev) => ({
                    ...prev,
                    [gridMode]: Number(e.target.value),
                  }))
                }
                title="Columns"
                className="h-7 rounded-full border border-slate-300 bg-white px-2 text-xs font-medium text-slate-600 outline-none transition hover:bg-slate-100"
              >
                {GRID_COL_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} col
                  </option>
                ))}
              </select>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (rawImageSelectMode) setSelectedRawImageIds(new Set())
                    setRawImageSelectMode((v) => !v)
                  }}
                  className={`flex h-7 items-center rounded-full border px-3 text-xs font-medium transition ${
                    rawImageSelectMode
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {rawImageSelectMode ? 'Cancel' : 'Select images'}
                </button>
                <button
                  type="button"
                  onClick={() => setSplitOpen(true)}
                  disabled={rawImagesTotal < 2}
                  title="Split this batch into smaller batches"
                  className="flex h-7 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Split
                </button>
                <button
                  type="button"
                  onClick={() => setGenerateOpen(true)}
                  disabled={rawGenerating}
                  className="flex h-7 items-center rounded-full bg-indigo-500 px-3 text-xs font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-50"
                >
                  Generate crops
                </button>
              </div>
            </div>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
            <div
              ref={rawGridRef}
              className={`relative ${rawImageSelectMode ? 'select-none' : ''}`}
              onPointerDown={onRawGridPointerDown}
              onClickCapture={onRawGridClickCapture}
              onDragStart={(e) => e.preventDefault()}
            >
            {rawMarqueeRect && (
              <div
                className="pointer-events-none absolute z-20 rounded border-2 border-indigo-400 bg-indigo-400/15"
                style={rawMarqueeRect}
              />
            )}
            {rawImagesLoading && activeImages.length === 0 ? (
              <div className="mt-4">
                <SkeletonGrid
                  count={gridCols[gridMode] * 2}
                  cols={GRID_COLS[gridCols[gridMode]]}
                  aspect={
                    gridMode === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'
                  }
                />
              </div>
            ) : gridMode === 'natural' ? (
              <div className={`mt-4 gap-3 ${MASONRY_COLS[gridCols[gridMode]]}`}>
                {activeImages.map((image) => (
                  <button
                    key={image.id ?? image}
                    type="button"
                    data-img-id={image.id}
                    onClick={() =>
                      rawImageSelectMode
                        ? toggleRawImageSelect(image.id)
                        : setModalIndex(activeImages.indexOf(image))
                    }
                    className="group relative mb-3 block w-full overflow-hidden rounded-lg shadow transition break-inside-avoid hover:shadow-lg"
                  >
                    <SkeletonImg
                      src={`/api${image.path ?? image}`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full bg-slate-200 transition duration-150 group-hover:scale-105"
                    />
                    {rawImageSelectMode && (
                      <span
                        className={`absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow ${
                          selectedRawImageIds.has(image.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white/50 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={`mt-4 grid gap-3 ${GRID_COLS[gridCols[gridMode]]}`}
              >
                {activeImages.map((image) => (
                  <button
                    key={image.id ?? image}
                    type="button"
                    data-img-id={image.id}
                    onClick={() =>
                      rawImageSelectMode
                        ? toggleRawImageSelect(image.id)
                        : setModalIndex(activeImages.indexOf(image))
                    }
                    className="group relative overflow-hidden rounded-lg shadow transition hover:shadow-lg"
                  >
                    <SkeletonImg
                      src={`/api${image.path ?? image}`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`w-full bg-slate-200 object-cover transition duration-150 group-hover:scale-105 ${
                        gridMode === 'portrait'
                          ? 'aspect-[9/16]'
                          : 'aspect-video'
                      }`}
                    />
                    {rawImageSelectMode && (
                      <span
                        className={`absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold shadow ${
                          selectedRawImageIds.has(image.id)
                            ? 'bg-red-500 text-white'
                            : 'bg-white/50 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {activeImages.length === 0 && !rawImagesLoading && (
              <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
                No images yet
              </div>
            )}
            {rawImagesHasMore && (
              <div
                ref={rawImagesSentinelRef}
                onClick={() =>
                  !loadingMoreRaws &&
                  fetchRawImages(
                    selectedBatchId,
                    Math.floor(activeImages.length / DATASET_PAGE_LIMIT),
                    false,
                  )
                }
                title="Click to load more"
                className="mt-3 flex cursor-pointer items-center gap-2 py-2 text-xs text-slate-400 transition hover:text-slate-600"
              >
                {loadingMoreRaws && (
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                )}
                {loadingMoreRaws
                  ? 'Loading more...'
                  : `${activeImages.length} / ${rawImagesTotal} — scroll for more`}
              </div>
            )}
            </div>
            </div>
          </>
        )}
      </div>

      {rawImageSelectMode && selectedRawImageIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-xl backdrop-blur">
          <span className="text-sm font-medium text-slate-700">
            {selectedRawImageIds.size} selected
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedRawImageIds(
                new Set(activeImages.map((img) => img.id)),
              )
            }
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedRawImageIds(new Set())}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDeleteRawImages(true)}
            disabled={deletingRawImages}
            className="rounded-full bg-red-500 px-4 py-1 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      )}

      {confirmingDeleteRawImages && (
        <ConfirmModal
          count={selectedRawImageIds.size}
          title={`Delete ${selectedRawImageIds.size} image${selectedRawImageIds.size === 1 ? '' : 's'}?`}
          message="This permanently removes the selected images from disk. This action cannot be undone."
          onCancel={() => setConfirmingDeleteRawImages(false)}
          onConfirm={doDeleteSelectedRawImages}
        />
      )}

      <ImageModal
        images={activeImages}
        index={modalIndex}
        onClose={() => setModalIndex(null)}
        onNavigate={navigateModal}
        onSelect={setModalIndex}
      />

      {generateOpen && (
        <GenerateCropsModal
          batch={selectedRaw}
          yoloClasses={yoloClasses}
          generating={rawGenerating}
          onGenerate={doGenerateRaw}
          onClose={() => setGenerateOpen(false)}
        />
      )}

      {splitOpen && (
        <SplitBatchModal
          batch={selectedRaw}
          totalImages={rawImagesTotal}
          progress={splitProgress}
          splitting={splittingBatch}
          onSplit={doSplitBatch}
          onClose={() => setSplitOpen(false)}
        />
      )}

      {confirmingRemoveRaws && (
        <ConfirmModal
          count={selectedRawsToRemove.size}
          title={`Delete ${selectedRawsToRemove.size} raw image batch${selectedRawsToRemove.size === 1 ? '' : 'es'}?`}
          message="This will permanently remove the selected raw image batches and all their images. This action cannot be undone."
          details={
            affectedDatasets.length > 0 && (
              <>
                <div className="font-semibold text-amber-300">
                  ⚠ These batches feed {affectedDatasets.length} dataset
                  {affectedDatasets.length === 1 ? '' : 's'} — their images and
                  annotations will also be deleted:
                </div>
                <ul className="mt-1.5 space-y-1">
                  {affectedDatasets.map(([ds, batchNames]) => (
                    <li key={ds}>
                      <span className="font-medium text-white">{ds}</span>
                      <span className="text-slate-400">
                        {' '}
                        — {batchNames.length} batch
                        {batchNames.length === 1 ? '' : 'es'} (
                        {batchNames.join(', ')})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )
          }
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
    </section>
  )
}
