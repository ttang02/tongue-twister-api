import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PhraseCard } from '@/components/PhraseCard'
import { MicButton } from '@/components/MicButton'
import { GameTimer } from '@/components/GameTimer'
import { Confetti } from '@/components/Confetti'
import { useGameStore, TIMER_MS } from '@/store/gameStore'
import { LANG_THEME } from '@/constants/themes'
import type { Phrase } from '@/store/gameStore'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameTimer } from '@/hooks/useGameTimer'
import { computeAccuracy } from '@/hooks/useAccuracy'
import { useCountUp } from '@/hooks/useCountUp'

export const Route = createFileRoute('/game')({ component: GamePage })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const PERM_ERRORS = ['mic_denied', 'mic_not_supported', 'recorder_not_supported']

function SuccessPanel({ score, accuracy, t }: { score: number; accuracy: number; t: (k: string) => string }) {
  const displayed = useCountUp(score, 900)
  return (
    <motion.div
      key="success"
      className="text-center space-y-4 w-full pop-in"
      aria-live="assertive"
    >
      <motion.div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full mx-auto"
        style={{ background: 'rgb(var(--p) / 0.15)' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.7 }}
        aria-hidden
      >
        <span className="text-3xl select-none">🎉</span>
      </motion.div>
      <p className="text-3xl font-black text-gradient glow-text font-display">{t('game.success')}</p>

      {/* Score badge */}
      <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-2xl glow-box"
           style={{ background: 'rgb(var(--p) / 0.12)' }}>
        <span className="text-5xl font-black tabular-nums font-display" style={{ color: 'rgb(var(--p))' }}>
          {displayed}
        </span>
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">points</span>
      </div>

      {/* Accuracy pill */}
      <div className="flex justify-center gap-2 text-sm text-slate-400">
        <span className="px-3 py-1 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
          ✓ {Math.round(accuracy * 100)}% précision
        </span>
      </div>
    </motion.div>
  )
}

function GamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const {
    language, difficulty, phrase,
    phase, score, wordScores, transcript, accuracy, playerName,
    setPhrase, startRecording, stopRecording,
    setResult, timeout, retry, setPlayerName, goToLeaderboard,
  } = useGameStore()

  useEffect(() => {
    if (!language || !difficulty) navigate({ to: '/' })
  }, [language, difficulty, navigate])

  const { data: phrases } = useQuery({
    queryKey: ['phrases', language, difficulty],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/phrases?lang=${language}&difficulty=${difficulty}&limit=20`)
      const json = await res.json() as { data: Phrase[] }
      return json.data
    },
    enabled: !!language && !!difficulty,
    staleTime: 5 * 60_000,
  })

  const submitScore = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase_id:   phrase!.id,
          player_name: name,
          elapsed_ms:  elapsedMsRef.current,
          accuracy,
        }),
      })
      return res.json() as Promise<{ id: number; score: number; rank: number }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scores'] })
      goToLeaderboard()
      navigate({ to: '/leaderboard' })
    },
  })

  useEffect(() => {
    if (phrases && phrases.length > 0 && !phrase) {
      const p = phrases[Math.floor(Math.random() * phrases.length)]!
      setPhrase(p)
    }
  }, [phrases, phrase, setPhrase])

  const elapsedMsRef   = useRef(0)
  const startTimeRef   = useRef(0)
  const autoStopRef    = useRef(false)
  const autoRetryCount = useRef(0)
  const apiErrorRef    = useRef(false)   // true when error came from transcription, not from mic
  // Always points to the latest handleStart — safe to call from setTimeout
  const handleStartRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [shaking, setShaking] = useState(false)

  const handleTimeout = () => timeout()
  const timerDuration = difficulty ? TIMER_MS[difficulty] : 20_000
  const timer  = useGameTimer(timerDuration, handleTimeout)
  const speech = useSpeech(language ?? 'en')

  const handleStart = async () => {
    autoStopRef.current = false
    startRecording()
    startTimeRef.current = Date.now()
    timer.start()
    const ok = await speech.start()
    if (!ok) { timer.reset(); retry() }
  }
  handleStartRef.current = handleStart

  const handleStop = async () => {
    if (useGameStore.getState().phase !== 'recording') return
    timer.pause()
    stopRecording()
    elapsedMsRef.current = Date.now() - startTimeRef.current
    try {
      const spoken = await speech.stop()
      const { accuracy: acc, wordScores: ws } = computeAccuracy(spoken, phrase?.text ?? '')
      setResult(spoken, acc, ws, elapsedMsRef.current)
    } catch {
      apiErrorRef.current = true   // tell auto-retry to skip — error is from transcription
      timer.reset()
      retry()
    }
  }

  // Trigger shake on failure/timeout
  useEffect(() => {
    if (phase === 'failure' || phase === 'timeout') {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(t)
    }
  }, [phase])

  // Auto-validate: when live transcript covers all words with enough accuracy, stop automatically
  useEffect(() => {
    if (phase !== 'recording' || !speech.liveTranscript || !phrase) return
    if (autoStopRef.current) return
    const spoken = speech.liveTranscript.trim().split(/\s+/).filter(Boolean)
    const target = phrase.text.trim().split(/\s+/).filter(Boolean)
    if (spoken.length < target.length) return
    const { accuracy: acc } = computeAccuracy(speech.liveTranscript, phrase.text)
    if (acc >= 0.62) {
      autoStopRef.current = true
      handleStop()
    }
  }, [speech.liveTranscript, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry mic errors only (not transcription failures — those reset via onRetry button)
  useEffect(() => {
    if (speech.state !== 'error') { autoRetryCount.current = 0; return }
    if (PERM_ERRORS.includes(speech.error ?? '')) return
    if (apiErrorRef.current) { apiErrorRef.current = false; return }  // was API/transcription error
    if (autoRetryCount.current >= 3) return
    autoRetryCount.current++
    const id = setTimeout(() => {
      speech.reset()
      retry()
      setTimeout(() => handleStartRef.current(), 80)
    }, 1200)
    return () => clearTimeout(id)
  }, [speech.state, speech.error]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    autoStopRef.current = false
    autoRetryCount.current = 0
    timer.reset(); speech.reset(); retry()
  }

  const handleNextPhrase = () => {
    autoStopRef.current = false
    autoRetryCount.current = 0
    if (phrases && phrases.length > 0) {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]!)
    }
    timer.reset(); speech.reset(); retry()
  }

  const themeHex = language ? LANG_THEME[language].hex : '#6366f1'
  const isPlaying = phase === 'recording' || phase === 'processing'
  const isSuccess = phase === 'success'
  const isFailed  = phase === 'failure' || phase === 'timeout'

  if (!phrase) {
    return (
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(var(--p))' }} />
        <p className="text-sm animate-pulse">Chargement des phrases…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full slide-up">
      <Confetti active={isSuccess} primaryColor={themeHex} />

      {/* Timer */}
      <GameTimer percent={timer.percent} remaining={timer.remaining} />

      {/* Phrase card — live word highlighting + shake on failure */}
      <motion.div
        className={`w-full ${shaking ? 'shake' : ''}`}
        animate={shaking ? { x: [-8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <PhraseCard
          text={phrase.text}
          liveTranscript={speech.liveTranscript}
          wordScores={wordScores.length > 0 ? wordScores : undefined}
          isRecording={phase === 'recording'}
        />
      </motion.div>

      {/* Result feedback */}
      <AnimatePresence mode="wait">
        {isSuccess && (
          <SuccessPanel score={score ?? 0} accuracy={accuracy} t={t} />
        )}

        {isFailed && (
          <motion.div
            key="fail"
            className="text-center space-y-3 w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            aria-live="assertive"
          >
            <p className="text-xl font-bold text-red-400">
              {phase === 'timeout' ? t('game.time_up') : t('game.try_again')}
            </p>
            {accuracy > 0 && phase === 'failure' && (
              <p className="text-slate-400 text-sm">
                {Math.round(accuracy * 100)}% de précision — encore un effort !
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button (recording states + error) */}
      {(phase === 'phrase_display' || isPlaying || speech.state === 'error') && (
        <div className="mt-2">
          <MicButton
            state={speech.state}
            onStart={handleStart}
            onStop={handleStop}
            onRetry={() => {
              autoRetryCount.current = 0
              speech.reset()
              retry()
              setTimeout(() => handleStartRef.current(), 60)
            }}
            disabled={phase === 'processing'}
            error={speech.error}
          />
        </div>
      )}

      {/* Success actions */}
      {isSuccess && (
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-xs"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <input
            type="text"
            placeholder="Ton prénom"
            maxLength={30}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-slate-500
                       focus:outline-none focus:ring-2"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              '--tw-ring-color': 'rgb(var(--p) / 0.6)',
            } as React.CSSProperties}
          />
          <button
            onClick={() => submitScore.mutate(playerName || 'Anonyme')}
            disabled={submitScore.isPending}
            className="btn-primary w-full text-base"
          >
            {submitScore.isPending ? '…' : t('game.save_score')}
          </button>
          <button
            onClick={handleNextPhrase}
            className="text-slate-400 text-sm hover:text-white transition-colors"
          >
            {t('game.next_phrase')} →
          </button>
        </motion.div>
      )}

      {/* Retry after failure */}
      {isFailed && (
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          <button onClick={handleRetry} className="btn-primary px-7">
            {t('game.try_again')}
          </button>
          <button
            onClick={handleNextPhrase}
            className="px-5 py-3 rounded-2xl text-slate-300 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {t('game.next_phrase')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
