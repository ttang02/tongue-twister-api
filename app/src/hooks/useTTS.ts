// Text-to-speech: ResponsiveVoice for vi, Web Speech API for fr/en/ko
import { useCallback, useEffect, useRef } from 'react'
import type { Language } from '@/store/gameStore'

declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, params?: { rate?: number; pitch?: number; volume?: number; onend?: () => void }) => void
      cancel: () => void
      voiceSupport: () => boolean
    }
  }
}

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

// Load ResponsiveVoice script once
let rvLoaded = false
function loadResponsiveVoice() {
  if (rvLoaded || document.querySelector('script[src*="responsivevoice"]')) { rvLoaded = true; return }
  rvLoaded = true
  const s = document.createElement('script')
  s.src = 'https://code.responsivevoice.org/responsivevoice.js'
  s.async = true
  document.head.appendChild(s)
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

  useEffect(() => {
    // Preload ResponsiveVoice if Vietnamese selected
    if (language === 'vi') loadResponsiveVoice()
  }, [language])

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const load = () => { voicesReady.current = true }
    speechSynthesis.getVoices()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const speak = useCallback((text: string) => {
    const lang = language ?? 'fr'

    // Vietnamese: ResponsiveVoice ("Vietnamese Female")
    if (lang === 'vi') {
      if (window.responsiveVoice) {
        window.responsiveVoice.cancel()
        window.responsiveVoice.speak(text, 'Vietnamese Female', { rate: 0.9 })
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
    if (window.responsiveVoice) window.responsiveVoice.cancel()
  }, [])

  return { speak, cancel }
}
