import { useEffect, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import ConfirmModal from './components/ConfirmModal'
import UserPickerModal from './components/UserPickerModal'
import ArchivesPage from './pages/ArchivesPage'
import DatasetWorkspace from './pages/DatasetWorkspace'
import DatasetsPage from './pages/DatasetsPage'
import RawImagesPage from './pages/RawImagesPage'
import { useAppData } from './context/AppDataContext'
import { useUser } from './context/UserContext'

function App() {
  const [, setRelativeTimeTick] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const {
    confirmingDeleteArchive,
    setConfirmingDeleteArchive,
    doDeleteArchive,
  } = useAppData()
  const {
    currentUser,
    users,
    userPickerOpen,
    confirmUser,
    closeUserPicker,
    openUserPicker,
    switchUser,
  } = useUser()

  const activePage = location.pathname.startsWith('/datasets')
    ? 'datasets'
    : location.pathname.startsWith('/archives')
      ? 'archives'
      : 'raw_image'

  // keeps relative timestamps ("3 mins ago") fresh without refetching
  useEffect(() => {
    const interval = setInterval(() => setRelativeTimeTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50">
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-8">
        <header className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              Dataset Collector
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activePage === 'raw_image'
                ? 'Upload TARs and curate imported, frames, and crops'
                : activePage === 'datasets'
                  ? 'Organize batches and export datasets'
                  : 'Manage stored dataset archives'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/raw-images')}
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
              onClick={() => navigate('/datasets')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'datasets'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Datasets
            </button>
            <button
              type="button"
              onClick={() => navigate('/archives')}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activePage === 'archives'
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Archives
            </button>
            {currentUser ? (
              <button
                type="button"
                onClick={switchUser}
                title="Switch annotator"
                className="ml-1 flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.902.902 0 01-.24-.631C1.25 13.041 3.71 11.75 5.75 11.75c.95 0 1.813.216 2.546.57a5.48 5.48 0 00-.367 2.156l-.004.407a4.467 4.467 0 01-1.644.549 12.978 12.978 0 01-4.791-.106zM16 8a2 2 0 11-4 0 2 2 0 014 0zm5.68 7.326a.9.9 0 00.24-.631c0-1.653-2.46-2.945-4.5-2.945-.94 0-1.8.212-2.528.562.232.664.36 1.377.367 2.146l.003.426a4.5 4.5 0 001.668.556 13.013 13.013 0 004.75-.114zM10 11.25c-2.41 0-4.75 1.52-4.75 3.438 0 .06.003.118.01.176.51 2.054 2.41 3.386 4.74 3.386 2.33 0 4.23-1.332 4.74-3.386a.94.94 0 00.01-.176c0-1.918-2.34-3.438-4.75-3.438z" />
                </svg>
                {currentUser}
              </button>
            ) : (
              <button
                type="button"
                onClick={openUserPicker}
                title="Choose who's working"
                className="ml-1 flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
                Who's working?
              </button>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/raw-images" replace />} />
          <Route path="/raw-images" element={<RawImagesPage />} />
          <Route path="/raw-images/:batch" element={<RawImagesPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/datasets/:name" element={<DatasetWorkspace />} />
          <Route path="/archives" element={<ArchivesPage />} />
          <Route path="*" element={<Navigate to="/raw-images" replace />} />
        </Routes>
      </main>

      {userPickerOpen && (
        <UserPickerModal
          users={users}
          onConfirm={confirmUser}
          onClose={closeUserPicker}
        />
      )}

      {confirmingDeleteArchive && (
        <ConfirmModal
          count={1}
          title={`Delete ${confirmingDeleteArchive.name}?`}
          message="This permanently deletes the archive file from the server. This action cannot be undone."
          onCancel={() => setConfirmingDeleteArchive(null)}
          onConfirm={() => doDeleteArchive(confirmingDeleteArchive.id)}
        />
      )}
    </div>
  )
}

export default App
