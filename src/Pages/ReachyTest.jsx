import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import useReachy from "../hooks/useReachy"
import {
  playBravo,
  playEncouragement,
} from "../Services/audioService"
import { useLanguage } from "../context/LanguageContext"
import LanguageToggle from "../Components/LanguageToggle/LanguageToggle"

export default function ReachyTest() {
  const navigate = useNavigate()
  const { language, t } = useLanguage()
  const {
    connected,
    correct,
    wrong,
    success,
    neutral,
  } = useReachy()

  const [audioMessage, setAudioMessage] = useState("")

  const testBravo = async (explicitLang) => {
    try {
      const targetLang = explicitLang || language
      setAudioMessage(t('reachyTest.playingBravo'))
      await playBravo(targetLang)
      setAudioMessage(`${t('reachyTest.bravoSent')} (${targetLang.toUpperCase()})`)
    } catch (error) {
      console.error(error)
      setAudioMessage(t('reachyTest.errorBravo'))
    }
  }

  const testEncouragement = async (explicitLang) => {
    try {
      const targetLang = explicitLang || language
      setAudioMessage(t('reachyTest.playingCourage'))
      await playEncouragement(targetLang)
      setAudioMessage(`${t('reachyTest.courageSent')} (${targetLang.toUpperCase()})`)
    } catch (error) {
      console.error(error)
      setAudioMessage(t('reachyTest.errorCourage'))
    }
  }

  const testGoodReaction = () => {
    playBravo(language).catch(console.error)
    setTimeout(() => {
      correct()
    }, 100)
  }

  const testWrongReaction = () => {
    playEncouragement(language).catch(console.error)
    setTimeout(() => {
      wrong()
    }, 100)
  }

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "var(--font-family, system-ui, sans-serif)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: "none",
            border: "none",
            color: "#6c8cff",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "600",
          }}
        >
          {t('reachyTest.backHome')}
        </button>
        <LanguageToggle />
      </div>

      <h1 style={{ marginBottom: "10px" }}>
        {t('reachyTest.title')}
      </h1>

      <p style={{ marginBottom: "30px", fontWeight: "600" }}>
        {connected
          ? t('reachyTest.connected')
          : t('reachyTest.disconnected')}
      </p>

      <h2>{t('reachyTest.movementsTitle')}</h2>
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <button onClick={correct} disabled={!connected}>
          {t('reachyTest.goodNote')}
        </button>
        <button onClick={wrong} disabled={!connected}>
          {t('reachyTest.badNote')}
        </button>
        <button onClick={success} disabled={!connected}>
          {t('reachyTest.success')}
        </button>
        <button onClick={neutral} disabled={!connected}>
          {t('reachyTest.neutral')}
        </button>
      </div>

      <h2>{t('reachyTest.audioTitle')}</h2>
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "30px",
        }}
      >
        <button onClick={() => testBravo('fr')}>
          {t('reachyTest.testBravoFr')}
        </button>
        <button onClick={() => testBravo('en')}>
          {t('reachyTest.testBravoEn')}
        </button>
        <button onClick={() => testEncouragement('fr')}>
          {t('reachyTest.testCourageFr')}
        </button>
        <button onClick={() => testEncouragement('en')}>
          {t('reachyTest.testCourageEn')}
        </button>
      </div>

      <h2>{t('reachyTest.completeTitle')}</h2>
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={testGoodReaction} disabled={!connected}>
          {t('reachyTest.goodTenReaction')} ({language.toUpperCase()})
        </button>
        <button onClick={testWrongReaction} disabled={!connected}>
          {t('reachyTest.badTenReaction')} ({language.toUpperCase()})
        </button>
      </div>

      {audioMessage && (
        <p
          style={{
            marginTop: "30px",
            fontWeight: "bold",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          {audioMessage}
        </p>
      )}
    </div>
  )
}