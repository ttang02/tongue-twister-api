import { motion } from 'motion/react'
import { Mic, MicOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { SpeechState } from '@/hooks/useSpeech'

interface Props {
  state:     SpeechState
  onStart:   () => void
  onStop:    () => void
  onRetry?:  () => void
  disabled?: boolean
  error?:    string | null
}

export function MicButton({ state, onStart, onStop, onRetry, disabled, error }: Props) {
  const isRecording  = state === 'recording'
  const isProcessing = state === 'processing'
  const isSuccess    = state === 'done'
  const isError      = state === 'error'

  const errorLabel =
    error === 'mic_denied'             ? 'Accès micro refusé — autorise le micro dans le navigateur' :
    error === 'mic_not_supported'      ? 'Micro non supporté par ce navigateur' :
    error === 'recorder_not_supported' ? 'Enregistrement audio non supporté' :
    error?.includes('short') || error?.includes('silent') ? 'Audio trop court — parle plus longtemps' :
    error?.includes('configured')      ? 'Service vocal non configuré' :
                                         'Erreur — appuie pour réessayer'

  const label =
    isRecording  ? 'Appuie pour arrêter' :
    isProcessing ? 'Analyse en cours…' :
    isSuccess    ? 'Bien joué !' :
    isError      ? errorLabel :
                   'Appuie pour parler'

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        className="relative flex items-center justify-center rounded-full text-white shadow-2xl select-none
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        style={{
          touchAction: 'none',
          width:  96,
          height: 96,
          background: isRecording  ? '#ef4444'                :
                      isProcessing ? 'rgba(255,255,255,0.1)'  :
                      isSuccess    ? '#22c55e'                :
                      isError      ? '#ef4444'                :
                                     'rgb(var(--p))',
          boxShadow: isRecording
            ? '0 0 0 0 rgba(239,68,68,0.5)'
            : `0 8px 32px rgb(var(--p) / 0.4)`,
        }}
        onPointerDown={(e) => {
          if (disabled || isProcessing) return
          if (state === 'idle') {
            e.currentTarget.setPointerCapture(e.pointerId)
            onStart()
          }
        }}
        onPointerUp={() => {
          if (isRecording) onStop()
        }}
        onClick={() => {
          if (isError && onRetry) onRetry()
        }}
        animate={
          isRecording  ? { scale: [1, 1.06, 1] } :
          isProcessing ? { rotate: 360 }          :
                         { scale: 1 }
        }
        transition={
          isRecording  ? { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } :
          isProcessing ? { repeat: Infinity, duration: 1, ease: 'linear' }      :
                         {}
        }
        disabled={disabled || isProcessing}
        aria-label={label}
        aria-pressed={isRecording}
      >
        {/* Ripple ring */}
        {isRecording && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(239,68,68,0.35)' }}
          />
        )}

        {isProcessing ? <Loader2 size={36} />       :
         isSuccess    ? <CheckCircle2 size={36} />  :
         isError      ? <MicOff size={36} />        :
                        <Mic size={36} />}
      </motion.button>

      <p className="text-sm text-slate-400 font-medium text-center min-h-[1.25rem]">
        {label}
      </p>
    </div>
  )
}
