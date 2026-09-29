import { Route, Routes } from 'react-router-dom'
import PianoPage from './pages/PianoPage.jsx'
import Homepage from './Pages/Homepage'
import NoteScrollerDemo from './Components/Notes_scroller/Notescrollerdemo.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/pianoPage" element={<PianoPage />} />
      <Route path="/notes-scroller" element={<NoteScrollerDemo />} />
    </Routes>
  )
}

export default App;
