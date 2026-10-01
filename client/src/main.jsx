import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AppDataProvider } from './context/AppDataContext'
import { DatasetProvider } from './context/DatasetContext'
import { UserProvider } from './context/UserContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <AppDataProvider>
          <DatasetProvider>
            <App />
          </DatasetProvider>
        </AppDataProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>,
)
