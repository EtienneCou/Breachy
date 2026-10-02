import React, { useState } from "react"

import useReachy from "../hooks/useReachy"

import {
  playPositive,
  playEncouragement,
} from "../Services/audioService"


export default function ReachyTest() {
  const {
    connected,
    correct,
    wrong,
    success,
    neutral,
  } = useReachy()

  const [audioMessage, setAudioMessage] =
    useState("")


  const testBravo = async () => {
    try {
      setAudioMessage(
        "Lecture de Bravo..."
      )

      await playPositive()

      setAudioMessage(
        "🔊 Bravo envoyé à Reachy"
      )
    } catch (error) {
      console.error(error)

      setAudioMessage(
        "❌ Erreur audio Bravo"
      )
    }
  }


  const testEncouragement = async () => {
    try {
      setAudioMessage(
        "Lecture encouragement..."
      )

      await playEncouragement()

      setAudioMessage(
        "🔊 Encouragement envoyé à Reachy"
      )
    } catch (error) {
      console.error(error)

      setAudioMessage(
        "❌ Erreur audio encouragement"
      )
    }
  }


  const testGoodReaction = () => {
    playPositive().catch(console.error)

    setTimeout(() => {
      correct()
    }, 100)
  }
  const testWrongReaction = () => {
    playEncouragement().catch(console.error)

    setTimeout(() => {
      wrong()
    }, 100)
  }


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


      <h2>
        Test mouvements
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
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


      <h2>
        Test audio
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <button
          onClick={testBravo}
        >
          🔊 Tester "Bravo"
        </button>

        <button
          onClick={testEncouragement}
        >
          🔊 Tester "Courage"
        </button>
      </div>


      <h2>
        Test complet
      </h2>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={testGoodReaction}
          disabled={!connected}
        >
          🤖 + 🔊
          10 bonnes notes
        </button>

        <button
          onClick={testWrongReaction}
          disabled={!connected}
        >
          🤖 + 🔊
          10 mauvaises notes
        </button>
      </div>


      {audioMessage && (
        <p
          style={{
            marginTop: "30px",
            fontWeight: "bold",
          }}
        >
          {audioMessage}
        </p>
      )}
    </div>
  )
}