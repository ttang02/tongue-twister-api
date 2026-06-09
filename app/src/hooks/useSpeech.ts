import { useRef, useState, useCallback } from 'react'

export type SpeechState = 'idle' | 'recording' | 'processing' | 'done' | 'error'

// Android Chrome quirks this hook works around:
//  - `continuous = true` is flaky → recognition ends after a pause and fires `onend`.
//    Reliable pattern: continuous = false + auto re-arm in onend until the user taps stop.
//  - A getUserMedia "permission probe" acquires+releases the mic, then recognition.start()
//    re-acquires it. That rapid double-acquire intermittently fails on Android ("mic busy").
//    Fix: check permission via the Permissions API (no acquisition) and let SpeechRecognition
//    own the mic exclusively.
//  - Re-arming the mic immediately in onend races the OS releasing it → small delay first.
const MAX_AUTO_RESTART = 4
const RESTART_DELAY_MS = 200

export function useSpeech(language: string) {
  const [state, setState]         = useState<SpeechState>('idle')
  const [liveTranscript, setLive] = useState('')
  const [error, setError]         = useState<string | null>(null)

  const recognitionRef  = useRef<SpeechRecognition | null>(null)
  const finalRef        = useRef('')
  const liveRef         = useRef('')          // mirror of liveTranscript — no stale closure in stop()
  const manualStopRef   = useRef(false)       // user tapped stop → don't auto-restart
  const restartCount    = useRef(0)           // cap auto-restarts so a dead network can't loop forever
  const stopResolveRef  = useRef<((t: string) => void) | null>(null)
  const stopTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const finalize = useCallback(() => {
    const transcript = (finalRef.current || liveRef.current).trim().toLowerCase()
    if (stopTimerRef.current)    { clearTimeout(stopTimerRef.current);    stopTimerRef.current = null }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null }
    setState('done')
    stopResolveRef.current?.(transcript)
    stopResolveRef.current = null
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    setError(null)
    setLive('')
    finalRef.current      = ''
    liveRef.current       = ''
    manualStopRef.current = false
    restartCount.current  = 0

    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition | undefined
    if (!SR) {
      setError('speech_not_supported')
      setState('error')
      return false
    }

    // Permission check WITHOUT acquiring the mic (avoids the Android double-acquire race).
    // SpeechRecognition.start() will itself prompt if state is 'prompt'.
    try {
      const perm = await navigator.permissions?.query({ name: 'microphone' as PermissionName })
      if (perm?.state === 'denied') {
        setError('mic_denied')
        setState('error')
        return false
      }
    } catch {
      // Permissions API unavailable for 'microphone' → fall through; recognition handles prompt
    }

    try {
      const recognition = new SR()
      recognition.lang           = language
      recognition.continuous     = false   // Android-safe; we re-arm via onend
      recognition.interimResults = true

      recognition.onresult = (e) => {
        let final = '', interim = ''
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]!
          if (r.isFinal) final += r[0]!.transcript + ' '
          else           interim += r[0]!.transcript
        }
        // continuous=false resets results each session → accumulate finals across restarts
        if (final) finalRef.current = (finalRef.current + ' ' + final).trim()
        const combined = (finalRef.current + ' ' + interim).trim()
        liveRef.current = combined
        setLive(combined)
      }

      recognition.onerror = (e) => {
        // Benign: silence timeout / programmatic abort → let onend re-arm
        if (e.error === 'no-speech' || e.error === 'aborted') return
        // Hard permission failures: stop and surface — never auto-restart these
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          manualStopRef.current = true
          setError('mic_denied')
          setState('error')
        }
        // network / language-not-supported / other: let onend's capped restart handle it
      }

      recognition.onend = () => {
        // Manual stop → finalize and resolve the stop() promise
        if (manualStopRef.current) { finalize(); return }

        // Auto re-arm (Android ends sessions constantly) — capped, and delayed so the OS
        // fully releases the mic before re-acquiring (prevents intermittent "mic busy").
        if (restartCount.current < MAX_AUTO_RESTART) {
          restartCount.current++
          restartTimerRef.current = setTimeout(() => {
            if (manualStopRef.current) { finalize(); return }
            try {
              recognition.start()
            } catch {
              // start() can throw "already started" or "mic busy" → settle gracefully
              if (liveRef.current || finalRef.current) finalize()
              else { setError('speech_network'); setState('error') }
            }
          }, RESTART_DELAY_MS)
          return
        }

        // Restarts exhausted without a manual stop
        if (liveRef.current || finalRef.current) {
          finalize()                       // captured something → treat as a clean stop
        } else {
          setError('speech_network')       // persistent failure (likely network / invalid cert)
          setState('error')
        }
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
  }, [language, finalize])

  const stop = useCallback(async (): Promise<string> => {
    const recognition = recognitionRef.current
    if (!recognition) throw new Error('No recognition')

    return new Promise((resolve) => {
      manualStopRef.current  = true
      stopResolveRef.current = resolve
      if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null }
      // Safety net: if onend never fires (browser bug), resolve after 4s
      stopTimerRef.current = setTimeout(() => finalize(), 4000)
      try { recognition.stop() } catch { finalize() }
      recognitionRef.current = null
    })
  }, [finalize])

  const reset = useCallback(() => {
    manualStopRef.current = true
    if (stopTimerRef.current)    { clearTimeout(stopTimerRef.current);    stopTimerRef.current = null }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null }
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null
    stopResolveRef.current = null
    finalRef.current     = ''
    liveRef.current      = ''
    restartCount.current = 0
    setState('idle')
    setLive('')
    setError(null)
  }, [])

  return { state, liveTranscript, error, start, stop, reset }
}
