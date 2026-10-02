import { Routes, Route } from "react-router-dom";
import Homepage from "./Pages/Homepage/Homepage";
import PianoPage from "./Pages/PianoPage";
import FreePlayPage from "./Pages/FreePlayPage";
import StudioPage from "./Pages/StudioPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/piano" element={<PianoPage />} />
      <Route path="/jeu-libre" element={<FreePlayPage />} />
      <Route path="/studio" element={<StudioPage />} />
    </Routes>
  );
}

export default App;