// ═══════════════════════════════════════════════════
// KlasWerk — Entry Point
// ═══════════════════════════════════════════════════

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from '@/App'

const root = document.getElementById('root')

if (!root) {
  throw new Error('[KlasWerk] #root element not found in index.html')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
