import { Routes, Route } from "react-router-dom";
import Homepage from "./Pages/Homepage/Homepage";
import PianoPage from "./Pages/PianoPage";
import ReachyTest from "./Pages/ReachyTest";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/piano" element={<PianoPage />} />
      <Route path="/reachy-test" element={<ReachyTest />}
/>
    </Routes>
  );
}

export default App;