import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/pages/Navbar.tsx'
import trackingClient from './services/trackingClient'
import ConsentBanner from './components/ConsentBanner'

// Check if recording is enabled and start if consent granted
fetch('/api/analytics/recording', { credentials: 'include' })
  .then((r) => r.json())
  .then((d) => {
    try {
      const consent = localStorage.getItem('analytics_consent');
      if (d.enabled && consent === 'granted') {
        trackingClient.startRecording();
      }
    } catch {}
  })
  .catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ConsentBanner />
    </BrowserRouter>
  </StrictMode>,
)
