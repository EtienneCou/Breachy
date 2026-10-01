import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { BrowserRouter } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import { CoachProvider } from './Components/coach'

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <BrowserRouter>
      {/* Reachy, le coach : partagé par toutes les pages (avatar, voix, robot) */}
      <CoachProvider>
        <App />
      </CoachProvider>
    </BrowserRouter>
  </StrictMode>,
)
