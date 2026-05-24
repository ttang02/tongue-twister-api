import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, Trophy, RefreshCw, Share2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PhraseCard } from '@/components/PhraseCard'
import { MicButton } from '@/components/MicButton'
import { GameTimer } from '@/components/GameTimer'
import { Confetti } from '@/components/Confetti'
import { useGameStore, TIMER_MS, ACCURACY_THRESHOLD } from '@/store/gameStore'
import { LANG_THEME } from '@/constants/themes'
import type { Phrase } from '@/store/gameStore'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameTimer } from '@/hooks/useGameTimer'
import { computeAccuracy, normalizeWord, expandCompounds } from '@/hooks/useAccuracy'
import { useCountUp } from '@/hooks/useCountUp'
import { useTTS } from '@/hooks/useTTS'

export const Route = createFileRoute('/game')({ component: GamePage })

const API_URL   = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const PERM_ERRORS = ['mic_denied', 'mic_not_supported', 'recorder_not_supported', 'speech_not_supported']

function getPersonalBest(phraseId: number): number {
  try { return Number(localStorage.getItem(`tt_pb_${phraseId}`)) || 0 } catch { return 0 }
}
function savePersonalBest(phraseId: number, score: number): void {
  try { localStorage.setItem(`tt_pb_${phraseId}`, String(score)) } catch {}
}

function StarRating({ accuracy }: { accuracy: number }) {
  const filled = accuracy >= 0.95 ? 3 : accuracy >= 0.85 ? 2 : 1
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <motion.span
          key={s}
          className="text-2xl select-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.15 + s * 0.1, bounce: 0.55 }}
          style={{
            color:  s <= filled ? '#fbbf24' : '#1e293b',
            filter: s <= filled ? 'drop-shadow(0 0 8px rgba(251,191,36,0.7))' : 'none',
          }}
          aria-hidden
        >
          ★
        </motion.span>
      ))}
    </div>
  )
}

function SuccessPanel({
  score, accuracy, sessionScore, sessionCount, sessionStreak, isNewRecord, t,
}: {
  score: number; accuracy: number; sessionScore: number; sessionCount: number
  sessionStreak: number; isNewRecord: boolean; t: (k: string) => string
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

      <StarRating accuracy={accuracy} />

      <div className="inline-flex flex-col items-center gap-0.5 px-7 py-3 rounded-2xl glow-box"
           style={{ background: 'rgb(var(--p) / 0.12)' }}>
        <span className="text-4xl font-black tabular-nums font-display" style={{ color: 'rgb(var(--p))' }}>
          +{displayed}
        </span>
        <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">points</span>
      </div>

      {isNewRecord && (
        <motion.div
          className="flex items-center justify-center gap-1.5"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.6, delay: 0.5 }}
        >
          <span className="text-amber-400 text-sm font-bold">🏆 Nouveau record !</span>
        </motion.div>
      )}

      {sessionStreak >= 2 && (
        <motion.div
          className="flex items-center justify-center gap-1 text-sm font-bold"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
          style={{ color: '#f59e0b' }}
        >
          🔥 {sessionStreak} à la suite !
        </motion.div>
      )}

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
    sessionScore, sessionCount, sessionStreak, threshold,
    setPhrase, startRecording, stopRecording,
    setResult, timeout, retry, setPlayerName, goToLeaderboard,
  } = useGameStore()

  useEffect(() => {
    if (!language || !difficulty) navigate({ to: '/' })
  }, [language, difficulty, navigate])

  const { data: phrases, isError: phrasesError, refetch: refetchPhrases } = useQuery({
    queryKey: ['phrases', language, difficulty],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/phrases?lang=${language}&difficulty=${difficulty}&limit=20`)
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json() as { data: Phrase[] }
      return json.data
    },
    enabled: !!language && !!difficulty,
    staleTime: 5 * 60_000,
    retry: 2,
  })

  const submitScore = useMutation({
    mutationFn: async (name: string) => {
      if (!phrase) throw new Error('no_phrase')
      const res = await fetch(`${API_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase_id:   phrase.id,
          player_name: name,
          elapsed_ms:  elapsedMsRef.current,
          accuracy,
        }),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      return res.json() as Promise<{ id: number; score: number; rank: number; duplicate?: boolean }>
    },
    onSuccess: (data, name) => {
      if (data.duplicate) {
        setDuplicateNotice(true)
        setTimeout(() => setDuplicateNotice(false), 3000)
      }
      const trimmed = name.trim()
      if (trimmed && trimmed !== 'Anonyme') {
        const updated = [trimmed, ...savedNames.filter(n => n !== trimmed)].slice(0, 10)
        setSavedNames(updated)
        localStorage.setItem('tt_player_names', JSON.stringify(updated))
      }
      qc.invalidateQueries({ queryKey: ['players'] })
      goToLeaderboard()
      navigate({ to: '/leaderboard' })
    },
  })

  // Pre-fill name from history on first success
  useEffect(() => {
    if (phase === 'success' && !playerName && savedNames.length > 0) {
      setPlayerName(savedNames[0]!)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phrases && phrases.length > 0 && !phrase) {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]!)
    }
  }, [phrases, phrase, setPhrase])

  const elapsedMsRef    = useRef(0)
  const startTimeRef    = useRef(0)
  const autoStopRef     = useRef(false)
  const autoRetryCount  = useRef(0)
  const apiErrorRef     = useRef(false)
  const handleStartRef  = useRef<() => Promise<void>>(() => Promise.resolve())
  const handleStopRef   = useRef<() => Promise<void>>(() => Promise.resolve())
  const liveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shaking, setShaking]                 = useState(false)
  const [duplicateNotice, setDuplicateNotice] = useState(false)
  const [isNewRecord, setIsNewRecord]         = useState(false)
  const [practiceMode, setPracticeMode]       = useState(false)
  const [savedNames, setSavedNames] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tt_player_names') ?? '[]') } catch { return [] }
  })

  // On timeout: still process audio — user may have said it in time
  const handleTimeout = () => {
    if (practiceMode) { timer.reset(); speech.reset(); retry(); return }
    if (useGameStore.getState().phase === 'recording') {
      handleStopRef.current()
    } else {
      timeout()
    }
  }
  const timerDuration = difficulty ? TIMER_MS[difficulty] : 20_000
  const timer  = useGameTimer(timerDuration, handleTimeout)
  const speech = useSpeech(language ?? 'en')
  const tts    = useTTS(language)

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
      const text = spoken.trim() || speech.liveTranscript.trim()
      if (!text) { timer.reset(); retry(); return }
      const { accuracy: acc, wordScores: ws } = computeAccuracy(text, phrase?.text ?? '')
      setResult(text, acc, ws, elapsedMsRef.current)
    } catch {
      const fallback = speech.liveTranscript.trim()
      if (fallback) {
        const { accuracy: acc, wordScores: ws } = computeAccuracy(fallback, phrase?.text ?? '')
        setResult(fallback, acc, ws, elapsedMsRef.current)
      } else {
        apiErrorRef.current = true
        timer.reset()
        retry()
      }
    }
  }
  handleStopRef.current = handleStop

  const handleNextPhrase = () => {
    autoStopRef.current = false
    autoRetryCount.current = 0
    tts.cancel()
    setIsNewRecord(false)
    if (phrases && phrases.length > 0) {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]!)
    }
    timer.reset(); speech.reset(); retry()
  }

  const handleRetry = () => {
    autoStopRef.current = false
    autoRetryCount.current = 0
    tts.cancel()
    setIsNewRecord(false)
    timer.reset(); speech.reset(); retry()
  }

  // Shake on failure/timeout
  useEffect(() => {
    if (phase === 'failure' || phase === 'timeout') {
      setShaking(true)
      const id = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(id)
    }
  }, [phase])

  // Speak phrase aloud after result — helps user learn correct pronunciation
  useEffect(() => {
    if ((phase === 'success' || phase === 'failure' || phase === 'timeout') && phrase) {
      const id = setTimeout(() => tts.speak(phrase.text), 600)
      return () => { clearTimeout(id); tts.cancel() }
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-validate via live transcript (debounced 150ms)
  useEffect(() => {
    if (phase !== 'recording' || !speech.liveTranscript || !phrase) return
    if (autoStopRef.current) return

    if (liveDebounceRef.current) clearTimeout(liveDebounceRef.current)
    liveDebounceRef.current = setTimeout(() => {
      const spoken = expandCompounds(speech.liveTranscript).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
      const target = expandCompounds(phrase.text).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
      if (spoken.length < target.length) return
      const { accuracy: acc } = computeAccuracy(speech.liveTranscript, phrase.text)
      const autoStopThreshold = (ACCURACY_THRESHOLD[language ?? 'en'] ?? 0.72) * 0.9
      if (acc >= autoStopThreshold) { autoStopRef.current = true; handleStopRef.current() }
    }, 150)
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

  // Personal best tracking
  useEffect(() => {
    if (phase !== 'success' || !phrase || score === null) return
    const pb  = getPersonalBest(phrase.id)
    const isNew = score > pb
    setIsNewRecord(isNew)
    if (isNew) savePersonalBest(phrase.id, score)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(() => {
    const text = `🎤 ${Math.round(accuracy * 100)}% de précision — ${score ?? 0} pts ! "${phrase?.text?.slice(0, 50)}" #Virelangues`
    if (typeof navigator.share === 'function') {
      navigator.share({ title: 'Virelangues', text, url: window.location.origin }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [accuracy, score, phrase])

  const themeHex = language ? LANG_THEME[language].hex : '#6366f1'
  const isPlaying = phase === 'recording' || phase === 'processing'
  const isSuccess = phase === 'success'
  const isFailed  = phase === 'failure' || phase === 'timeout'

  if (phrasesError) {
    return (
      <div className="flex flex-col items-center gap-5 text-center slide-up">
        <p className="text-red-400 font-semibold">Impossible de charger les phrases</p>
        <p className="text-slate-500 text-sm">Vérifie ta connexion et réessaie.</p>
        <button onClick={() => refetchPhrases()} className="btn-primary flex items-center gap-2 px-6">
          <RefreshCw size={16} /> Réessayer
        </button>
      </div>
    )
  }

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

      {practiceMode && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
          🎓 Mode entraînement — score non sauvegardé
        </div>
      )}

      <GameTimer percent={timer.percent} remaining={timer.remaining} />

      <motion.div
        className="w-full"
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

      <AnimatePresence mode="wait">
        {isSuccess && (
          <SuccessPanel
            score={score ?? 0}
            accuracy={accuracy}
            sessionScore={sessionScore}
            sessionCount={sessionCount}
            sessionStreak={sessionStreak}
            isNewRecord={isNewRecord}
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
                {Math.round(accuracy * 100)}% obtenu — {Math.round(threshold * 100)}% requis
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isSuccess && !isFailed && (phase === 'phrase_display' || isPlaying || speech.state === 'error') && (
        <div className="mt-1 flex flex-col items-center gap-2">
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
          <button
            onClick={() => setPracticeMode(m => !m)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              practiceMode
                ? 'text-amber-400 bg-amber-400/10 font-semibold'
                : 'text-slate-600 hover:text-slate-400'
            }`}
          >
            🎓 {practiceMode ? 'Entraînement ON' : 'Mode entraînement'}
          </button>
        </div>
      )}

      {isSuccess && (
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-xs"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={handleNextPhrase}
            className="btn-primary w-full text-base flex items-center justify-center gap-2"
          >
            {t('game.next_phrase')}
          </button>

          {!practiceMode && (
            <div className="flex items-center gap-2 w-full">
              <datalist id="player-names">
                {savedNames.map(n => <option key={n} value={n} />)}
              </datalist>
              <input
                type="text"
                list="player-names"
                placeholder="Ton prénom"
                maxLength={30}
                value={playerName}
                disabled={submitScore.isPending}
                autoComplete="given-name"
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !submitScore.isPending) { submitScore.mutate(playerName || 'Anonyme') } }}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500
                           focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  '--tw-ring-color': 'rgb(var(--p) / 0.6)',
                } as React.CSSProperties}
              />
              <button
                onClick={() => submitScore.mutate(playerName || 'Anonyme')}
                disabled={submitScore.isPending}
                className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {submitScore.isPending ? <Loader2 size={16} className="animate-spin" /> : t('game.save_score')}
              </button>
            </div>
          )}

          {!practiceMode && duplicateNotice && (
            <motion.p
              className="text-xs text-amber-400 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              ⚠ Score déjà enregistré pour cette phrase
            </motion.p>
          )}

          {!practiceMode && submitScore.isError && (
            <p className="text-red-400 text-xs text-center">
              Erreur lors de la sauvegarde — réessaie.
            </p>
          )}

          {(typeof navigator.share === 'function' || !!navigator.clipboard) && (
            <motion.button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white
                         transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            >
              <Share2 size={13} />
              Partager
            </motion.button>
          )}

          {difficulty === 'easy' && sessionCount >= 2 && (
            <motion.button
              onClick={() => { useGameStore.setState({ difficulty: 'medium' }); handleNextPhrase() }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            >
              Essaie en Moyen ? 💪
            </motion.button>
          )}
          {difficulty === 'medium' && sessionCount >= 2 && (
            <motion.button
              onClick={() => { useGameStore.setState({ difficulty: 'hard' }); handleNextPhrase() }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline underline-offset-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            >
              Prêt pour le Difficile ? 🔥
            </motion.button>
          )}
        </motion.div>
      )}

      {isFailed && (
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          <button onClick={handleRetry} className="btn-primary px-7 min-h-[44px]">
            {t('game.try_again')}
          </button>
          <button
            onClick={handleNextPhrase}
            className="px-5 py-3 rounded-2xl text-slate-300 hover:text-white transition-colors min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {t('game.next_phrase')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
