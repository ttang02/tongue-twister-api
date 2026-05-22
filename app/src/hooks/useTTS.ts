// Text-to-speech: Web Speech API for fr/en/ko, Google Cloud TTS for vi
import { useCallback, useEffect, useRef } from 'react'
import type { Language } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const LANG_BCP47: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ko: 'ko-KR',
  vi: 'vi-VN',
}

// Languages routed to server-side Google Cloud TTS (Neural2 voices)
const CLOUD_TTS_LANGS = new Set<Language>(['vi'])

// Per-language Web Speech API tuning — tonal languages keep pitch=1.0
const LANG_TTS: Record<Language, { rate: number; pitch: number }> = {
  fr: { rate: 0.62, pitch: 1.05 },
  en: { rate: 0.62, pitch: 1.05 },
  ko: { rate: 0.55, pitch: 1.0 },
  vi: { rate: 0.50, pitch: 1.0 },  // unused — vi goes through cloud
}

// Pick best female voice for a given BCP-47 lang tag.
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null

  const prefix = lang.slice(0, 2).toLowerCase()

  const langVoices = voices.filter(v =>
    v.lang.toLowerCase().startsWith(prefix)
  )
  if (!langVoices.length) return null

  const femaleKeywords = [
    'female', 'femme', 'féminin',
    'amélie', 'aurelie', 'marie', 'audrey', 'alice',
    'google français féminin', 'google uk english female',
    'zira', 'hazel', 'susan', 'karen', 'moira', 'samantha', 'victoria',
    'ava', 'allison', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy',
    'yuna', 'heami', 'seoyeon',
    'linh',
  ]
  const maleKeywords = ['thomas', 'nicolas', 'daniel', 'alex', 'fred', 'jorge', 'male', 'homme']

  const female = langVoices.find(v => {
    const n = v.name.toLowerCase()
    if (maleKeywords.some(k => n.includes(k))) return false
    return femaleKeywords.some(k => n.includes(k))
  })

  const nonMale = langVoices.find(v => {
    const n = v.name.toLowerCase()
    return !maleKeywords.some(k => n.includes(k))
  })

  return female ?? nonMale ?? langVoices[0] ?? null
}

export function useTTS(language: Language | null) {
  const voicesReady = useRef(false)
  const audioRef    = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const load = () => { voicesReady.current = true }
    speechSynthesis.getVoices()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const speak = useCallback(async (text: string) => {
    const lang = language ?? 'fr'

    // Cloud TTS path (Vietnamese — vi-VN-Neural2-A)
    if (CLOUD_TTS_LANGS.has(lang)) {
      try {
        const res = await fetch(`${API_URL}/speech/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: lang }),
        })
        if (!res.ok) return  // fail silently — TTS is non-critical
        const blob  = await res.blob()
        const url   = URL.createObjectURL(blob)
        // Stop any prior playback
        if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src) }
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => URL.revokeObjectURL(url)
        audio.play()
      } catch {
        // Cloud TTS unavailable — skip silently
      }
      return
    }

    // Web Speech API path (fr, en, ko)
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()

    const bcp47     = LANG_BCP47[lang]
    const voice     = pickVoice(bcp47)
    const ttsConfig = LANG_TTS[lang]
    const utt       = new SpeechSynthesisUtterance(text)
    utt.lang        = bcp47
    utt.rate        = ttsConfig.rate
    utt.pitch       = ttsConfig.pitch
    utt.volume      = 1
    if (voice) utt.voice = voice

    speechSynthesis.speak(utt)
  }, [language])

  const cancel = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  return { speak, cancel }
}
