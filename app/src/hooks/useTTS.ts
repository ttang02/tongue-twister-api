// Text-to-speech via Google Translate audio — all languages
import { useCallback, useRef } from 'react'
import type { Language } from '@/store/gameStore'

export function useTTS(language: Language | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback((text: string) => {
    const lang = language ?? 'fr'
    if (audioRef.current) { audioRef.current.pause() }
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`
    const audio = new Audio(url)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [language])

  const cancel = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  return { speak, cancel }
}
