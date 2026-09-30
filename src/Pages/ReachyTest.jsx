import React from "react";

import useReachy from
  "../hooks/useReachy";

export default function ReachyTest() {
  const {
    connected,
    correct,
    wrong,
    success,
    neutral,
  } = useReachy();

  return (
    <div
      style={{
        padding: "40px",
      }}
    >
      <h1>
        Reachy Band
      </h1>

      <p>
        {connected
          ? "🟢 Reachy connecté"
          : "🔴 Reachy non connecté"}
      </p>

      <button
        onClick={correct}
        disabled={!connected}
      >
        ✅ Bonne note
      </button>

      <button
        onClick={wrong}
        disabled={!connected}
      >
        ❌ Mauvaise note
      </button>

      <button
        onClick={success}
        disabled={!connected}
      >
        🎉 Réussite
      </button>

      <button
        onClick={neutral}
        disabled={!connected}
      >
        🤖 Neutre
      </button>
    </div>
  );
}