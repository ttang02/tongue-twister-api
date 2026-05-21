import { useRef, useState, useCallback } from 'react'

export type SpeechState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function useSpeech(language: string) {
  const [state, setState]         = useState<SpeechState>('idle')
  const [liveTranscript, setLive] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks        = useRef<Blob[]>([])
  const wsRef         = useRef<SpeechRecognition | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setLive('')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('mic_denied')
      setState('error')
      return
    }

    // Web Speech API live transcript (Chrome/Edge only)
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition
      const recognition = new SR()
      recognition.lang        = language
      recognition.continuous  = true
      recognition.interimResults = true
      recognition.onresult = (e) => {
        const interim = Array.from(e.results)
          .map((r) => r[0]!.transcript)
          .join(' ')
        setLive(interim)
      }
      recognition.start()
      wsRef.current = recognition
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/ogg;codecs=opus'

    const mr = new MediaRecorder(stream, { mimeType })
    chunks.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
    mr.start(250)
    mediaRecorder.current = mr
    setState('recording')
  }, [language])

  const stop = useCallback(async (): Promise<string> => {
    wsRef.current?.stop()
    wsRef.current = null

    return new Promise((resolve, reject) => {
      const mr = mediaRecorder.current
      if (!mr) { reject(new Error('No recorder')); return }

      mr.onstop = async () => {
        setState('processing')
        try {
          const blob = new Blob(chunks.current, { type: mr.mimeType })
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          form.append('language', language)

          const res  = await fetch(`${API_URL}/speech/transcribe`, { method: 'POST', body: form })
          if (!res.ok) throw new Error('api_error')

          const data = await res.json() as { transcript: string }
          setState('done')
          resolve(data.transcript)
        } catch (err: any) {
          setError(err.message ?? 'api_error')
          setState('error')
          reject(err)
        }
      }

      mr.stop()
      mr.stream.getTracks().forEach((t) => t.stop())
    })
  }, [language])

  const reset = useCallback(() => {
    setState('idle')
    setLive('')
    setError(null)
  }, [])

  return { state, liveTranscript, error, start, stop, reset }
}
