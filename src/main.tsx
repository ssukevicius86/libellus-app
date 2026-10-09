import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import { AmbienceProvider } from '@/context/AmbienceContext'
import { AuthProvider } from '@/context/AuthContext'
import { PreferencesProvider } from '@/context/PreferencesContext'
import App from './App'
import './index.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PreferencesProvider>
        <AuthProvider>
          <AmbienceProvider>
            <App />
          </AmbienceProvider>
        </AuthProvider>
      </PreferencesProvider>
    </BrowserRouter>
  </StrictMode>,
)
