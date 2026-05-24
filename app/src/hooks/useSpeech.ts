import { useRef, useState, useCallback } from 'react'

export type SpeechState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

export function useSpeech(language: string) {
  const [state, setState]         = useState<SpeechState>('idle')
  const [liveTranscript, setLive] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalRef       = useRef('')
  const liveRef        = useRef('')  // ref mirror of liveTranscript — no stale closure in stop()

  const start = useCallback(async (): Promise<boolean> => {
    setError(null)
    setLive('')
    finalRef.current = ''
    liveRef.current  = ''

    // Check Web Speech API support
    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition | undefined
    if (!SR) {
      setError('speech_not_supported')
      setState('error')
      return false
    }

    // Still need mic permission for SpeechRecognition
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop()) // release immediately, just checking permission
      } catch {
        setError('mic_denied')
        setState('error')
        return false
      }
    }

    try {
      const recognition = new SR()
      recognition.lang           = language
      recognition.continuous     = true
      recognition.interimResults = true

      recognition.onresult = (e) => {
        let final   = ''
        let interim = ''
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]!
          if (r.isFinal) {
            final += r[0]!.transcript + ' '
          } else {
            interim += r[0]!.transcript
          }
        }
        finalRef.current = final.trim()
        const combined = (final + interim).trim()
        liveRef.current = combined
        setLive(combined)
      }

      recognition.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return
        setError(`speech_${e.error}`)
        setState('error')
      }

      recognition.start()
      recognitionRef.current = recognition
      setState('recording')
      return true
    } catch {
      setError('speech_not_supported')
      setState('error')
      return false
    }
  }, [language])

  const stop = useCallback(async (): Promise<string> => {
    const recognition = recognitionRef.current
    if (!recognition) throw new Error('No recognition')

    return new Promise((resolve) => {
      recognition.onend = () => {
        setState('done')
        // Use ref to avoid stale closure on liveTranscript state
        const transcript = (finalRef.current || liveRef.current).trim().toLowerCase()
        resolve(transcript)
      }
      recognition.stop()
      recognitionRef.current = null
    })
  }, [])  // no deps — uses only refs

  const reset = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    finalRef.current = ''
    liveRef.current  = ''
    setState('idle')
    setLive('')
    setError(null)
  }, [])

  return { state, liveTranscript, error, start, stop, reset }
}
