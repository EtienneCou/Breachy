import { Route, Routes } from 'react-router-dom'
import PianoPage from './pages/PianoPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="*" element={<PianoPage />} />
    </Routes>
  )
}

export default App
