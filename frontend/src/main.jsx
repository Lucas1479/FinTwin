import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HelpProvider } from './context/HelpContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelpProvider>
      <App />
    </HelpProvider>
  </StrictMode>,
)
