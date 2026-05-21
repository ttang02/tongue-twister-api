import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PhraseCard } from '@/components/PhraseCard'
import { MicButton } from '@/components/MicButton'
import { GameTimer } from '@/components/GameTimer'
import { TranscriptDiff } from '@/components/TranscriptDiff'
import { useGameStore, TIMER_MS } from '@/store/gameStore'
import type { Phrase } from '@/store/gameStore'
import { useSpeech } from '@/hooks/useSpeech'
import { useGameTimer } from '@/hooks/useGameTimer'
import { computeAccuracy } from '@/hooks/useAccuracy'

export const Route = createFileRoute('/game')({ component: GamePage })

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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

  // Redirect to home if no language/difficulty set
  useEffect(() => {
    if (!language || !difficulty) navigate({ to: '/' })
  }, [language, difficulty, navigate])

  const { data: phrases } = useQuery({
    queryKey: ['phrases', language, difficulty],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/phrases?lang=${language}&difficulty=${difficulty}&limit=10`)
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

  // Pick a random phrase when phrases load
  useEffect(() => {
    if (phrases && phrases.length > 0 && !phrase) {
      const p = phrases[Math.floor(Math.random() * phrases.length)]!
      setPhrase(p)
    }
  }, [phrases, phrase, setPhrase])

  const elapsedMsRef = useRef(0)
  const startTimeRef = useRef(0)

  const handleTimeout = () => timeout()

  const timerDuration = difficulty ? TIMER_MS[difficulty] : 20_000
  const timer = useGameTimer(timerDuration, handleTimeout)

  const speech = useSpeech(language ?? 'en')

  const handleStart = async () => {
    startRecording()
    startTimeRef.current = Date.now()
    timer.start()
    await speech.start()
  }

  const handleStop = async () => {
    timer.pause()
    stopRecording()
    elapsedMsRef.current = Date.now() - startTimeRef.current

    try {
      const spoken = await speech.stop()
      const { accuracy: acc, wordScores: ws } = computeAccuracy(spoken, phrase?.text ?? '')
      setResult(spoken, acc, ws, elapsedMsRef.current)
    } catch {
      timer.reset()
      retry()
    }
  }

  const handleRetry = () => {
    timer.reset()
    speech.reset()
    retry()
  }

  const handleNextPhrase = () => {
    if (phrases && phrases.length > 0) {
      const next = phrases[Math.floor(Math.random() * phrases.length)]!
      setPhrase(next)
    }
    timer.reset()
    speech.reset()
    retry()
  }

  if (!phrase) {
    return <div className="text-slate-400 animate-pulse text-center">Chargement…</div>
  }

  const isPlaying = phase === 'recording' || phase === 'processing'

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Timer */}
      <GameTimer percent={timer.percent} remaining={timer.remaining} />

      {/* Phrase */}
      <PhraseCard text={phrase.text} />

      {/* Live transcript */}
      {speech.liveTranscript && phase === 'recording' && (
        <p className="text-slate-400 text-sm italic text-center px-2">
          « {speech.liveTranscript} »
        </p>
      )}

      {/* Result feedback */}
      <AnimatePresence mode="wait">
        {phase === 'success' && (
          <motion.div
            key="success"
            className="text-center space-y-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            aria-live="assertive"
          >
            <p className="text-3xl font-extrabold text-green-400">{t('game.success')}</p>
            <p className="text-slate-300">
              {t('game.your_score')} : <span className="font-bold text-indigo-400 text-xl">{score}</span>
            </p>
            <p className="text-slate-400 text-sm">
              {t('game.accuracy')} : {Math.round(accuracy * 100)}%
            </p>
          </motion.div>
        )}

        {(phase === 'failure' || phase === 'timeout') && (
          <motion.div
            key="fail"
            initial={{ x: -8 }}
            animate={{ x: [0, -8, 8, -6, 6, 0] }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-3 w-full"
            aria-live="assertive"
          >
            <p className="text-xl font-bold text-red-400">
              {phase === 'timeout' ? t('game.time_up') : '😬 ' + t('game.try_again')}
            </p>
            {phase === 'failure' && wordScores.length > 0 && (
              <TranscriptDiff
                targetWords={phrase.text.split(/\s+/)}
                spokenWords={transcript.split(/\s+/)}
                wordScores={wordScores}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      {(phase === 'phrase_display' || phase === 'recording' || phase === 'processing') && (
        <div className="flex flex-col items-center gap-2">
          <MicButton
            state={speech.state}
            onStart={handleStart}
            onStop={handleStop}
            disabled={phase === 'processing'}
          />
          <p className="text-slate-400 text-xs">
            {phase === 'recording' ? t('game.release_to_validate') : t('game.hold_to_speak')}
          </p>
        </div>
      )}

      {/* Success actions */}
      {phase === 'success' && (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <input
            type="text"
            placeholder="Ton prénom"
            maxLength={30}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="
              w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3
              text-white placeholder:text-slate-500
              focus:outline-none focus:ring-2 focus:ring-indigo-400
            "
          />
          <button
            onClick={() => submitScore.mutate(playerName || 'Anonyme')}
            disabled={submitScore.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {submitScore.isPending ? '…' : t('game.save_score')}
          </button>
          <button onClick={handleNextPhrase} className="text-slate-400 text-sm hover:text-white transition-colors">
            {t('game.next_phrase')}
          </button>
        </div>
      )}

      {/* Retry after failure */}
      {(phase === 'failure' || phase === 'timeout') && (
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            {t('game.try_again')}
          </button>
          <button
            onClick={handleNextPhrase}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-colors"
          >
            {t('game.next_phrase')}
          </button>
        </div>
      )}
    </div>
  )
}
