import { useRef, useState, useCallback } from 'react'

export type SpeechState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export function useSpeech(language: string) {
  const [state, setState]         = useState<SpeechState>('idle')
  const [liveTranscript, setLive] = useState('')
  const [error, setError]         = useState<string | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks        = useRef<Blob[]>([])
  const wsRef         = useRef<SpeechRecognition | null>(null)

  // Returns true on success, false on failure
  const start = useCallback(async (): Promise<boolean> => {
    setError(null)
    setLive('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('mic_not_supported')
      setState('error')
      return false
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('mic_denied')
      setState('error')
      return false
    }

    // Web Speech API live transcript (Chrome/Edge only, optional)
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      try {
        const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition
        const recognition = new SR()
        recognition.lang           = language
        recognition.continuous     = true
        recognition.interimResults = true
        recognition.onresult = (e) => {
          const interim = Array.from(e.results).map((r) => r[0]!.transcript).join(' ')
          setLive(interim)
        }
        recognition.start()
        wsRef.current = recognition
      } catch { /* optional */ }
    }

    const mimeType = getSupportedMimeType()
    let mr: MediaRecorder
    try {
      mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      setError('recorder_not_supported')
      setState('error')
      stream.getTracks().forEach((t) => t.stop())
      return false
    }

    chunks.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
    mr.start(250)
    mediaRecorder.current = mr
    setState('recording')
    return true
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
          const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          form.append('language', language)

          const res = await fetch(`${API_URL}/speech/transcribe`, { method: 'POST', body: form })
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as any
            throw new Error(body?.error ?? `http_${res.status}`)
          }

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
    wsRef.current?.stop()
    wsRef.current = null
    setState('idle')
    setLive('')
    setError(null)
  }, [])

  return { state, liveTranscript, error, start, stop, reset }
}
