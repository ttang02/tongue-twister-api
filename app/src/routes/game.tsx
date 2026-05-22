import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, Trophy } from 'lucide-react'
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
const AUTO_ADVANCE_S = 3

function SuccessPanel({
  score, accuracy, sessionScore, sessionCount, t,
}: {
  score: number; accuracy: number; sessionScore: number; sessionCount: number; t: (k: string) => string
}) {
  const displayed        = useCountUp(score, 800)
  const displayedSession = useCountUp(sessionScore, 900)
  return (
    <motion.div key="success" className="text-center space-y-3 w-full pop-in" aria-live="assertive">
      <motion.div
        className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
        style={{ background: 'rgb(var(--p) / 0.15)' }}
        animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
        transition={{ duration: 0.7 }}
        aria-hidden
      >
        <span className="text-2xl select-none">🎉</span>
      </motion.div>

      <p className="text-2xl font-black text-gradient glow-text font-display">{t('game.success')}</p>

      {/* Phrase score */}
      <div className="inline-flex flex-col items-center gap-0.5 px-7 py-3 rounded-2xl glow-box"
           style={{ background: 'rgb(var(--p) / 0.12)' }}>
        <span className="text-4xl font-black tabular-nums font-display" style={{ color: 'rgb(var(--p))' }}>
          +{displayed}
        </span>
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">points</span>
      </div>

      {/* Session total */}
      {sessionCount > 0 && (
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <Trophy size={13} className="text-yellow-400" />
          <span className="text-sm font-bold tabular-nums" style={{ color: '#facc15' }}>
            {displayedSession}
          </span>
          <span className="text-xs text-slate-400">
            total · {sessionCount} phrase{sessionCount > 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

      {/* Accuracy pill */}
      <div className="flex justify-center">
        <span className="px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}>
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
    phase, score, wordScores, accuracy, playerName,
    sessionScore, sessionCount,
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
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]!)
    }
  }, [phrases, phrase, setPhrase])

  const elapsedMsRef   = useRef(0)
  const startTimeRef   = useRef(0)
  const autoStopRef    = useRef(false)
  const autoRetryCount = useRef(0)
  const apiErrorRef    = useRef(false)
  const handleStartRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const [shaking, setShaking]     = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)

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
      apiErrorRef.current = true
      timer.reset()
      retry()
    }
  }

  const handleNextPhrase = () => {
    setCountdown(null)
    autoStopRef.current = false
    autoRetryCount.current = 0
    if (phrases && phrases.length > 0) {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]!)
    }
    timer.reset(); speech.reset(); retry()
  }

  const handleRetry = () => {
    autoStopRef.current = false
    autoRetryCount.current = 0
    timer.reset(); speech.reset(); retry()
  }

  // Auto-advance countdown after success
  useEffect(() => {
    if (phase !== 'success') { setCountdown(null); return }
    setCountdown(AUTO_ADVANCE_S)
  }, [phase])

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const id = setTimeout(() => setCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (countdown === 0) handleNextPhrase()
  }, [countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  // Shake on failure/timeout
  useEffect(() => {
    if (phase === 'failure' || phase === 'timeout') {
      setShaking(true)
      const id = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(id)
    }
  }, [phase])

  // Auto-validate via live transcript
  useEffect(() => {
    if (phase !== 'recording' || !speech.liveTranscript || !phrase) return
    if (autoStopRef.current) return
    const spoken = speech.liveTranscript.trim().split(/\s+/).filter(Boolean)
    const target = phrase.text.trim().split(/\s+/).filter(Boolean)
    if (spoken.length < target.length) return
    const { accuracy: acc } = computeAccuracy(speech.liveTranscript, phrase.text)
    if (acc >= 0.62) { autoStopRef.current = true; handleStop() }
  }, [speech.liveTranscript, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-retry mic errors only
  useEffect(() => {
    if (speech.state !== 'error') { autoRetryCount.current = 0; return }
    if (PERM_ERRORS.includes(speech.error ?? '')) return
    if (apiErrorRef.current) { apiErrorRef.current = false; return }
    if (autoRetryCount.current >= 3) return
    autoRetryCount.current++
    const id = setTimeout(() => {
      speech.reset(); retry()
      setTimeout(() => handleStartRef.current(), 80)
    }, 1200)
    return () => clearTimeout(id)
  }, [speech.state, speech.error]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="flex flex-col items-center gap-5 w-full slide-up">
      <Confetti active={isSuccess} primaryColor={themeHex} />

      {/* Timer */}
      <GameTimer percent={timer.percent} remaining={timer.remaining} />

      {/* Phrase card */}
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
          <SuccessPanel
            score={score ?? 0}
            accuracy={accuracy}
            sessionScore={sessionScore}
            sessionCount={sessionCount}
            t={t}
          />
        )}
        {isFailed && (
          <motion.div
            key="fail"
            className="text-center space-y-2 w-full"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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

      {/* Mic button */}
      {(phase === 'phrase_display' || isPlaying || speech.state === 'error') && (
        <div className="mt-1">
          <MicButton
            state={speech.state}
            onStart={handleStart}
            onStop={handleStop}
            onRetry={() => {
              autoRetryCount.current = 0
              speech.reset(); retry()
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
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {/* Auto-advance button with countdown */}
          <button
            onClick={handleNextPhrase}
            className="btn-primary w-full text-base flex items-center justify-center gap-2"
          >
            {t('game.next_phrase')}
            {countdown !== null && countdown > 0 && (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black"
                style={{ background: 'rgba(255,255,255,0.25)' }}
              >
                {countdown}
              </span>
            )}
          </button>

          {/* Save score (stops auto-advance) */}
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              placeholder="Ton prénom"
              maxLength={30}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onFocus={() => setCountdown(null)}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500
                         focus:outline-none focus:ring-2"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                '--tw-ring-color': 'rgb(var(--p) / 0.6)',
              } as React.CSSProperties}
            />
            <button
              onClick={() => { setCountdown(null); submitScore.mutate(playerName || 'Anonyme') }}
              disabled={submitScore.isPending}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              {submitScore.isPending ? '…' : t('game.save_score')}
            </button>
          </div>
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
