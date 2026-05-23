// Text-to-speech: Google Translate TTS via server proxy (all languages)
import { useCallback, useRef } from 'react'
import type { Language } from '@/store/gameStore'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useTTS(language: Language | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback(async (text: string) => {
    const lang = language ?? 'fr'
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
  }, [language])

  const cancel = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  return { speak, cancel }
}
