// Text-to-speech via Web Speech API — female voice, language-matched
import { useCallback, useEffect, useRef } from 'react'
import type { Language } from '@/store/gameStore'

const LANG_BCP47: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ko: 'ko-KR',
  vi: 'vi-VN',
}

// Pick best female voice for a given BCP-47 lang tag.
// Prefers voices whose name contains "female" / "femme" / known female names.
// Falls back to any voice matching the lang prefix.
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null

  const prefix = lang.slice(0, 2).toLowerCase()

  const langVoices = voices.filter(v =>
    v.lang.toLowerCase().startsWith(prefix)
  )
  if (!langVoices.length) return null

  // Female heuristics — browser-specific voice name patterns
  const femaleKeywords = [
    'female', 'femme', 'féminin',
    // macOS/iOS
    'amélie', 'aurelie', 'thomas', // thomas is male — skip
    'marie', 'audrey', 'alice',
    // Google
    'google français féminin', 'google uk english female',
    // common female names across TTS engines
    'zira', 'hazel', 'susan', 'karen', 'moira', 'samantha', 'victoria',
    'ava', 'allison', 'joanna', 'salli', 'kendra', 'kimberly', 'ivy',
    // Korean / Vietnamese
    'yuna', 'heami', 'seoyeon',
    'linh',
  ]
  const maleKeywords = ['thomas', 'nicolas', 'daniel', 'alex', 'fred', 'jorge', 'male', 'homme']

  const female = langVoices.find(v => {
    const n = v.name.toLowerCase()
    if (maleKeywords.some(k => n.includes(k))) return false
    return femaleKeywords.some(k => n.includes(k))
  })

  // If no explicit female found, pick first non-male voice
  const nonMale = langVoices.find(v => {
    const n = v.name.toLowerCase()
    return !maleKeywords.some(k => n.includes(k))
  })

  return female ?? nonMale ?? langVoices[0] ?? null
}

export function useTTS(language: Language | null) {
  const voicesReady = useRef(false)

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    // Voices load asynchronously on some browsers
    const load = () => { voicesReady.current = true }
    speechSynthesis.getVoices()  // triggers load in Chrome
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()  // stop anything in progress

    const lang   = language ?? 'fr'
    const bcp47  = LANG_BCP47[lang]
    const voice  = pickVoice(bcp47)

    const utt        = new SpeechSynthesisUtterance(text)
    utt.lang         = bcp47
    utt.rate         = 0.62   // slow + clear — learning pronunciation
    utt.pitch        = 1.05   // near-neutral pitch → better articulation (high pitch = muddy)
    utt.volume       = 1
    if (voice) utt.voice = voice

    speechSynthesis.speak(utt)
  }, [language])

  const cancel = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }, [])

  return { speak, cancel }
}
