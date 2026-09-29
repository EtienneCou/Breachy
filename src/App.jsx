import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import PianoPage from './pages/PianoPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/pianoPage" element={<PianoPage />} />
    </Routes>
  )
}

export default App
