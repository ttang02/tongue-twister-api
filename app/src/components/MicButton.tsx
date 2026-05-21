import { motion } from 'motion/react'
import { Mic, MicOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { SpeechState } from '@/hooks/useSpeech'

interface Props {
  state:        SpeechState
  onStart:      () => void
  onStop:       () => void
  disabled?:    boolean
}

const config: Record<SpeechState, { icon: React.ReactNode; label: string; classes: string }> = {
  idle:       { icon: <Mic size={28} />,         label: 'Appuie pour parler',  classes: 'bg-indigo-600 hover:bg-indigo-500 active:scale-95' },
  recording:  { icon: <Mic size={28} />,         label: 'Relâche pour valider', classes: 'bg-red-500 scale-110' },
  processing: { icon: <Loader2 size={28} className="animate-spin" />, label: 'Analyse...', classes: 'bg-slate-600 cursor-wait' },
  done:       { icon: <CheckCircle2 size={28} />, label: 'Validé',              classes: 'bg-green-500' },
  error:      { icon: <MicOff size={28} />,       label: 'Erreur micro',        classes: 'bg-red-700' },
}

export function MicButton({ state, onStart, onStop, disabled }: Props) {
  const { icon, label, classes } = config[state]
  const isRecording = state === 'recording'

  return (
    <motion.button
      className={`
        relative flex items-center justify-center
        size-20 md:size-24 rounded-full text-white shadow-lg
        transition-colors duration-200 select-none
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400
        ${classes}
        ${disabled ? 'opacity-40 pointer-events-none' : ''}
      `}
      onPointerDown={state === 'idle' ? onStart : undefined}
      onPointerUp={isRecording ? onStop : undefined}
      onPointerLeave={isRecording ? onStop : undefined}
      animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={isRecording ? { repeat: Infinity, duration: 0.8 } : {}}
      aria-label={label}
      aria-pressed={isRecording}
      disabled={disabled}
    >
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping" />
      )}
      {icon}
    </motion.button>
  )
}
