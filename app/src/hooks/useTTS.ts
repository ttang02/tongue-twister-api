// Text-to-speech: Web Speech API — Google/Microsoft voice for vi, female heuristics for fr/en/ko
import { useCallback, useEffect, useRef } from 'react'
import type { Language } from '@/store/gameStore'

const LANG_BCP47: Record<Language, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ko: 'ko-KR',
  vi: 'vi-VN',
}

// Vietnamese: use Google/Microsoft voice from Web Speech API (better quality than generic)

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

  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    const load = () => { voicesReady.current = true }
    speechSynthesis.getVoices()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()

    const lang      = language ?? 'fr'
    const bcp47     = LANG_BCP47[lang]
    const ttsConfig = LANG_TTS[lang]

    const utt   = new SpeechSynthesisUtterance(text)
    utt.lang    = bcp47
    utt.volume  = 1

    if (lang === 'vi') {
      // Vietnamese: prefer Google/Microsoft voices (best tonal quality)
      const voices = speechSynthesis.getVoices()
      const viVoice = voices.find(v =>
        v.lang === 'vi-VN' &&
        (v.name.includes('Google') || v.name.includes('Microsoft'))
      )
      if (viVoice) utt.voice = viVoice
      utt.rate  = 0.9
      utt.pitch = 1.0
    } else {
      const voice = pickVoice(bcp47)
      if (voice) utt.voice = voice
      utt.rate  = ttsConfig.rate
      utt.pitch = ttsConfig.pitch
    }

    speechSynthesis.speak(utt)
  }, [language])

  const cancel = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }, [])

  return { speak, cancel }
}
