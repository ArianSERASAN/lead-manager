import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from './config/sentry'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/Shared/ErrorBoundary'

initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Register Service Worker — production only to avoid caching dev-mode modules
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app works normally without it
    });
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // In dev mode, unregister any stale service workers that could cache
  // Vite-transformed modules and cause "multiple React copies" errors
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
