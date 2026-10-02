import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppData } from './AppDataContext'
import { useUser } from './UserContext'
import { useLocalStorage } from '../utils'

// Everything scoped to the dataset workspace (/datasets/:name): the active
// dataset, its batches/images/annotations, selection + marquee state, the
// attribute-correction modal state, and all related actions.
const DatasetContext = createContext(null)

export const useDataset = () => useContext(DatasetContext)

export function DatasetProvider({ children }) {
  const {
    setStatus,
    datasets,
    fetchDatasets,
    fetchArchives,
    exportFormat,
    setExportFormat,
    exportGroupSplit,
  } = useAppData()
  const { currentUser } = useUser()
  const location = useLocation()
  const navigate = useNavigate()

  // /datasets/:name drives the workspace — the URL is the source of truth.
  const datasetName = decodeURIComponent(
    location.pathname.match(/^\/datasets\/([^/]+)/)?.[1] ?? '',
  )

  const [datasetModalIndex, setDatasetModalIndex] = useState(null)
  const [confirmingRemoveAttrImage, setConfirmingRemoveAttrImage] = useState(false)
  const [confirmingRemoveDatasetBatch, setConfirmingRemoveDatasetBatch] = useState(false)
  const [datasetBatchToRemove, setDatasetBatchToRemove] = useState('')
  const [datasetSelectMode, setDatasetSelectMode] = useState(false)
  const [datasetGridMode, setDatasetGridMode] = useLocalStorage(
    'dataset-grid-mode',
    'landscape',
  )
  // per-mode column counts so each layout keeps its own density
  const [datasetGridCols, setDatasetGridCols] = useLocalStorage(
    'dataset-grid-cols',
    {
      landscape: 6,
      portrait: 8,
      natural: 6,
    },
  )
  const [similarView, setSimilarView] = useState(null)
  const [similarLoading, setSimilarLoading] = useState(false)
  const [similarThreshold, setSimilarThreshold] = useState(6)
  const [selectedDatasetImages, setSelectedDatasetImages] = useState(new Set())
  const [confirmingRemoveDatasetImages, setConfirmingRemoveDatasetImages] = useState(false)
  const [reviewSelectedOpen, setReviewSelectedOpen] = useState(false)
  const [reviewSelectedImages, setReviewSelectedImages] = useState([])
  const [confirmingRemoveActiveDataset, setConfirmingRemoveActiveDataset] = useState(false)
  const [activeDataset, setActiveDataset] = useState('')
  const [datasetBatches, setDatasetBatches] = useState([])
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetImageGroups, setDatasetImageGroups] = useState({})
  const [datasetAnnotations, setDatasetAnnotations] = useState({})
  const [datasetAnnotationTimes, setDatasetAnnotationTimes] = useState({})
  const [datasetLastAttrs, setDatasetLastAttrs] = useState({})
  const [datasetReviewed, setDatasetReviewed] = useState({})
  const [datasetBatchFilter, setDatasetBatchFilter] = useState(null)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [datasetSettingsOpen, setDatasetSettingsOpen] = useState(false)
  const [savingDatasetSettings, setSavingDatasetSettings] = useState(false)
  const [datasetSplit, setDatasetSplit] = useState({
    train: 70,
    val: 20,
    test: 10,
  })
  const attrStripRef = useRef(null)
  const attrShownRef = useRef(null) // {dataset, image, attrIndex} currently displayed in correction modal
  const [exportResult, setExportResult] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [selectedExportBatches, setSelectedExportBatches] = useState([])
  const [assignToDatasetOpen, setAssignToDatasetOpen] = useState(false)
  const [importBatchOpen, setImportBatchOpen] = useState(false)
  const [importingBatch, setImportingBatch] = useState(false)
  const [preLabeling, setPreLabeling] = useState(false)
  const [prelabelConfirmOpen, setPrelabelConfirmOpen] = useState(false)
  const [prelabelConfirmCount, setPrelabelConfirmCount] = useState(0)
  const [prelabelWriteValues, setPrelabelWriteValues] = useState(true)
  const [prelabelMenuOpen, setPrelabelMenuOpen] = useState(false)
  const [prelabelModel, setPrelabelModel] = useState('')
  const prelabelMenuRef = useRef(null)
  const [attrMenuOpen, setAttrMenuOpen] = useState(false)
  const attrMenuRef = useRef(null)
  const [prelabelStatsOpen, setPrelabelStatsOpen] = useState(false)
  const [prelabelStats, setPrelabelStats] = useState(null)
  const [prelabelStatsLoading, setPrelabelStatsLoading] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef(null)
  const [handlersMenuOpen, setHandlersMenuOpen] = useState(false)
  const handlersMenuRef = useRef(null)
  const [batchMenuOpen, setBatchMenuOpen] = useState(false)
  const batchMenuRef = useRef(null)
  const [batchActionsMenuOpen, setBatchActionsMenuOpen] = useState(false)
  const batchActionsMenuRef = useRef(null)
  const [archiveFormat, setArchiveFormat] = useState('tar')
  const [archiving, setArchiving] = useState(false)
  const [datasetBatchSources, setDatasetBatchSources] = useState({})
  const [datasetBatchStats, setDatasetBatchStats] = useState({})
  const [batchHandlers, setBatchHandlers] = useState({})
  const [batchWarn, setBatchWarn] = useState(null)
  const [datasetRefreshKey, setDatasetRefreshKey] = useState(0)
  const [datasetAttributes, setDatasetAttributes] = useState(null)
  const [attrAnnotate, setAttrAnnotate] = useState(null)

  const datasetImages = useMemo(
    () => datasetBatches.flatMap((stem) => datasetImageGroups[stem] ?? []),
    [datasetBatches, datasetImageGroups],
  )

  const datasetTotals = useMemo(() => {
    let total = 0
    let annotated = 0
    for (const c of Object.values(datasetBatchStats)) {
      total += c.total
      annotated += c.annotated
    }
    return { total, annotated }
  }, [datasetBatchStats])

  // Per-batch count of fully-reviewed images — every attribute group checked
  // (or an "all" review), matching the emerald card badge.
  const batchReviewedCounts = useMemo(() => {
    const groups = datasetAttributes?.length ?? 0
    const counts = {}
    for (const [img, rev] of Object.entries(datasetReviewed ?? {})) {
      if (!rev) continue
      const done =
        (rev.all && Object.keys(rev.all).length > 0) ||
        (groups > 0 &&
          Array.from({ length: groups }, (_, gi) => gi).every(
            (gi) => rev[String(gi)] && Object.keys(rev[String(gi)]).length > 0,
          ))
      if (!done) continue
      const parts = img.split('/').filter(Boolean)
      const stem = parts.length >= 2 ? `raw-images_${parts[parts.length - 2]}` : null
      if (stem) counts[stem] = (counts[stem] ?? 0) + 1
    }
    return counts
  }, [datasetReviewed, datasetAttributes])

  const datasetActiveImages = useMemo(() => {
    if (similarView) {
      return [...similarView.clusters.flat(), ...similarView.singles]
    }
    return datasetBatchFilter
      ? (datasetImageGroups[datasetBatchFilter] ?? [])
      : datasetImages
  }, [similarView, datasetBatchFilter, datasetImageGroups, datasetImages])

  // "Last edited" is per-user (from the activity log), not just whichever
  // annotation row has the newest updated_at — so each annotator resumes at
  // their own progress, not a colleague's.
  const [myLastEdit, setMyLastEdit] = useState(null) // { image, attr_index, created_at } | null
  const lastEditedImage = myLastEdit?.image ?? null

  const fetchMyLastEdit = async () => {
    if (!activeDataset || !currentUser) {
      setMyLastEdit(null)
      return
    }
    const batch = datasetBatchFilter?.replace(/^raw-images_/, '')
    try {
      const params = new URLSearchParams({ user: currentUser })
      if (batch) params.set('batch', batch)
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/last-edit?${params}`,
      )
      const data = await response.json()
      setMyLastEdit(response.ok && data.image ? data : null)
    } catch {
      setMyLastEdit(null)
    }
  }

  useEffect(() => {
    fetchMyLastEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset, datasetBatchFilter, currentUser])

  const handleDatasetImagesLoaded = (stem, images, replace) => {
    setDatasetImageGroups((prev) => ({
      ...prev,
      [stem]: replace ? images : [...(prev[stem] ?? []), ...images],
    }))
  }

  const navigateDatasetModal = (delta) => {
    setDatasetModalIndex((i) =>
      i === null
        ? null
        : (i + delta + datasetActiveImages.length) % datasetActiveImages.length,
    )
  }

  const refreshDataset = async (name) => {
    setDatasetLoading(true)
    try {
      const [datasetRes, imagesRes, annotRes, handlersRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(name)}`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/images?counts=1`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/annotations`),
        fetch(`/api/datasets/${encodeURIComponent(name)}/batch-handlers`),
      ])
      const data = await datasetRes.json()
      const imagesData = await imagesRes.json()
      const annotData = await annotRes.json()
      const handlersData = await handlersRes.json()
      if (datasetRes.ok && imagesRes.ok) {
        setActiveDataset(data.name)
        setDatasetBatches(data.batches ?? [])
        setDatasetSplit(data.split ?? { train: 70, val: 20, test: 10 })
        setDatasetImageGroups({})
        setDatasetBatchStats(imagesData.counts ?? {})
        setDatasetBatchSources(imagesData.batch_sources ?? {})
        setDatasetAnnotations(annotData.annotations ?? {})
        setDatasetAnnotationTimes(annotData.updated_at ?? {})
        setDatasetLastAttrs(annotData.last_attr ?? {})
        setDatasetReviewed(annotData.reviewed ?? {})
        setBatchHandlers(handlersData.handlers ?? {})
        setDatasetRefreshKey((k) => k + 1)
        if (data.framework && data.model) {
          const tpl = `${data.framework}/${data.model}`.toLowerCase()
          fetch(`/api/templates/${encodeURIComponent(tpl)}/attributes`)
            .then((r) => r.json())
            .then((d) => setDatasetAttributes(d.attributes ?? []))
            .catch(() => setDatasetAttributes([]))
        } else {
          setDatasetAttributes([])
        }
        setPrelabelModel('')
      } else {
        setStatus(`Failed: ${data.detail ?? imagesData.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setDatasetLoading(false)
    }
  }

  const openDataset = (name) => {
    navigate(`/datasets/${encodeURIComponent(name)}`)
  }

  useEffect(() => {
    if (!datasetName) {
      if (activeDataset) setActiveDataset('')
      return
    }
    if (datasetName !== activeDataset) {
      setExportResult(null)
      setExportFormat('tar')
      setShowExportPanel(false)
      setDatasetBatchFilter(null)
      refreshDataset(datasetName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetName])

  // The dataset was deleted (from the list page) while it's still the
  // workspace target — drop the stale state.
  useEffect(() => {
    if (
      activeDataset &&
      datasets.length > 0 &&
      !datasets.some((d) => d.name === activeDataset)
    ) {
      setActiveDataset('')
    }
  }, [datasets, activeDataset])

  const openAttrAnnotate = (name, templateName, batchFilter = null, startImage = null, startAttr = null, returnToViewer = false) => {
    if (!templateName) {
      setStatus('Set a model for this dataset before annotating')
      return
    }
    const all = batchHandlers[batchFilter]?.handlers ?? []
    const others = all.filter((h) => h.user !== currentUser)
    if (others.length > 0) {
      setBatchWarn({
        batch: batchFilter,
        handlers: all,
        proceed: () =>
          launchAttrAnnotate(name, templateName, batchFilter, startImage, startAttr, returnToViewer),
      })
      return
    }
    launchAttrAnnotate(name, templateName, batchFilter, startImage, startAttr, returnToViewer)
  }

  const launchAttrAnnotate = async (name, templateName, batchFilter = null, startImage = null, startAttr = null, returnToViewer = false) => {
    try {
      const imagesUrl = batchFilter
        ? `/api/datasets/${encodeURIComponent(name)}/images?batch=${encodeURIComponent(batchFilter.replace(/^raw-images_/, ''))}&limit=0`
        : `/api/datasets/${encodeURIComponent(name)}/images`
      const [imagesRes, attrsRes, annotRes] = await Promise.all([
        fetch(imagesUrl),
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
        ? (images.images ?? [])
        : Object.values(images.groups ?? {}).flat()
      const annotations = annot.annotations ?? {}
      setAttrAnnotate({
        dataset: name,
        template: templateName,
        batchFilter,
        images: filteredImages,
        attributes,
        length,
        annotations,
        attrIndex: typeof startAttr === 'number' && startAttr >= 0 && startAttr < attributes.length ? startAttr : 0,
        imgIndex: Math.max(0, filteredImages.indexOf(startImage)),
        returnToViewer,
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
      const response = await fetch(`/api/datasets/${encodeURIComponent(attrAnnotate.dataset)}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          values: current,
          attr_index: attrAnnotate.attrIndex,
          user: currentUser,
        }),
      })
      if (response.ok) {
        setDatasetAnnotationTimes((prev) => ({
          ...prev,
          [image]: new Date().toISOString(),
        }))
        setDatasetLastAttrs((prev) => ({
          ...prev,
          [image]: attrAnnotate.attrIndex,
        }))
        if (currentUser) {
          const now = new Date().toISOString()
          const key = String(attrAnnotate.attrIndex)
          setDatasetReviewed((prev) => ({
            ...prev,
            [image]: {
              ...(prev[image] ?? {}),
              [key]: { ...(prev[image]?.[key] ?? {}), [currentUser]: now },
            },
          }))
          setMyLastEdit({
            image,
            attr_index: attrAnnotate.attrIndex,
            created_at: now,
          })
        }
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
    if (advance && group.type === 'single') {
      attrNextImage()
    }
  }

  // Fire-and-forget: records that the current user finished reviewing
  // `image` under attribute `attrIndex` — called whenever a {image, attr}
  // pair is departed in the correction modal — even when no attribute
  // changed, so "From last edited" can resume at the last image actually
  // looked at. Returns the request promise so callers can await it.
  const logAttrCheck = (dataset, image, attrIndex) => {
    if (!dataset || !image) return Promise.resolve(null)
    return fetch(`/api/datasets/${encodeURIComponent(dataset)}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image,
        attr_index: attrIndex,
        user: currentUser,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.skipped) return
        const now = new Date().toISOString()
        const key = String(attrIndex)
        setDatasetReviewed((prev) => ({
          ...prev,
          [image]: {
            ...(prev[image] ?? {}),
            [key]: {
              ...(prev[image]?.[key] ?? {}),
              [currentUser || 'root']: now,
            },
          },
        }))
        setMyLastEdit({ image, attr_index: attrIndex, created_at: now })
      })
      .catch(() => {})
  }

  const attrNextImage = () => {
    if (!attrAnnotate) return
    if (attrAnnotate.imgIndex >= attrAnnotate.images.length - 1) {
      finishAttrReview()
      return
    }
    setAttrAnnotate((s) => ({ ...s, imgIndex: s.imgIndex + 1 }))
  }

  const attrPrevImage = () => {
    if (!attrAnnotate) return
    setAttrAnnotate((s) => ({
      ...s,
      imgIndex: Math.max(s.imgIndex - 1, 0),
      done: false,
      doneReviewed: null,
    }))
  }

  // Close the correction modal; when it was launched from the full image
  // view, return there at the image currently shown instead.
  const closeAttrAnnotate = () => {
    if (attrAnnotate?.returnToViewer) {
      const img = attrAnnotate.images[attrAnnotate.imgIndex]
      setAttrAnnotate(null)
      const i = datasetActiveImages.indexOf(img)
      setDatasetModalIndex(i >= 0 ? i : 0)
    } else {
      setAttrAnnotate(null)
    }
  }

  // "Done" on the last image: record that final image's check, fetch
  // cumulative per-user progress for this batch+attribute, then swap the
  // modal body for the completion screen.
  const finishAttrReview = async () => {
    if (!attrAnnotate) return
    const { dataset, batchFilter, attrIndex, images, imgIndex } = attrAnnotate
    await logAttrCheck(dataset, images[imgIndex], attrIndex)
    let reviewed = null
    try {
      const params = new URLSearchParams({
        user: currentUser ?? '',
        attr_index: String(attrIndex),
      })
      if (batchFilter) {
        params.set('batch', batchFilter.replace(/^raw-images_/, ''))
      }
      const r = await fetch(
        `/api/datasets/${encodeURIComponent(dataset)}/review-progress?${params}`,
      )
      const data = await r.json()
      if (r.ok) reviewed = data.reviewed
    } catch {
      // progress stays null — the card still renders without the count
    }
    setAttrAnnotate((s) =>
      s ? { ...s, done: true, doneReviewed: reviewed } : s,
    )
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
          body: JSON.stringify({ image, user: currentUser }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed image from dataset`)
      await refreshDataset(attrAnnotate.dataset)
      setMyLastEdit((prev) => (prev?.image === image ? null : prev))
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

  const fetchSimilar = async (threshold) => {
    if (!activeDataset || !datasetBatchFilter) return
    const t = threshold ?? similarThreshold
    const batchName = datasetBatchFilter.replace(/^raw-images_/, '')
    setSimilarLoading(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/images/similar?batch=${encodeURIComponent(batchName)}&threshold=${t}`,
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setSimilarView({ clusters: data.clusters, singles: data.singles })
      setSelectedDatasetImages(new Set())
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setSimilarLoading(false)
    }
  }

  const selectClusterRest = (cluster) => {
    setSelectedDatasetImages(
      (prev) => new Set([...prev, ...cluster.slice(1)]),
    )
  }

  const selectAllClusterRest = (clusters) => {
    setSelectedDatasetImages(
      (prev) =>
        new Set([...prev, ...clusters.flatMap((c) => c.slice(1))]),
    )
  }

  const toggleDatasetImageSelect = useCallback((src) => {
    setSelectedDatasetImages((prev) => {
      const next = new Set(prev)
      if (next.has(src)) {
        next.delete(src)
      } else {
        next.add(src)
      }
      return next
    })
  }, [])

  // ---- marquee (drag) selection ----
  const datasetGridRef = useRef(null)
  const marqueeRef = useRef(null) // {sx, sy, cards, didDrag, hits} in page coords
  const suppressGridClickRef = useRef(false)
  const [marqueeRect, setMarqueeRect] = useState(null)

  const onGridPointerDown = (e) => {
    if (!(datasetSelectMode || similarView) || e.button !== 0) return
    // let real buttons (Load more, cluster headers) work normally
    if (e.target.closest('button:not([data-img-path])')) return
    const sx = e.clientX + window.scrollX
    const sy = e.clientY + window.scrollY
    const cards = [
      ...datasetGridRef.current.querySelectorAll('[data-img-path]'),
    ].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        el,
        path: el.dataset.imgPath,
        l: r.left + window.scrollX,
        t: r.top + window.scrollY,
        r: r.right + window.scrollX,
        b: r.bottom + window.scrollY,
      }
    })
    marqueeRef.current = { sx, sy, cards, didDrag: false, hits: new Set() }
    window.addEventListener('pointermove', onGridPointerMove)
    window.addEventListener('pointerup', onGridPointerUp, { once: true })
    window.addEventListener('pointercancel', onGridPointerUp, { once: true })
  }

  const onGridPointerMove = (e) => {
    const st = marqueeRef.current
    if (!st) return
    const cx = e.clientX + window.scrollX
    const cy = e.clientY + window.scrollY
    if (!st.didDrag && Math.hypot(cx - st.sx, cy - st.sy) < 5) return
    st.didDrag = true
    const l = Math.min(st.sx, cx)
    const t = Math.min(st.sy, cy)
    const r = Math.max(st.sx, cx)
    const b = Math.max(st.sy, cy)
    // overlay is positioned inside the grid container -> convert page coords
    const cr = datasetGridRef.current.getBoundingClientRect()
    setMarqueeRect({
      left: l - (cr.left + window.scrollX),
      top: t - (cr.top + window.scrollY),
      width: r - l,
      height: b - t,
    })
    for (const c of st.cards) {
      const hit = c.l < r && c.r > l && c.t < b && c.b > t
      if (hit && !st.hits.has(c.path)) {
        st.hits.add(c.path)
        c.el.style.outline = '2px solid #818cf8'
        c.el.style.outlineOffset = '-2px'
      } else if (!hit && st.hits.has(c.path)) {
        st.hits.delete(c.path)
        c.el.style.outline = ''
      }
    }
  }

  const onGridPointerUp = () => {
    window.removeEventListener('pointermove', onGridPointerMove)
    window.removeEventListener('pointercancel', onGridPointerUp)
    const st = marqueeRef.current
    marqueeRef.current = null
    setMarqueeRect(null)
    if (!st) return
    for (const c of st.cards) c.el.style.outline = ''
    if (!st.didDrag) return
    // eat the click that follows this same gesture, but only that one
    suppressGridClickRef.current = true
    setTimeout(() => {
      suppressGridClickRef.current = false
    }, 0)
    if (st.hits.size) {
      setSelectedDatasetImages((prev) => new Set([...prev, ...st.hits]))
    }
  }

  const onGridClickCapture = (e) => {
    if (suppressGridClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const openDatasetImage = useCallback(
    (src) => setDatasetModalIndex(datasetActiveImages.indexOf(src)),
    [datasetActiveImages],
  )

  const removeSelectedDatasetImages = async () => {
    setConfirmingRemoveDatasetImages(false)
    setReviewSelectedOpen(false)
    const paths = [...selectedDatasetImages]
    if (!activeDataset || paths.length === 0) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/images/remove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: paths, user: currentUser }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Removed ${paths.length} image${paths.length === 1 ? '' : 's'} from dataset`)
      const pathSet = new Set(paths)
      const stemByPath = {}
      for (const [stem, imgs] of Object.entries(datasetImageGroups)) {
        for (const p of imgs) stemByPath[p] = stem
      }
      setDatasetImageGroups((prev) => {
        const next = {}
        for (const [k, v] of Object.entries(prev)) {
          next[k] = v.filter((s) => !pathSet.has(s))
        }
        return next
      })
      setDatasetBatchStats((prev) => {
        const next = { ...prev }
        for (const p of paths) {
          const stem = stemByPath[p] ?? datasetBatchFilter
          const cur = next[stem]
          if (!cur) continue
          next[stem] = {
            total: Math.max(0, cur.total - 1),
            annotated: Math.max(
              0,
              cur.annotated - (datasetAnnotations[p] !== undefined ? 1 : 0),
            ),
          }
        }
        return next
      })
      setDatasetAnnotations((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetAnnotationTimes((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetLastAttrs((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setDatasetReviewed((prev) => {
        const next = { ...prev }
        for (const p of paths) delete next[p]
        return next
      })
      setMyLastEdit((prev) => (prev && paths.includes(prev.image) ? null : prev))
      setSimilarView((prev) => {
        if (!prev) return prev
        const clusters = []
        const extraSingles = []
        for (const c of prev.clusters) {
          const kept = c.filter((p) => !pathSet.has(p))
          if (kept.length >= 2) {
            clusters.push(kept)
          } else if (kept.length === 1) {
            extraSingles.push(kept[0])
          }
        }
        return {
          clusters,
          singles: [
            ...prev.singles.filter((p) => !pathSet.has(p)),
            ...extraSingles,
          ],
        }
      })
      setSelectedDatasetImages(new Set())
      setDatasetSelectMode(false)
    } catch {
      setStatus('Failed: could not reach the server')
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
            group_split: exportGroupSplit,
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

  const doAssignBatchToDataset = async (batch) => {
    if (!activeDataset || !batch) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch }),
        },
      )
      const data = await response.json()
      if (response.ok) {
        setStatus(`Assigned ${data.batch} to ${data.dataset}`)
        setAssignToDatasetOpen(false)
        fetchDatasets()
        refreshDataset(activeDataset)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doImportBatch = async (batchIds) => {
    if (!batchIds || batchIds.length === 0) return
    setImportingBatch(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch_ids: batchIds }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Imported ${data.count} images from ${data.batches.length} batches`)
      setImportBatchOpen(false)
      fetchDatasets()
      refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setImportingBatch(false)
    }
  }

  const openDatasetSettings = () => {
    if (!datasets.some((d) => d.name === activeDataset)) return
    setDatasetSettingsOpen(true)
  }

  const doRemoveActiveDataset = async () => {
    setConfirmingRemoveActiveDataset(false)
    if (!activeDataset) return
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) {
        setStatus('Failed: could not remove dataset')
        return
      }
      setStatus(`Deleted dataset ${activeDataset}`)
      setDatasetSettingsOpen(false)
      navigate('/datasets')
      fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const doSaveDatasetSettings = async (name, template) => {
    if (!name?.trim()) {
      setStatus('Dataset name is required')
      return
    }
    setSavingDatasetSettings(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            template,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Updated dataset ${data.dataset}`)
      setDatasetSettingsOpen(false)
      const newName = data.dataset
      fetchDatasets().then(() => {
        // the URL param syncs activeDataset via the route effect
        navigate(`/datasets/${encodeURIComponent(newName)}`)
      })
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setSavingDatasetSettings(false)
    }
  }

  const doArchiveDataset = async () => {
    if (!activeDataset || archiving) return
    setArchiving(true)
    setStatus('Creating archive...')
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/archive`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: archiveFormat }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'archive failed'}`)
        return
      }
      setStatus(
        `Archived ${data.archive} (${data.images} images, ${data.annotated} annotated)`,
      )
      fetchArchives()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setArchiving(false)
    }
  }

  const runPrelabel = async (writeValues = prelabelWriteValues) => {
    if (!activeDataset) return
    setPrelabelConfirmOpen(false)
    setPreLabeling(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/prelabel`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch: datasetBatchFilter || '',
            write_values: writeValues,
            user: currentUser,
            model: prelabelModel,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(
        writeValues
          ? `Pre-labeled ${data.images} images`
          : `Pre-labeled ${data.images} images (predictions only, values untouched)`,
      )
      refreshDataset(activeDataset)
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setPreLabeling(false)
    }
  }

  const doPrelabel = (writeValues = true) => {
    if (!activeDataset) return
    setPrelabelWriteValues(writeValues)
    if (writeValues) {
      const existingCount = datasetBatchFilter
        ? (datasetBatchStats[datasetBatchFilter]?.annotated ?? 0)
        : datasetTotals.annotated
      if (existingCount > 0) {
        setPrelabelConfirmCount(existingCount)
        setPrelabelConfirmOpen(true)
        return
      }
    }
    runPrelabel(writeValues)
  }

  const fetchActivity = async () => {
    if (!activeDataset) return
    setActivityLoading(true)
    try {
      const [lbRes, actRes] = await Promise.all([
        fetch(`/api/datasets/${encodeURIComponent(activeDataset)}/leaderboard`),
        fetch(`/api/activity?dataset=${encodeURIComponent(activeDataset)}&limit=50`),
      ])
      const lbData = await lbRes.json()
      const actData = await actRes.json()
      if (lbRes.ok && actRes.ok) {
        setLeaderboard(lbData.leaderboard ?? [])
        setActivity(actData.activity ?? [])
        setActivityOpen(true)
      } else {
        setStatus(`Failed: ${lbData.detail ?? actData.detail ?? 'Could not load activity'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setActivityLoading(false)
    }
  }

  const fetchPrelabelStats = async () => {
    if (!activeDataset) return
    setPrelabelStatsLoading(true)
    try {
      const response = await fetch(
        `/api/datasets/${encodeURIComponent(activeDataset)}/prelabel-stats`,
      )
      const data = await response.json()
      if (response.ok) {
        setPrelabelStats(data)
        setPrelabelStatsOpen(true)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Could not load stats'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setPrelabelStatsLoading(false)
    }
  }

  useEffect(() => {
    if (!prelabelMenuOpen) return
    const handleClick = (e) => {
      if (prelabelMenuRef.current && !prelabelMenuRef.current.contains(e.target)) {
        setPrelabelMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [prelabelMenuOpen])

  useEffect(() => {
    if (!attrMenuOpen) return
    const handleClick = (e) => {
      if (attrMenuRef.current && !attrMenuRef.current.contains(e.target)) {
        setAttrMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [attrMenuOpen])

  useEffect(() => {
    if (
      !exportMenuOpen &&
      !handlersMenuOpen &&
      !batchMenuOpen &&
      !batchActionsMenuOpen
    )
      return
    const handleClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false)
      }
      if (
        handlersMenuRef.current &&
        !handlersMenuRef.current.contains(e.target)
      ) {
        setHandlersMenuOpen(false)
      }
      if (batchMenuRef.current && !batchMenuRef.current.contains(e.target)) {
        setBatchMenuOpen(false)
      }
      if (
        batchActionsMenuRef.current &&
        !batchActionsMenuRef.current.contains(e.target)
      ) {
        setBatchActionsMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [exportMenuOpen, handlersMenuOpen, batchMenuOpen, batchActionsMenuOpen])

  useEffect(() => {
    if (datasetBatches.length > 0 && !datasetBatches.includes(datasetBatchFilter)) {
      setDatasetBatchFilter(datasetBatches[0])
    }
  }, [datasetBatches, datasetBatchFilter])

  useEffect(() => {
    setDatasetSelectMode(false)
    setSelectedDatasetImages(new Set())
    setSimilarView(null)
  }, [activeDataset])

  useEffect(() => {
    if (!attrAnnotate) return
    const handleKey = (e) => {
      const group = attrAnnotate.attributes[attrAnnotate.attrIndex]
      if (!group) return
      if (e.key === 'Escape') {
        closeAttrAnnotate()
      }
      if (attrAnnotate.done) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          attrPrevImage()
        }
        return
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

  // Departure logging: any change of the shown {image, attrIndex} pair —
  // arrows, thumbnail jumps, attribute-dropdown switch — or the modal
  // closing logs a "check" for the pair that just left the screen.
  useEffect(() => {
    if (!attrAnnotate) {
      const prev = attrShownRef.current
      if (prev) logAttrCheck(prev.dataset, prev.image, prev.attrIndex)
      attrShownRef.current = null
      return
    }
    const shown = {
      dataset: attrAnnotate.dataset,
      image: attrAnnotate.images[attrAnnotate.imgIndex],
      attrIndex: attrAnnotate.attrIndex,
    }
    const prev = attrShownRef.current
    if (
      prev &&
      (prev.image !== shown.image || prev.attrIndex !== shown.attrIndex) &&
      attrAnnotate.images.includes(prev.image) // skip if it was just removed
    ) {
      logAttrCheck(prev.dataset, prev.image, prev.attrIndex)
    }
    attrShownRef.current = shown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrAnnotate?.images?.[attrAnnotate?.imgIndex], attrAnnotate?.attrIndex, attrAnnotate === null])

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

  const value = {
    datasetName,
    activeDataset,
    datasetBatches,
    datasetLoading,
    datasetImageGroups,
    datasetAnnotations,
    datasetAnnotationTimes,
    datasetLastAttrs,
    datasetReviewed,
    datasetBatchFilter,
    setDatasetBatchFilter,
    showExportPanel,
    setShowExportPanel,
    datasetSettingsOpen,
    setDatasetSettingsOpen,
    savingDatasetSettings,
    datasetSplit,
    setDatasetSplit,
    attrStripRef,
    exportResult,
    exporting,
    selectedExportBatches,
    setSelectedExportBatches,
    assignToDatasetOpen,
    setAssignToDatasetOpen,
    importBatchOpen,
    setImportBatchOpen,
    importingBatch,
    preLabeling,
    prelabelConfirmOpen,
    setPrelabelConfirmOpen,
    prelabelConfirmCount,
    prelabelMenuOpen,
    setPrelabelMenuOpen,
    prelabelMenuRef,
    prelabelModel,
    setPrelabelModel,
    attrMenuOpen,
    setAttrMenuOpen,
    attrMenuRef,
    prelabelStatsOpen,
    setPrelabelStatsOpen,
    prelabelStats,
    prelabelStatsLoading,
    activityOpen,
    setActivityOpen,
    activity,
    activityLoading,
    leaderboard,
    exportMenuOpen,
    setExportMenuOpen,
    exportMenuRef,
    handlersMenuOpen,
    setHandlersMenuOpen,
    handlersMenuRef,
    batchMenuOpen,
    setBatchMenuOpen,
    batchMenuRef,
    batchActionsMenuOpen,
    setBatchActionsMenuOpen,
    batchActionsMenuRef,
    archiveFormat,
    setArchiveFormat,
    archiving,
    datasetBatchSources,
    datasetBatchStats,
    batchHandlers,
    batchWarn,
    setBatchWarn,
    datasetRefreshKey,
    datasetAttributes,
    attrAnnotate,
    setAttrAnnotate,
    datasetModalIndex,
    setDatasetModalIndex,
    confirmingRemoveAttrImage,
    setConfirmingRemoveAttrImage,
    confirmingRemoveDatasetBatch,
    setConfirmingRemoveDatasetBatch,
    datasetBatchToRemove,
    setDatasetBatchToRemove,
    datasetSelectMode,
    setDatasetSelectMode,
    datasetGridMode,
    setDatasetGridMode,
    datasetGridCols,
    setDatasetGridCols,
    similarView,
    setSimilarView,
    similarLoading,
    similarThreshold,
    setSimilarThreshold,
    selectedDatasetImages,
    setSelectedDatasetImages,
    confirmingRemoveDatasetImages,
    setConfirmingRemoveDatasetImages,
    reviewSelectedOpen,
    setReviewSelectedOpen,
    reviewSelectedImages,
    setReviewSelectedImages,
    confirmingRemoveActiveDataset,
    setConfirmingRemoveActiveDataset,
    myLastEdit,
    setMyLastEdit,
    lastEditedImage,
    datasetImages,
    datasetTotals,
    batchReviewedCounts,
    datasetActiveImages,
    datasetGridRef,
    marqueeRect,
    handleDatasetImagesLoaded,
    navigateDatasetModal,
    refreshDataset,
    openDataset,
    openAttrAnnotate,
    launchAttrAnnotate,
    attrValuesFor,
    applyAttrValue,
    logAttrCheck,
    attrNextImage,
    attrPrevImage,
    closeAttrAnnotate,
    finishAttrReview,
    removeFromDatasetImage,
    removeDatasetBatch,
    fetchSimilar,
    selectClusterRest,
    selectAllClusterRest,
    toggleDatasetImageSelect,
    onGridPointerDown,
    onGridPointerMove,
    onGridPointerUp,
    onGridClickCapture,
    openDatasetImage,
    removeSelectedDatasetImages,
    doSaveSplit,
    doExportDataset,
    doAssignBatchToDataset,
    doImportBatch,
    openDatasetSettings,
    doRemoveActiveDataset,
    doSaveDatasetSettings,
    doArchiveDataset,
    runPrelabel,
    doPrelabel,
    fetchActivity,
    fetchPrelabelStats,
  }

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}
