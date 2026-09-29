import { useState } from 'react'
import { pianoSynth } from './synth.js'
import './Piano.css'

/** Réglages communs à tous les écrans : volume et disposition du clavier. */
export default function PianoSettings({ piano }) {
  const [volume, setVolume] = useState(pianoSynth.volume)

  const changeVolume = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    pianoSynth.setVolume(v)
  }

  return (
    <>
      <label className="piano-setting" htmlFor="piano-volume">
        Volume
        <input id="piano-volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={changeVolume} />
      </label>
      <label className="piano-setting" htmlFor="piano-layout">
        Clavier
        <select
          id="piano-layout"
          value={piano.layout}
          onChange={(e) => {
            piano.setLayout(e.target.value)
            e.target.blur()
          }}
        >
          <option value="azerty">AZERTY</option>
          <option value="qwerty">QWERTY</option>
        </select>
      </label>
    </>
  )
}
