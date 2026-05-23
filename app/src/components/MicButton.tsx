import { motion, AnimatePresence } from 'motion/react'
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react'
import type { SpeechState } from '@/hooks/useSpeech'

const iconVariants = {
  initial: { opacity: 0, scale: 0.7, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit:    { opacity: 0, scale: 0.7, filter: 'blur(4px)' },
}
const iconTransition = { type: 'spring' as const, duration: 0.18, bounce: 0 }

interface Props {
  state:     SpeechState
  onStart:   () => void
  onStop:    () => void
  onRetry?:  () => void
  disabled?: boolean
  error?:    string | null
}

export function MicButton({ state, onStart, onStop, onRetry, disabled, error }: Props) {
  const isProcessing = state === 'processing'
  const isSuccess    = state === 'done'
  const isError      = state === 'error'
  const isRecording  = state === 'recording'

  const errorLabel =
    error === 'mic_denied'             ? 'Accès micro refusé — autorise le micro dans le navigateur' :
    error === 'mic_not_supported'      ? 'Micro non supporté par ce navigateur' :
    error === 'speech_not_supported'   ? 'Reconnaissance vocale non supportée — utilise Chrome ou Edge' :
    error === 'recorder_not_supported' ? 'Enregistrement audio non supporté' :
    error?.startsWith('speech_')       ? 'Erreur reconnaissance vocale — réessaie' :
    error?.includes('short') || error?.includes('silent') ? 'Audio trop court — parle plus longtemps' :
                                         'Erreur — appuie pour réessayer'

  const label =
    isRecording  ? 'Appuie pour valider' :
    isProcessing ? 'Analyse en cours…'   :
    isSuccess    ? 'Bien joué !'         :
    isError      ? errorLabel            :
                   'Appuie pour parler'

  const handleClick = () => {
    if (disabled || isProcessing) return
    if (isError)      { onRetry?.(); return }
    if (isRecording)  { onStop();    return }
    onStart()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        className="relative flex items-center justify-center rounded-full text-white shadow-2xl select-none
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
        style={{
          width:  96,
          height: 96,
          background: isRecording  ? '#ef4444'               :
                      isProcessing ? 'rgba(255,255,255,0.1)' :
                      isSuccess    ? '#22c55e'               :
                      isError      ? '#ef4444'               :
                                     'rgb(var(--p))',
          boxShadow: isRecording
            ? '0 0 0 0 rgba(239,68,68,0.5)'
            : `0 8px 32px rgb(var(--p) / 0.4)`,
          transition: 'background-color 180ms ease, box-shadow 180ms ease',
        }}
        onClick={handleClick}
        animate={isRecording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={isRecording ? { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } : { duration: 0.15 }}
        whileTap={!isProcessing ? { scale: 0.93 } : {}}
        disabled={disabled || isProcessing}
        aria-label={label}
        aria-pressed={isRecording}
      >
        {isRecording && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(239,68,68,0.35)' }}
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
          {isProcessing ? (
            <motion.span key="processing" {...iconVariants} transition={iconTransition}>
              <Loader2 size={36} className="animate-spin" />
            </motion.span>
          ) : isSuccess ? (
            <motion.span key="success" {...iconVariants} transition={iconTransition}>
              <CheckCircle2 size={36} />
            </motion.span>
          ) : isError ? (
            <motion.span key="error" {...iconVariants} transition={iconTransition}>
              <MicOff size={36} />
            </motion.span>
          ) : (
            <motion.span key="idle" {...iconVariants} transition={iconTransition}>
              <Mic size={36} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <p className="text-sm text-slate-400 font-medium text-center min-h-[1.25rem]">
        {label}
      </p>
    </div>
  )
}
