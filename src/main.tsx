import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Interruptor de PDFs de prueba (break-ui): solo en desarrollo, fuera del build de producción.
if (import.meta.env.DEV) {
  void import('./dev/FixtureSwitch').then(({ FixtureSwitch }) => {
    const host = document.body.appendChild(document.createElement('div'))
    createRoot(host).render(<FixtureSwitch />)
  })
}
