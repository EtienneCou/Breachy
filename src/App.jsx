import { Routes, Route } from "react-router-dom";
import Homepage from "./Pages/Homepage";
import PianoPage from "./Pages/PianoPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/piano" element={<PianoPage />} />
    </Routes>
  );
}

export default App;