import { useEffect, useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import CreateDatasetModal from '../components/CreateDatasetModal'
import ExportDatasetsModal from '../components/ExportDatasetsModal'
import ImportArchiveModal from '../components/ImportArchiveModal'
import SkeletonImg from '../components/SkeletonImg'
import { PlusIcon } from '../components/icons'
import { useAppData } from '../context/AppDataContext'
import { useDataset } from '../context/DatasetContext'
import { formatRelativeTime } from '../utils'

export default function DatasetsPage() {
  const {
    setStatus,
    datasets,
    fetchDatasets,
    templates,
    archives,
    exportFormat,
    setExportFormat,
    exportGroupSplit,
    setExportGroupSplit,
    importArchiveOpen,
    setImportArchiveOpen,
    uploadingArchive,
    restoringArchiveId,
    handleImportArchiveFile,
    doRestoreArchive,
  } = useAppData()
  const { openDataset, activeDataset } = useDataset()

  const [removeDatasetMode, setRemoveDatasetMode] = useState(false)
  const [selectedDatasetsToRemove, setSelectedDatasetsToRemove] = useState(new Set())
  const [exportDatasetMode, setExportDatasetMode] = useState(false)
  const [selectedDatasetsToExport, setSelectedDatasetsToExport] = useState(new Set())
  const [exportDatasetsOpen, setExportDatasetsOpen] = useState(false)
  const [multiExportName, setMultiExportName] = useState('')
  const [multiExportSplit, setMultiExportSplit] = useState({ train: 70, val: 20, test: 10 })
  const [multiExporting, setMultiExporting] = useState(false)
  const [multiExportResult, setMultiExportResult] = useState(null)
  const [confirmingRemoveDatasets, setConfirmingRemoveDatasets] = useState(false)
  const [createDatasetOpen, setCreateDatasetOpen] = useState(false)
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [newDatasetMenuOpen, setNewDatasetMenuOpen] = useState(false)
  const newDatasetMenuRef = useRef(null)

  useEffect(() => {
    if (!newDatasetMenuOpen) return
    const handleClick = (e) => {
      if (
        newDatasetMenuRef.current &&
        !newDatasetMenuRef.current.contains(e.target)
      ) {
        setNewDatasetMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [newDatasetMenuOpen])

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

  const doExportDatasets = async () => {
    const total =
      Number(multiExportSplit.train) +
      Number(multiExportSplit.val) +
      Number(multiExportSplit.test)
    if (total !== 100) {
      setStatus(`Split must sum to 100 (currently ${total})`)
      return
    }
    const names = [...selectedDatasetsToExport]
    if (names.length < 2) {
      setStatus('Select at least two datasets')
      return
    }
    setMultiExporting(true)
    setMultiExportResult(null)
    setStatus(`Exporting ${names.length} datasets...`)
    try {
      const response = await fetch('/api/datasets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: multiExportName.trim() || 'combined',
          datasets: names,
          split: multiExportSplit,
          format: exportFormat,
          group_split: exportGroupSplit,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        const total = data.counts.train + data.counts.val + data.counts.test
        const missing = data.missing_annotations ?? 0
        setStatus(
          `Exported ${data.name}: train ${data.counts.train}, val ${data.counts.val}, test ${data.counts.test}` +
            (missing > 0 ? ` — ${missing}/${total} images not annotated` : ''),
        )
        setMultiExportResult(data)
      } else {
        setStatus(`Failed: ${data.detail ?? 'Unknown error'}`)
      }
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setMultiExporting(false)
    }
  }

  const doCreateDataset = async (name, template) => {
    if (creatingDataset) return
    const trimmed = (name ?? '').trim()
    if (!trimmed) return
    setCreatingDataset(true)
    setCreateDatasetOpen(false)
    try {
      const createRes = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          template,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) {
        setStatus(`Failed: ${createData.detail ?? 'Unknown error'}`)
        return
      }
      setStatus(`Created dataset ${createData.dataset}`)
      await fetchDatasets()
    } catch {
      setStatus('Failed: could not reach the server')
    } finally {
      setCreatingDataset(false)
    }
  }

  return (
    <>
      <section className="relative z-20 mt-6 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Datasets</h2>
          <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {datasets.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {!removeDatasetMode && !exportDatasetMode && !createDatasetOpen && (
              <div ref={newDatasetMenuRef} className="relative">
                <button
                  type="button"
                  disabled={creatingDataset}
                  onClick={() => setNewDatasetMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
                >
                  {!creatingDataset && <PlusIcon className="h-4 w-4" />}
                  {creatingDataset ? 'Creating...' : 'New dataset'}
                  <svg
                    className={`h-4 w-4 transition-transform ${newDatasetMenuOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {newDatasetMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setNewDatasetMenuOpen(false)
                        setCreateDatasetOpen(true)
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                    >
                      <span className="block font-medium">New dataset</span>
                      <span className="block text-xs text-slate-400">
                        Create an empty dataset
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDatasetMenuOpen(false)
                        setImportArchiveOpen(true)
                      }}
                      className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                    >
                      <span className="block font-medium">Import</span>
                      <span className="block text-xs text-slate-400">
                        Restore from a stored archive
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {!removeDatasetMode && !exportDatasetMode && !createDatasetOpen && (
              <button
                type="button"
                onClick={() => {
                  setExportDatasetMode(true)
                  setSelectedDatasetsToExport(new Set())
                }}
                className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100"
              >
                Export datasets
              </button>
            )}
            {!removeDatasetMode && !exportDatasetMode && !createDatasetOpen && (
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
            {exportDatasetMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setExportDatasetMode(false)
                    setMultiExportName('')
                    setMultiExportResult(null)
                    setExportDatasetsOpen(true)
                  }}
                  disabled={selectedDatasetsToExport.size < 2}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Export {selectedDatasetsToExport.size} dataset{selectedDatasetsToExport.size === 1 ? '' : 's'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportDatasetMode(false)
                    setSelectedDatasetsToExport(new Set())
                  }}
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </>
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
                } else if (exportDatasetMode) {
                  setSelectedDatasetsToExport((prev) => {
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
                activeDataset === d.name && !removeDatasetMode && !exportDatasetMode
                  ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white'
                  : ''
              } ${
                selectedDatasetsToRemove.has(d.name)
                  ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                  : ''
              } ${
                selectedDatasetsToExport.has(d.name)
                  ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white'
                  : ''
              }`}
            >
              {d.previews && d.previews.length > 0 ? (
                <SkeletonImg
                  src={`/api${d.previews[0]}`}
                  alt=""
                  className="absolute inset-0 h-full w-full bg-slate-200 object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
                  No images
                </div>
              )}
              {(removeDatasetMode || exportDatasetMode) && (
                <div
                  className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-sm font-bold shadow ${
                    selectedDatasetsToRemove.has(d.name)
                      ? 'bg-red-500 text-white'
                      : selectedDatasetsToExport.has(d.name)
                        ? 'bg-emerald-500 text-white'
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
                {d.last_annotated_at && (
                  <p className="truncate text-[10px] text-slate-300">
                    Updated {formatRelativeTime(d.last_annotated_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </section>

      {confirmingRemoveDatasets && (
        <ConfirmModal
          count={selectedDatasetsToRemove.size}
          title={`Delete ${selectedDatasetsToRemove.size} dataset${selectedDatasetsToRemove.size === 1 ? '' : 's'}?`}
          message="This will remove the selected datasets and their annotations. Batches and images will remain in Raw Image. This action cannot be undone."
          onCancel={() => setConfirmingRemoveDatasets(false)}
          onConfirm={doRemoveDatasets}
        />
      )}

      {exportDatasetsOpen && (
        <ExportDatasetsModal
          datasets={[...selectedDatasetsToExport]}
          name={multiExportName}
          onNameChange={setMultiExportName}
          split={multiExportSplit}
          onSplitChange={setMultiExportSplit}
          format={exportFormat}
          onFormatChange={setExportFormat}
          groupSplit={exportGroupSplit}
          onGroupSplitChange={setExportGroupSplit}
          result={multiExportResult}
          exporting={multiExporting}
          onExport={doExportDatasets}
          onClose={() => setExportDatasetsOpen(false)}
        />
      )}

      {createDatasetOpen && (
        <CreateDatasetModal
          templates={templates}
          creating={creatingDataset}
          onCreate={doCreateDataset}
          onClose={() => setCreateDatasetOpen(false)}
        />
      )}

      {importArchiveOpen && (
        <ImportArchiveModal
          archives={archives}
          uploading={uploadingArchive}
          restoringId={restoringArchiveId}
          onUploadFile={handleImportArchiveFile}
          onRestore={doRestoreArchive}
          onClose={() => setImportArchiveOpen(false)}
        />
      )}
    </>
  )
}
