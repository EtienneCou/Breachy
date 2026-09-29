import { Route, Routes } from 'react-router-dom'
import PianoPage from './pages/PianoPage.jsx'
import Homepage from "./Pages/Homepage";

function App() {
  return (
    <Routes>
     <Route path="/" element={<Homepage />} />
      <Route path="/pianoPage" element={<PianoPage />} />
    </Routes>
  )
}

export default App;