import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import ConfirmModal from '../components/ConfirmModal'
import CreateDatasetModal from '../components/CreateDatasetModal'
import ExportDatasetsModal from '../components/ExportDatasetsModal'
import ImportArchiveModal from '../components/ImportArchiveModal'
import SkeletonImg from '../components/SkeletonImg'
import { PlusIcon } from '../components/icons'
import { useAppData } from '../context/AppDataContext'
import { useDataset } from '../context/DatasetContext'
import { formatRelativeTime } from '../utils'

export function DatasetsEmptyState() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
      <div className="m-6 flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-400">
        Select a dataset on the left to open its workspace
      </div>
    </div>
  )
}

export default function DatasetsLayout() {
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
      <section className="relative z-20 mt-6 flex min-h-0 min-w-0 flex-1 gap-4">
        {/* ---- sidebar: dataset list ---- */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 border-b border-slate-200/70 p-3">
            <h2 className="text-sm font-semibold text-slate-800">Datasets</h2>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {datasets.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {datasets.map((d) => {
              const active = activeDataset === d.name
              const checkedRemove = selectedDatasetsToRemove.has(d.name)
              const checkedExport = selectedDatasetsToExport.has(d.name)
              const picking = removeDatasetMode || exportDatasetMode
              return (
                <div
                  key={d.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (removeDatasetMode) {
                      setSelectedDatasetsToRemove((prev) => {
                        const next = new Set(prev)
                        checkedRemove ? next.delete(d.name) : next.add(d.name)
                        return next
                      })
                    } else if (exportDatasetMode) {
                      setSelectedDatasetsToExport((prev) => {
                        const next = new Set(prev)
                        checkedExport ? next.delete(d.name) : next.add(d.name)
                        return next
                      })
                    } else {
                      openDataset(d.name)
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && openDataset(d.name)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
                    active && !picking
                      ? 'bg-indigo-100'
                      : checkedRemove
                        ? 'bg-red-50'
                        : checkedExport
                          ? 'bg-emerald-50'
                          : 'hover:bg-slate-100'
                  }`}
                >
                  {picking && (
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                        checkedRemove
                          ? 'border-red-500 bg-red-500 text-white'
                          : checkedExport
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  )}
                  {d.previews && d.previews.length > 0 ? (
                    <SkeletonImg
                      src={`/api${d.previews[0]}`}
                      alt=""
                      className="h-9 w-14 shrink-0 rounded bg-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded bg-slate-100 text-[9px] text-slate-400">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-semibold ${
                        active && !picking ? 'text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {d.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {d.framework
                        ? `${d.framework}${d.model ? ` / ${d.model}` : ''}`
                        : 'No framework'}
                      {' · '}
                      {d.batches?.length ?? 0} batch
                      {(d.batches?.length ?? 0) === 1 ? '' : 'es'}
                    </p>
                    {d.last_annotated_at && (
                      <p className="truncate text-[10px] text-slate-400">
                        Updated {formatRelativeTime(d.last_annotated_at)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {datasets.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                No datasets yet — assign a batch to create one
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 p-2">
            {removeDatasetMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmingRemoveDatasets(true)}
                  disabled={selectedDatasetsToRemove.size === 0}
                  className="flex-1 rounded-lg bg-red-500 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-40"
                >
                  Delete ({selectedDatasetsToRemove.size})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveDatasetMode(false)
                    setSelectedDatasetsToRemove(new Set())
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </>
            ) : exportDatasetMode ? (
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
                  className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Export ({selectedDatasetsToExport.size})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportDatasetMode(false)
                    setSelectedDatasetsToExport(new Set())
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div ref={newDatasetMenuRef} className="relative">
                  <button
                    type="button"
                    disabled={creatingDataset}
                    onClick={() => setNewDatasetMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-xs font-medium text-white shadow transition hover:bg-indigo-600 disabled:opacity-40"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    {creatingDataset ? 'Creating...' : 'New'}
                    <svg
                      className={`h-3 w-3 transition-transform ${newDatasetMenuOpen ? 'rotate-180' : ''}`}
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
                    <div className="absolute bottom-full left-0 z-30 mb-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
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
                <button
                  type="button"
                  onClick={() => {
                    setExportDatasetMode(true)
                    setSelectedDatasetsToExport(new Set())
                  }}
                  className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveDatasetMode(true)
                    setSelectedDatasetsToRemove(new Set())
                  }}
                  className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ---- main pane ---- */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
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
