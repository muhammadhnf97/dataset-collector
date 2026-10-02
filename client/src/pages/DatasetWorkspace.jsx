import ArchivesModal from '../components/ArchivesModal'
import AssignToDatasetModal from '../components/AssignToDatasetModal'
import BatchWarnModal from '../components/BatchWarnModal'
import ConfirmModal from '../components/ConfirmModal'
import DatasetBatchSection from '../components/DatasetBatchSection'
import DatasetSettingsModal from '../components/DatasetSettingsModal'
import DatasetSimilarView from '../components/DatasetSimilarView'
import ExportDatasetModal from '../components/ExportDatasetModal'
import ImageModal from '../components/ImageModal'
import ImportBatchModal from '../components/ImportBatchModal'
import LeaderboardModal from '../components/LeaderboardModal'
import PrelabelStatsModal from '../components/PrelabelStatsModal'
import ReviewSelectionModal from '../components/ReviewSelectionModal'
import { ArrowIcon } from '../components/icons'
import { useAppData } from '../context/AppDataContext'
import { useDataset } from '../context/DatasetContext'
import { useUser } from '../context/UserContext'
import {
  GRID_COL_OPTIONS,
  formatRelativeTime,
  mergeReviewerMaps,
  sortedReviewers,
  useLocalStorage,
} from '../utils'

export default function DatasetWorkspace() {
  const {
    setStatus,
    datasets,
    templates,
    archives,
    archivesOpen,
    setArchivesOpen,
    batches,
    exportFormat,
    setExportFormat,
    exportGroupSplit,
    setExportGroupSplit,
    setConfirmingDeleteArchive,
  } = useAppData()
  const { currentUser, requireUser } = useUser()
  const ds = useDataset()
  const [toolbarOpen, setToolbarOpen] = useLocalStorage('dataset-toolbar-open', true)

  const {
    datasetName,
    activeDataset,
    datasetBatches,
    datasetImageGroups,
    datasetAnnotations,
    datasetAnnotationTimes,
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
    lastEditedImage,
    datasetTotals,
    batchReviewedCounts,
    datasetActiveImages,
    datasetGridRef,
    marqueeRect,
    handleDatasetImagesLoaded,
    navigateDatasetModal,
    openAttrAnnotate,
    attrValuesFor,
    applyAttrValue,
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
    onGridClickCapture,
    openDatasetImage,
    removeSelectedDatasetImages,
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
  } = ds

  if (!datasetName || !activeDataset) return null

  const visibleStems = datasetBatchFilter
    ? [datasetBatchFilter]
    : datasetBatches
  const currentDataset = datasets.find((d) => d.name === activeDataset)
  const templatePath =
    currentDataset?.framework && currentDataset?.model
      ? `${currentDataset.framework}/${currentDataset.model}`.toLowerCase()
      : ''
  const activeTemplate = templates.find((t) => t.name === templatePath)
  const templateModels = activeTemplate?.models ?? []
  const effectiveModel =
    prelabelModel || activeTemplate?.default_model || ''

  return (
    <>
      <section className="relative z-20 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-sm">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeDataset}
          </h2>
          <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {datasetTotals.annotated} / {datasetTotals.total} annotated
          </span>
          {datasetBatches.length > 0 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setDatasetGridMode((m) =>
                    m === 'landscape'
                      ? 'portrait'
                      : m === 'portrait'
                        ? 'natural'
                        : 'landscape',
                  )
                }
                title={`Grid: ${datasetGridMode} — click to switch`}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-100"
              >
                {datasetGridMode === 'landscape' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <rect x="3" y="7" width="18" height="10" rx="1.5" />
                  </svg>
                ) : datasetGridMode === 'portrait' ? (
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
                value={datasetGridCols[datasetGridMode]}
                onChange={(e) =>
                  setDatasetGridCols((prev) => ({
                    ...prev,
                    [datasetGridMode]: Number(e.target.value),
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
              <button
                type="button"
                onClick={() => setToolbarOpen((v) => !v)}
                title={toolbarOpen ? 'Hide batch toolbar' : 'Show batch toolbar'}
                className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                  toolbarOpen
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${toolbarOpen ? '' : 'rotate-180'}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <div ref={batchActionsMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setBatchActionsMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
              >
                Batch
                <svg
                  className={`h-4 w-4 transition-transform ${batchActionsMenuOpen ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {batchActionsMenuOpen && (
                <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchActionsMenuOpen(false)
                      setImportBatchOpen(true)
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    <span className="block font-medium">Attach batch</span>
                    <span className="block text-xs text-slate-400">
                      Link a raw batch to this dataset
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!datasetBatchFilter}
                    onClick={() => {
                      setBatchActionsMenuOpen(false)
                      setDatasetBatchToRemove(datasetBatchFilter)
                      setConfirmingRemoveDatasetBatch(true)
                    }}
                    className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <span className="block font-medium">Detach batch</span>
                    <span className="block text-xs text-slate-400">
                      Remove the selected batch link — files are kept
                    </span>
                  </button>
                </div>
              )}
            </div>
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={datasetBatches.length === 0}
                className="flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
              >
                Export
                <svg
                  className={`h-4 w-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      setShowExportPanel(true)
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    <span className="block font-medium">Export dataset</span>
                    <span className="block text-xs text-slate-400">
                      Train-format archive for the model
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      setArchivesOpen(true)
                    }}
                    className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50"
                  >
                    <span className="block font-medium">Archives</span>
                    <span className="block text-xs text-slate-400">
                      Restorable snapshots stored on the server
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={fetchPrelabelStats}
              disabled={!templatePath || prelabelStatsLoading}
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-100 disabled:opacity-40"
            >
              {prelabelStatsLoading ? 'Loading...' : 'Pre-label Stats'}
            </button>
            <button
              type="button"
              onClick={fetchActivity}
              disabled={activityLoading}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              {activityLoading ? 'Loading...' : 'Leaderboard'}
            </button>
            <button
              type="button"
              onClick={openDatasetSettings}
              title="Dataset settings"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {toolbarOpen && datasetBatches.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-y border-slate-200/70 bg-slate-50/60 px-5 py-2">
            <div ref={batchMenuRef} className="relative">
              {(() => {
                const current = datasetBatchFilter ?? datasetBatches[0] ?? ''
                const curLabel = `${current.replace(/^raw-images_/, '')}${
                  datasetBatchSources[current]
                    ? ` — ${datasetBatchSources[current].name} · v${datasetBatchSources[current].version}`
                    : ''
                }`
                return (
                  <button
                    type="button"
                    onClick={() => setBatchMenuOpen((v) => !v)}
                    title={curLabel}
                    className="flex w-48 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 outline-none transition hover:bg-slate-100"
                  >
                    <span className="truncate">{curLabel}</span>
                    <span className="text-slate-400">▾</span>
                  </button>
                )
              })()}
              {batchMenuOpen && (
                <div className="absolute left-0 top-full z-40 mt-1 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="max-h-80 overflow-y-auto">
                    {datasetBatches.map((batch) => {
                      const label = `${batch}${
                        datasetBatchSources[batch]
                          ? ` — ${datasetBatchSources[batch].name} · v${datasetBatchSources[batch].version}`
                          : ''
                      }`
                      const info = batchHandlers[batch]
                      const pct =
                        info?.coverage != null
                          ? Math.round(info.coverage * 100)
                          : 0
                      const stats = datasetBatchStats[batch]
                      const hs = (info?.handlers ?? []).map((h) => h.user)
                      const hsLabel =
                        hs.length > 2
                          ? `${hs.slice(0, 2).join(', ')} +${hs.length - 2}`
                          : hs.join(', ')
                      const isCurrent =
                        batch === (datasetBatchFilter ?? datasetBatches[0])
                      const revCount = batchReviewedCounts[batch] ?? 0
                      const annAll =
                        (stats?.total ?? 0) > 0 &&
                        stats.annotated === stats.total
                      const untouched =
                        (stats?.annotated ?? 0) === 0 && pct === 0
                      const dotCls =
                        pct >= 100
                          ? 'bg-emerald-500'
                          : untouched
                            ? 'border border-slate-300 bg-transparent'
                            : 'bg-indigo-500'
                      return (
                        <button
                          key={batch}
                          type="button"
                          onClick={() => {
                            setDatasetBatchFilter(batch)
                            setSelectedDatasetImages(new Set())
                            setSimilarView(null)
                            setBatchMenuOpen(false)
                          }}
                          className={`block w-full px-3 py-2 text-left transition hover:bg-indigo-50 ${
                            isCurrent ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="flex min-w-0 items-center truncate text-sm font-medium text-slate-700"
                              title={label}
                            >
                              <span
                                className={`mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${dotCls}`}
                              />
                              {isCurrent && (
                                <span className="mr-1 text-indigo-500">✓</span>
                              )}
                              <span className="truncate">{label}</span>
                            </span>
                            <span
                              className={`shrink-0 text-xs font-semibold ${
                                pct >= 100
                                  ? 'text-emerald-600'
                                  : pct > 0
                                    ? 'text-indigo-600'
                                    : 'text-slate-400'
                              }`}
                            >
                              {pct >= 100 ? '✓ ' : ''}
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-slate-400">
                            {annAll ? (
                              <span className="text-emerald-600">
                                Pre-labels ✓
                              </span>
                            ) : (stats?.annotated ?? 0) > 0 ? (
                              `Pre-labels ${stats.annotated}/${stats.total}`
                            ) : (
                              <span className="italic text-amber-600">
                                not pre-labeled yet
                              </span>
                            )}
                            {` · reviewed ${revCount}/${stats?.total ?? 0}`}
                            {hsLabel ? ` · ${hsLabel}` : ''}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {(datasetBatchStats[datasetBatchFilter]?.annotated ??
                0)}{' '}
              / {datasetBatchStats[datasetBatchFilter]?.total ?? 0}{' '}
              annotated
            </span>
            {(() => {
              const info = batchHandlers[datasetBatchFilter]
              const hs = info?.handlers ?? []
              if (!hs.length) return null
              const pct = info.coverage != null ? Math.round(info.coverage * 100) : null
              const hasOthers = hs.some((h) => h.user !== currentUser)
              return (
                <div ref={handlersMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setHandlersMenuOpen((v) => !v)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      hasOthers
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {pct ?? '—'}% ▾
                  </button>
                  {handlersMenuOpen && (
                    <div className="absolute left-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Contributors
                      </div>
                      {hs.map((h) => (
                        <div
                          key={h.user}
                          className="flex items-center justify-between px-3 py-1.5 text-sm"
                        >
                          <span className="text-slate-700">
                            {h.user}
                            {h.user === currentUser ? ' (you)' : ''}
                          </span>
                          <span className="text-xs text-slate-400">
                            {h.coverage != null ? `${Math.round(h.coverage * 100)}%` : '—'}
                            {h.last_activity ? ` · ${formatRelativeTime(h.last_activity)}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            <div className="h-5 w-px bg-slate-300" />
            <div className="ml-auto flex items-center gap-2">
              <div ref={prelabelMenuRef} className="relative">
                <div className="flex overflow-hidden rounded-full border border-indigo-300 bg-indigo-50">
                  <button
                    type="button"
                    onClick={() => doPrelabel(true)}
                    disabled={!templatePath || preLabeling}
                    title="Runs the model and overwrites both the corrected value and the pre-label prediction"
                    className="px-3 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
                  >
                    {preLabeling ? 'Pre-labeling...' : 'Pre-label'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrelabelMenuOpen((v) => !v)}
                    disabled={!templatePath || preLabeling}
                    className="border-l border-indigo-300 px-2 text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-40"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${prelabelMenuOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                {prelabelMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {templateModels.length > 0 && (
                      <div className="border-b border-slate-100 px-4 py-2">
                        <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          Model
                        </label>
                        <select
                          value={effectiveModel}
                          onChange={(e) => setPrelabelModel(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none"
                        >
                          {templateModels.map((m) => (
                            <option key={m} value={m}>
                              {m.replace(/^model\//, '').replace(/\.tar$/, '')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPrelabelMenuOpen(false)
                        doPrelabel(true)
                      }}
                      disabled={!templatePath || preLabeling}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-40"
                    >
                      <span className="block font-medium">Pre-label</span>
                      <span className="block text-xs text-slate-400">
                        Overwrites value and pre-label
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrelabelMenuOpen(false)
                        doPrelabel(false)
                      }}
                      disabled={!templatePath || preLabeling}
                      className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-sky-50 disabled:opacity-40"
                    >
                      <span className="block font-medium">Pre-label Only</span>
                      <span className="block text-xs text-slate-400">
                        Only updates the pre-label, keeps your value
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <div ref={attrMenuRef} className="relative">
                <div className="flex overflow-hidden rounded-full border border-emerald-300 bg-emerald-50">
                  <button
                    type="button"
                    onClick={() => requireUser(() => openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter))}
                    disabled={!templatePath || preLabeling}
                    className="px-3 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40"
                  >
                    Correct Attribute
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttrMenuOpen((v) => !v)}
                    disabled={!templatePath || preLabeling}
                    className="border-l border-emerald-300 px-2 text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${attrMenuOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                {attrMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setAttrMenuOpen(false)
                        requireUser(() => openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter))
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                    >
                      <span className="block font-medium">From start</span>
                      <span className="block text-xs text-slate-400">
                        Begin at the first image
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAttrMenuOpen(false)
                        requireUser(async (name) => {
                          let target = name === currentUser ? myLastEdit : null
                          if (!target) {
                            const batch = datasetBatchFilter?.replace(/^raw-images_/, '')
                            try {
                              const params = new URLSearchParams({ user: name })
                              if (batch) params.set('batch', batch)
                              const res = await fetch(
                                `/api/datasets/${encodeURIComponent(activeDataset)}/last-edit?${params}`,
                              )
                              const data = await res.json()
                              target = res.ok && data.image ? data : null
                              ds.setMyLastEdit?.(target)
                            } catch {
                              target = null
                            }
                          }
                          openAttrAnnotate(activeDataset, templatePath, datasetBatchFilter, target?.image, target?.attr_index)
                        })
                      }}
                      disabled={currentUser ? !myLastEdit?.image : false}
                      className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 disabled:opacity-40"
                    >
                      <span className="block font-medium">From last edited</span>
                      <span className="block text-xs text-slate-400">
                        {myLastEdit?.image
                          ? `Resume at your last edited image${
                              datasetAttributes?.[myLastEdit.attr_index]
                                ? ` (${datasetAttributes[myLastEdit.attr_index].alias ?? datasetAttributes[myLastEdit.attr_index].name})`
                                : ''
                            }`
                          : "You haven't edited this batch yet"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (datasetSelectMode) {
                    setSelectedDatasetImages(new Set())
                  }
                  setDatasetSelectMode((v) => !v)
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  datasetSelectMode
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {datasetSelectMode ? 'Cancel' : 'Select images'}
              </button>
              <button
                type="button"
                onClick={() =>
                  similarView ? setSimilarView(null) : fetchSimilar()
                }
                disabled={similarLoading || !datasetBatchFilter}
                title="Group near-duplicate images together for review"
                className={`rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40 ${
                  similarView
                    ? 'border-violet-300 bg-violet-50 text-violet-600 hover:bg-violet-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {similarLoading
                  ? 'Analyzing...'
                  : similarView
                    ? 'Exit similar'
                    : 'Group similar'}
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          ref={datasetGridRef}
          className={`relative px-6 py-5 ${datasetSelectMode || similarView ? 'select-none' : ''}`}
          onPointerDown={onGridPointerDown}
          onClickCapture={onGridClickCapture}
          onDragStart={(e) => e.preventDefault()}
        >
        {marqueeRect && (
          <div
            className="pointer-events-none absolute z-20 rounded border-2 border-indigo-400 bg-indigo-400/15"
            style={marqueeRect}
          />
        )}
        {similarView ? (
          <DatasetSimilarView
            clusters={similarView.clusters}
            singles={similarView.singles}
            annotations={datasetAnnotations}
            annotationTimes={datasetAnnotationTimes}
            reviewed={datasetReviewed}
            selected={selectedDatasetImages}
            onToggleSelect={toggleDatasetImageSelect}
            onOpenImage={openDatasetImage}
            onKeepRest={selectClusterRest}
            onKeepRestAll={selectAllClusterRest}
            threshold={similarThreshold}
            onThresholdChange={(t) => {
              ds.setSimilarThreshold(t)
              fetchSimilar(t)
            }}
            mode={datasetGridMode}
            cols={datasetGridCols[datasetGridMode]}
            attributes={datasetAttributes}
            lastEdited={lastEditedImage}
          />
        ) : visibleStems.length === 0 ? (
          <div className="mt-4 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 py-10 text-sm text-slate-400">
            No images in this dataset
          </div>
        ) : (
          visibleStems.map((stem) => (
            <DatasetBatchSection
              key={`${stem}-${datasetRefreshKey}`}
              dataset={activeDataset}
              stem={stem}
              stats={datasetBatchStats[stem]}
              images={datasetImageGroups[stem] ?? []}
              annotations={datasetAnnotations}
              annotationTimes={datasetAnnotationTimes}
              reviewed={datasetReviewed}
              refreshKey={datasetRefreshKey}
              onImagesLoaded={handleDatasetImagesLoaded}
              onOpenImage={openDatasetImage}
              removeMode={datasetSelectMode}
              selected={selectedDatasetImages}
              onToggleSelect={toggleDatasetImageSelect}
              mode={datasetGridMode}
              cols={datasetGridCols[datasetGridMode]}
              attributes={datasetAttributes}
              lastEdited={lastEditedImage}
            />
          ))
        )}
        </div>
        </div>
      </section>

      <ImageModal
        images={datasetActiveImages}
        index={datasetModalIndex}
        onClose={() => setDatasetModalIndex(null)}
        onNavigate={navigateDatasetModal}
        onSelect={setDatasetModalIndex}
        onAnnotate={(image, attrIndex = null) => {
          setDatasetModalIndex(null)
          const ds2 = datasets.find((d) => d.name === activeDataset)
          const tp =
            ds2?.framework && ds2?.model
              ? `${ds2.framework}/${ds2.model}`.toLowerCase()
              : ''
          const inFilter = datasetBatchFilter
            ? (datasetImageGroups[datasetBatchFilter] ?? []).includes(image)
            : true
          const bf = inFilter
            ? datasetBatchFilter
            : (Object.keys(datasetImageGroups).find((k) =>
                (datasetImageGroups[k] ?? []).includes(image),
              ) ?? null)
          requireUser(() => openAttrAnnotate(activeDataset, tp, bf, image, attrIndex, true))
        }}
        attributes={datasetAttributes}
        annotations={datasetAnnotations}
        reviewed={datasetReviewed}
      />

      {attrAnnotate && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-6 py-4">
          <div className="relative flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-4 py-3">
              <div className="flex items-center gap-3">
                {attrAnnotate.returnToViewer && (
                  <button
                    type="button"
                    title="Back to image view"
                    onClick={closeAttrAnnotate}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    <ArrowIcon direction="left" className="h-4 w-4" />
                    Back
                  </button>
                )}
                <span className="rounded-full bg-slate-200/80 px-3 py-1.5 text-sm font-medium text-slate-800">
                  {attrAnnotate.dataset}
                  {attrAnnotate.batchFilter && (
                    <>
                      {' · '}
                      {attrAnnotate.batchFilter.replace(/_/g, '/')}
                    </>
                  )}
                  {' · '}{attrAnnotate.imgIndex + 1} / {attrAnnotate.images.length}
                </span>
                <select
                  value={attrAnnotate.attrIndex}
                  onChange={(e) =>
                    setAttrAnnotate((s) => ({
                      ...s,
                      attrIndex: parseInt(e.target.value, 10),
                      imgIndex: 0,
                      done: false,
                      doneReviewed: null,
                    }))
                  }
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none"
                >
                  {attrAnnotate.attributes.map((attr, i) => (
                    <option key={attr.name} value={i}>
                      {attr.alias ?? attr.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {!attrAnnotate.done && (
                <button
                  type="button"
                  title="Remove from dataset"
                  onClick={() => setConfirmingRemoveAttrImage(true)}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-red-500/80 px-3 text-sm font-medium text-white transition hover:bg-red-500"
                >
                  Remove
                </button>
                )}
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

            {attrAnnotate.done ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">
                    You're done with{' '}
                    {attrAnnotate.attributes[attrAnnotate.attrIndex]?.alias ??
                      attrAnnotate.attributes[attrAnnotate.attrIndex]?.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {attrAnnotate.batchFilter
                      ? attrAnnotate.batchFilter.replace(/^raw-images_/, '').replace(/_/g, '/')
                      : attrAnnotate.dataset}
                    {attrAnnotate.doneReviewed != null && (
                      <>
                        {' — '}
                        {attrAnnotate.doneReviewed} / {attrAnnotate.images.length}{' '}
                        images reviewed by you
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {attrAnnotate.attributes.map((attr, i) =>
                    i === attrAnnotate.attrIndex ? null : (
                      <button
                        key={attr.name}
                        type="button"
                        onClick={() =>
                          setAttrAnnotate((s) => ({
                            ...s,
                            attrIndex: i,
                            imgIndex: 0,
                            done: false,
                            doneReviewed: null,
                          }))
                        }
                        className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        {attr.alias ?? attr.name}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAttrAnnotate(null)}
                  className="mt-2 rounded-full bg-indigo-500 px-6 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-600"
                >
                  Close
                </button>
              </div>
            ) : (
            <>
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
                        {group.alias ?? group.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Press a number, then use ← → to move.
                      </p>
                      {(() => {
                        const merged = mergeReviewerMaps(
                          datasetReviewed[image]?.[String(attrAnnotate.attrIndex)],
                          datasetReviewed[image]?.all,
                        )
                        const reviewers = sortedReviewers(merged)
                        if (reviewers.length === 0) return null
                        return (
                          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs text-sky-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5 shrink-0"
                          >
                            <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                            <path
                              fillRule="evenodd"
                              d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>
                            Reviewed by{' '}
                            {reviewers
                              .map(([user, at]) => `${user} · ${formatRelativeTime(at)}`)
                              .join(', ')}
                          </span>
                        </p>
                        )
                      })()}
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
                              {group.option_aliases?.[i] ?? option}
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
              {attrAnnotate.imgIndex >= attrAnnotate.images.length - 1 ? (
                <button
                  type="button"
                  onClick={finishAttrReview}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600"
                >
                  ✓ Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    attrNextImage()
                  }}
                  className="rounded-full bg-slate-200 px-4 py-1.5 text-sm text-slate-800 transition hover:bg-slate-300"
                >
                  Next →
                </button>
              )}
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {(datasetSelectMode || similarView) && selectedDatasetImages.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-xl backdrop-blur">
          <span className="text-sm font-medium text-slate-700">
            {selectedDatasetImages.size} selected
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedDatasetImages(new Set(datasetActiveImages))
            }
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelectedDatasetImages(new Set())}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              setReviewSelectedImages([...selectedDatasetImages])
              setReviewSelectedOpen(true)
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Review
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRemoveDatasetImages(true)}
            className="rounded-full bg-red-500 px-4 py-1 text-sm font-medium text-white transition hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      )}

      {reviewSelectedOpen && (
        <ReviewSelectionModal
          images={reviewSelectedImages}
          selected={selectedDatasetImages}
          onToggle={(src) =>
            setSelectedDatasetImages((prev) => {
              const next = new Set(prev)
              if (next.has(src)) {
                next.delete(src)
              } else {
                next.add(src)
              }
              return next
            })
          }
          onRemove={() => setConfirmingRemoveDatasetImages(true)}
          onClose={() => setReviewSelectedOpen(false)}
        />
      )}

      {confirmingRemoveDatasetImages && (
        <ConfirmModal
          count={selectedDatasetImages.size}
          title={`Remove ${selectedDatasetImages.size} image${selectedDatasetImages.size === 1 ? '' : 's'} from ${activeDataset}?`}
          message="This removes the images from the dataset list only. The original files will not be deleted."
          onCancel={() => setConfirmingRemoveDatasetImages(false)}
          onConfirm={removeSelectedDatasetImages}
        />
      )}

      {confirmingRemoveDatasetBatch && (
        <ConfirmModal
          count={
            datasetBatchStats[datasetBatchToRemove]?.total ??
            (datasetImageGroups[datasetBatchToRemove] ?? []).length
          }
          title={`Detach ${datasetBatchToRemove}?`}
          message="This removes all images in this batch from the dataset. The original files will not be deleted."
          confirmLabel="Detach"
          onCancel={() => setConfirmingRemoveDatasetBatch(false)}
          onConfirm={removeDatasetBatch}
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

      {confirmingRemoveActiveDataset && (
        <ConfirmModal
          count={datasetTotals.total}
          title={`Remove ${activeDataset}?`}
          message="This will remove the dataset and its annotations. Batches and images will remain in Raw Image. This action cannot be undone."
          onCancel={() => setConfirmingRemoveActiveDataset(false)}
          onConfirm={doRemoveActiveDataset}
        />
      )}

      {batchWarn && (
        <BatchWarnModal
          warn={batchWarn}
          currentUser={currentUser}
          onClose={() => setBatchWarn(null)}
        />
      )}

      {prelabelConfirmOpen && (
        <ConfirmModal
          count={prelabelConfirmCount}
          title="Pre-label will overwrite annotations"
          message={
            datasetBatchFilter
              ? `This batch already has ${prelabelConfirmCount} annotated image${prelabelConfirmCount === 1 ? '' : 's'}. Running pre-label will overwrite only this batch. Are you sure?`
              : `This dataset already has ${prelabelConfirmCount} annotated image${prelabelConfirmCount === 1 ? '' : 's'}. Running pre-label will overwrite them. Are you sure?`
          }
          onCancel={() => setPrelabelConfirmOpen(false)}
          onConfirm={() => runPrelabel(true)}
          confirmLabel="Overwrite"
        />
      )}

      {prelabelStatsOpen && prelabelStats && (
        <PrelabelStatsModal
          stats={prelabelStats}
          onClose={() => setPrelabelStatsOpen(false)}
        />
      )}

      {activityOpen && (
        <LeaderboardModal
          dataset={activeDataset}
          leaderboard={leaderboard}
          activity={activity}
          onClose={() => setActivityOpen(false)}
        />
      )}

      {showExportPanel && (
        <ExportDatasetModal
          dataset={activeDataset}
          batches={datasetBatches}
          split={datasetSplit}
          onSplitChange={setDatasetSplit}
          format={exportFormat}
          onFormatChange={setExportFormat}
          groupSplit={exportGroupSplit}
          onGroupSplitChange={setExportGroupSplit}
          selectedBatches={selectedExportBatches}
          onSelectedBatchesChange={setSelectedExportBatches}
          result={exportResult}
          exporting={exporting}
          onExport={doExportDataset}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {importBatchOpen && (
        <ImportBatchModal
          dataset={activeDataset}
          importedBatches={datasetBatches}
          importing={importingBatch}
          onImport={doImportBatch}
          onError={() => setStatus('Failed: could not reach the server')}
          onClose={() => setImportBatchOpen(false)}
        />
      )}

      {datasetSettingsOpen && (
        <DatasetSettingsModal
          dataset={datasets.find((d) => d.name === activeDataset)}
          templates={templates}
          batches={datasetBatches}
          batchStats={datasetBatchStats}
          saving={savingDatasetSettings}
          onSave={doSaveDatasetSettings}
          onRemoveBatch={(batch) => {
            setDatasetBatchToRemove(batch)
            setConfirmingRemoveDatasetBatch(true)
          }}
          onRemoveDataset={() => setConfirmingRemoveActiveDataset(true)}
          onClose={() => setDatasetSettingsOpen(false)}
        />
      )}

      {archivesOpen && (
        <ArchivesModal
          dataset={activeDataset}
          archives={archives}
          format={archiveFormat}
          onFormatChange={setArchiveFormat}
          archiving={archiving}
          onCreateArchive={doArchiveDataset}
          onDeleteArchive={setConfirmingDeleteArchive}
          onClose={() => setArchivesOpen(false)}
        />
      )}

      {assignToDatasetOpen && (
        <AssignToDatasetModal
          dataset={activeDataset}
          batches={batches}
          onAssign={doAssignBatchToDataset}
          onClose={() => setAssignToDatasetOpen(false)}
        />
      )}
    </>
  )
}

