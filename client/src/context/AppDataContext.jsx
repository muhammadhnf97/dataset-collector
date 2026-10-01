import { createContext, useContext, useEffect, useState } from 'react'

// App-level data shared across all pages: status messages, raw batches,
// sources, the dataset catalog, templates, and the archives store.
const AppDataContext = createContext(null)

export const useAppData = () => useContext(AppDataContext)

export function AppDataProvider({ children }) {
  const [status, setStatus] = useState(null)
  const [batches, setBatches] = useState([])
  const [yoloClasses, setYoloClasses] = useState([])
  const [sources, setSources] = useState([])
  const [datasets, setDatasets] = useState([])
  const [templates, setTemplates] = useState([])
  const [archives, setArchives] = useState([])
  // export settings are shared between the per-dataset and merged exports
  const [exportFormat, setExportFormat] = useState('tar')
  const [exportGroupSplit, setExportGroupSplit] = useState(true)
  // archive modals can be opened from more than one page
  const [archivesOpen, setArchivesOpen] = useState(false)
  const [importArchiveOpen, setImportArchiveOpen] = useState(false)
  const [uploadingArchive, setUploadingArchive] = useState(false)
  const [restoringArchiveId, setRestoringArchiveId] = useState(null)
  const [confirmingDeleteArchive, setConfirmingDeleteArchive] = useState(null)

  const fetchBatches = async () => {
    try {
      const response = await fetch('/api/batches')
      const data = await response.json()
      setBatches(data.batches ?? [])
      setYoloClasses(data.classes ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources')
      const data = await response.json()
      setSources(data.sources ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const createSource = async (name) => {
    const trimmed = (name ?? '').trim()
    if (!trimmed) return
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus(`Created source ${data.name} · v${data.version}`)
        await fetchSources()
        return data
      }
      setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
    } catch {
      setStatus('Failed: could not reach the server')
    }
    return null
  }

  const deleteSource = async (id) => {
    try {
      const response = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setStatus('Source deleted (batches untagged)')
        fetchSources()
        fetchBatches()
      } else {
        const data = await response.json()
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

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      setTemplates(data.templates ?? [])
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const fetchArchives = async () => {
    try {
      const response = await fetch('/api/archives')
      const data = await response.json()
      if (response.ok) setArchives(data.archives ?? [])
    } catch {
      // ignore
    }
  }

  const doDeleteArchive = async (id) => {
    setConfirmingDeleteArchive(null)
    try {
      const response = await fetch(`/api/archives/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        setStatus('Failed: could not delete archive')
        return
      }
      setStatus('Archive deleted')
      fetchArchives()
    } catch {
      setStatus('Failed: could not reach the server')
    }
  }

  const handleImportArchiveFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setUploadingArchive(true)
    setStatus('Uploading and restoring archive...')
    try {
      const response = await fetch('/api/archives/import', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'import failed'}`)
        return
      }
      setStatus(
        `Restored dataset ${data.dataset} (${data.images} images) from ${data.archive}`,
      )
      setImportArchiveOpen(false)
      fetchArchives()
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setUploadingArchive(false)
    }
  }

  const doRestoreArchive = async (id) => {
    if (restoringArchiveId) return
    setRestoringArchiveId(id)
    setStatus('Restoring dataset...')
    try {
      const response = await fetch(`/api/archives/${id}/restore`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus(`Failed: ${data.detail || 'restore failed'}`)
        return
      }
      setStatus(`Restored dataset ${data.dataset} (${data.images} images)`)
      setImportArchiveOpen(false)
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setRestoringArchiveId(null)
    }
  }

  useEffect(() => {
    fetchBatches()
    fetchSources()
    fetchDatasets()
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (archivesOpen || importArchiveOpen) fetchArchives()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivesOpen, importArchiveOpen])

  const value = {
    status,
    setStatus,
    batches,
    yoloClasses,
    sources,
    datasets,
    templates,
    archives,
    exportFormat,
    setExportFormat,
    exportGroupSplit,
    setExportGroupSplit,
    archivesOpen,
    setArchivesOpen,
    importArchiveOpen,
    setImportArchiveOpen,
    uploadingArchive,
    restoringArchiveId,
    confirmingDeleteArchive,
    setConfirmingDeleteArchive,
    fetchBatches,
    fetchSources,
    createSource,
    deleteSource,
    fetchDatasets,
    fetchTemplates,
    fetchArchives,
    doDeleteArchive,
    handleImportArchiveFile,
    doRestoreArchive,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}
