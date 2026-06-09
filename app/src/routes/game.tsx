import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useDebounce } from '@/hooks/useDebounce'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, Trophy, RefreshCw, Share2, Star, Sparkles, Flame, GraduationCap, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PhraseCard } from '@/components/PhraseCard'
import { MicButton } from '@/components/MicButton'
import { GameTimer } from '@/components/GameTimer'
import { Confetti } from '@/components/Confetti'
import { useGameStore, TIMER_MS, ACCURACY_THRESHOLD } from '@/store/gameStore'
import { LANG_THEME, DEFAULT_THEME } from '@/constants/themes'
import type { Difficulty, Phrase } from '@/store/gameStore'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameTimer } from '@/hooks/useGameTimer'
import { computeAccuracy, normalizeWord, expandCompounds } from '@/hooks/useAccuracy'
import { useCountUp } from '@/hooks/useCountUp'
import { useTTS } from '@/hooks/useTTS'
import { useShallow } from 'zustand/react/shallow'

export const Route = createFileRoute('/game')({ component: GamePage })

const API_URL     = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
// Errors that must NOT trigger silent auto-retry (would cause a visible loop on mobile)
const PERM_ERRORS = ['mic_denied', 'mic_not_supported', 'recorder_not_supported', 'speech_not_supported', 'speech_network']

// Hoisted spring configs — constant per star index, no allocation inside .map()
const STAR_SPRINGS = [
  { type: 'spring' as const, delay: 0.25, bounce: 0.55 },
  { type: 'spring' as const, delay: 0.35, bounce: 0.55 },
  { type: 'spring' as const, delay: 0.45, bounce: 0.55 },
]

// Data-driven upsell — avoids duplicating identical button JSX
const UPSELL_MAP = [
  { from: 'easy',   to: 'medium' as Difficulty, key: 'game.upsell_medium' },
  { from: 'medium', to: 'hard'   as Difficulty, key: 'game.upsell_hard'   },
] as const

// Typed difficulty label lookup — avoids dynamic template-literal keys
const DIFF_KEYS: Record<Difficulty, Parameters<ReturnType<typeof useTranslation>['t']>[0]> = {
  easy:   'difficulty.easy',
  medium: 'difficulty.medium',
  hard:   'difficulty.hard',
}

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
          className="select-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={STAR_SPRINGS[s - 1]}
          style={{
            display: 'inline-block',
            filter: s <= filled ? 'drop-shadow(0 0 8px rgba(251,191,36,0.7))' : 'none',
          }}
          aria-hidden
        >
          <Star
            size={24}
            style={{
              fill:  s <= filled ? '#fbbf24' : 'transparent',
              color: s <= filled ? '#fbbf24' : 'rgba(255,255,255,0.15)',
            }}
          />
        </motion.span>
      ))}
    </div>
  )
}

// SuccessPanel uses useTranslation directly — no prop-drilling of t
function SuccessPanel({
  score, accuracy, sessionScore, sessionCount, sessionStreak, isNewRecord,
}: {
  score: number; accuracy: number; sessionScore: number; sessionCount: number
  sessionStreak: number; isNewRecord: boolean
}) {
  const { t }            = useTranslation()
  const displayed        = useCountUp(score, 800)
  const displayedSession = useCountUp(sessionScore, 900)
  return (
    <motion.div
      key="success"
      className="text-center space-y-4 w-full pop-in"
      aria-live="assertive"
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {/* Icon + title */}
      <div className="flex flex-col items-center gap-2">
        <motion.div
          className="inline-flex items-center justify-center w-12 h-12 rounded-full"
          style={{ background: 'rgb(var(--p) / 0.15)' }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.7 }}
          aria-hidden
        >
          <Sparkles size={22} style={{ color: 'rgb(var(--p))' }} />
        </motion.div>
        <p className="text-2xl font-black font-display glow-text" style={{ color: 'rgb(var(--p))' }}>
          {t('game.success')}
        </p>
      </div>

      <StarRating accuracy={accuracy} />

      {/* Score hero */}
      <div
        className="inline-flex flex-col items-center gap-0.5 px-7 py-3 rounded-2xl glow-box"
        style={{ background: 'rgb(var(--p) / 0.12)' }}
      >
        <span className="text-4xl font-black tabular-nums font-display" style={{ color: 'rgb(var(--p))' }}>
          +{displayed}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            {t('game.points_label')}
          </span>
          {isNewRecord && (
            <motion.span
              className="flex items-center gap-1 text-xs font-bold text-amber-400"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.6, delay: 0.5 }}
            >
              <Trophy size={11} />
              {t('game.new_record')}
            </motion.span>
          )}
        </div>
      </div>

      {/* Compact stats row */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span
          className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
          style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80' }}
        >
          {Math.round(accuracy * 100)}% {t('game.accuracy_short')}
        </span>

        {sessionStreak >= 2 && (
          <motion.span
            className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5, delay: 0.3 }}
            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
          >
            <Flame size={13} />
            {t('game.streak', { count: sessionStreak })}
          </motion.span>
        )}

        {sessionCount > 0 && (
          <motion.span
            className="flex items-center gap-1.5 text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ color: '#facc15' }}
          >
            <Trophy size={12} />
            <span className="font-bold tabular-nums">{displayedSession}</span>
            <span className="text-xs text-slate-500">
              {t('game.session_total', { count: sessionCount })}
            </span>
          </motion.span>
        )}
      </div>
    </motion.div>
  )
}

function GamePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // PERF: Granular selectors — only re-render when specific field changes.
  const language      = useGameStore((s) => s.language)
  const difficulty    = useGameStore((s) => s.difficulty)
  const phrase        = useGameStore((s) => s.phrase)
  const phase         = useGameStore((s) => s.phase)
  const score         = useGameStore((s) => s.score)
  const wordScores    = useGameStore((s) => s.wordScores)
  const accuracy      = useGameStore((s) => s.accuracy)
  const transcript    = useGameStore((s) => s.transcript)
  const playerName    = useGameStore((s) => s.playerName)
  const sessionScore  = useGameStore((s) => s.sessionScore)
  const sessionCount  = useGameStore((s) => s.sessionCount)
  const sessionStreak = useGameStore((s) => s.sessionStreak)
  const threshold     = useGameStore((s) => s.threshold)

  // Actions never change identity — useShallow for stable ref
  const {
    setPhrase, startRecording, stopRecording,
    setResult, timeout, retry, setPlayerName, goToLeaderboard,
  } = useGameStore(useShallow((s) => ({
    setPhrase:       s.setPhrase,
    startRecording:  s.startRecording,
    stopRecording:   s.stopRecording,
    setResult:       s.setResult,
    timeout:         s.timeout,
    retry:           s.retry,
    setPlayerName:   s.setPlayerName,
    goToLeaderboard: s.goToLeaderboard,
  })))

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
          transcript,   // server recomputes accuracy from this (anti-cheat)
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

  // Memoize target word array — stable per phrase, avoids recompute on every transcript tick
  const targetWords = useMemo(
    () => phrase
      ? expandCompounds(phrase.text).trim().split(/\s+/).map(normalizeWord).filter(Boolean)
      : [],
    [phrase?.text] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const elapsedMsRef   = useRef(0)
  const startTimeRef   = useRef(0)
  const autoStopRef    = useRef(false)
  const autoRetryCount = useRef(0)
  const apiErrorRef    = useRef(false)
  const handleStartRef = useRef<() => Promise<void>>(() => Promise.resolve())
  const handleStopRef  = useRef<() => Promise<void>>(() => Promise.resolve())
  const primaryCtaRef  = useRef<HTMLButtonElement>(null)  // result-screen CTA (a11y focus target)
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

  // a11y: move focus to the result-screen primary action so keyboard / screen-reader
  // users land on the next step instead of being stranded after a phase transition.
  useEffect(() => {
    if (phase === 'success' || phase === 'failure' || phase === 'timeout') {
      const id = setTimeout(() => primaryCtaRef.current?.focus(), 300)
      return () => clearTimeout(id)
    }
  }, [phase])

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

  // Auto-validate via live transcript (debounced 150 ms)
  const debouncedTranscript = useDebounce(speech.liveTranscript, 150)

  useEffect(() => {
    if (phase !== 'recording' || !debouncedTranscript || !phrase) return
    if (autoStopRef.current) return

    const spoken = expandCompounds(debouncedTranscript)
      .trim()
      .split(/\s+/)
      .map(normalizeWord)
      .filter(Boolean)

    if (spoken.length < targetWords.length) return

    const { accuracy: acc } = computeAccuracy(debouncedTranscript, phrase.text)
    const autoStopThreshold = (ACCURACY_THRESHOLD[language ?? 'en'] ?? 0.72) * 0.9

    if (acc >= autoStopThreshold) { autoStopRef.current = true; handleStopRef.current() }
  }, [debouncedTranscript, phase, phrase, language, targetWords]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const pb    = getPersonalBest(phrase.id)
    const isNew = score > pb
    setIsNewRecord(isNew)
    if (isNew) savePersonalBest(phrase.id, score)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(() => {
    const text = `${Math.round(accuracy * 100)}% — ${score ?? 0} pts ! "${phrase?.text?.slice(0, 50)}" #Virelangues`
    if (typeof navigator.share === 'function') {
      navigator.share({ title: 'Virelangues', text, url: window.location.origin }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).catch(() => {})
    }
  }, [accuracy, score, phrase])

  // Single LANG_THEME lookup — avoids two hash reads per render
  const theme      = language ? LANG_THEME[language] : DEFAULT_THEME
  const themeHex   = theme.hex
  const langNative = theme.native
  const diffLabel  = difficulty ? t(DIFF_KEYS[difficulty]) : ''

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

      {/* Context badge: language · difficulty */}
      {language && difficulty && (
        <div className="flex items-center gap-2 self-start">
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgb(var(--p) / 0.8)',
            }}
          >
            {langNative} · {diffLabel}
          </span>
          {practiceMode && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <GraduationCap size={12} />
              {t('game.practice_hint')}
            </span>
          )}
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
          lang={language ?? 'en'}
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
                {Math.round(accuracy * 100)}% {t('game.accuracy_short')}
                {' '}{t('game.accuracy_required', { threshold: Math.round(threshold * 100) })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic + practice toggle */}
      {!isSuccess && !isFailed && (phase === 'phrase_display' || isPlaying || speech.state === 'error') && (
        <div className="mt-1 flex flex-col items-center gap-3">
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
          {/* Practice toggle — inline transitions specified explicitly (transition-colors only covers class-based props) */}
          <button
            onClick={() => setPracticeMode(m => !m)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full cursor-pointer"
            style={practiceMode ? {
              background:  'rgba(251,191,36,0.1)',
              color:       '#fbbf24',
              border:      '1px solid rgba(251,191,36,0.2)',
              fontWeight:  600,
              transition:  'background 200ms ease, color 200ms ease, border-color 200ms ease',
            } : {
              color:       'rgb(100 116 139)',
              border:      '1px solid transparent',
              transition:  'background 200ms ease, color 200ms ease, border-color 200ms ease',
            }}
          >
            <GraduationCap size={12} />
            {practiceMode ? t('game.practice_active') : t('game.practice_mode')}
          </button>
        </div>
      )}

      {/* Success actions */}
      {isSuccess && (
        <motion.div
          className="flex flex-col items-center gap-3 w-full max-w-xs"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            ref={primaryCtaRef}
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
                placeholder={t('game.player_placeholder')}
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
              {t('game.score_duplicate')}
            </motion.p>
          )}

          {!practiceMode && submitScore.isError && (
            <p className="text-red-400 text-xs text-center">{t('game.save_error')}</p>
          )}

          {/* Share + difficulty upsell — data-driven from UPSELL_MAP */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {(typeof navigator.share === 'function' || !!navigator.clipboard) && (
              <motion.button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', transition: 'opacity 150ms ease' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              >
                <Share2 size={12} />
                {t('game.share')}
              </motion.button>
            )}

            {UPSELL_MAP.filter(u => u.from === difficulty && sessionCount >= 2).map(u => (
              <motion.button
                key={u.to}
                onClick={() => { useGameStore.setState({ difficulty: u.to }); handleNextPhrase() }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', transition: 'opacity 150ms ease' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              >
                <TrendingUp size={11} />
                {t(u.key)}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {isFailed && (
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        >
          <button ref={primaryCtaRef} onClick={handleRetry} className="btn-primary px-7 min-h-[44px]">
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
