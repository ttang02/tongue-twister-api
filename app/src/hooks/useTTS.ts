// Text-to-speech: Edge TTS (server) for vi, Web Speech API for fr/en/ko
import { useCallback, useEffect, useRef } from 'react'
import type { Language } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Languages routed to server-side Edge TTS
const SERVER_TTS_LANGS = new Set<Language>(['vi'])

const LANG_BCP47: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ko: 'ko-KR',
  vi: 'vi-VN',
}

const LANG_TTS: Record<Language, { rate: number; pitch: number }> = {
  fr: { rate: 0.62, pitch: 1.05 },
  en: { rate: 0.62, pitch: 1.05 },
  ko: { rate: 0.55, pitch: 1.0 },
  vi: { rate: 0.9,  pitch: 1.0 },
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null

  const prefix = lang.slice(0, 2).toLowerCase()
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(prefix))
  if (!langVoices.length) return null

  const femaleKeywords = [
    'female', 'femme', 'féminin',
    'amélie', 'aurelie', 'marie', 'audrey', 'alice',
    'google français féminin', 'google uk english female',
    'zira', 'hazel', 'susan', 'karen', 'moira', 'samantha', 'victoria',
    'ava', 'allison', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy',
    'yuna', 'heami', 'seoyeon',
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

    // Vietnamese: server-side Edge TTS (vi-VN-HoaiMyNeural)
    if (SERVER_TTS_LANGS.has(lang)) {
      try {
        if (audioRef.current) { audioRef.current.pause() }
        const params = new URLSearchParams({ text, lang })
        const res = await fetch(`${API_URL}/speech/tts?${params}`)
        if (!res.ok) return
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => URL.revokeObjectURL(url)
        audio.play().catch(() => {})
      } catch {
        // TTS non-critical — fail silently
      }
      return
    }

    // fr/en/ko: Web Speech API
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
