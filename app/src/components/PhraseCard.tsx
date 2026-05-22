import { motion, AnimatePresence } from 'motion/react'
import { jaroWinkler, normalizeWord, WORD_CORRECT, WORD_APPROX, expandCompounds } from '@/hooks/useAccuracy'

interface Props {
  text:           string
  liveTranscript?: string
  wordScores?:    number[]
  isRecording?:   boolean
}

type WordState = 'idle' | 'active' | 'correct' | 'approximate' | 'missed'

function getLiveWordStates(phraseWords: string[], liveWords: string[]): WordState[] {
  return phraseWords.map((pw, i) => {
    if (i > liveWords.length) return 'idle'
    if (i === liveWords.length) return 'active'
    const score = jaroWinkler(normalizeWord(liveWords[i] ?? ''), normalizeWord(pw))
    if (score >= WORD_CORRECT) return 'correct'
    if (score >= WORD_APPROX) return 'approximate'
    return 'missed'
  })
}

const STATE_STYLE: Record<WordState, { color: string; shadow?: string; opacity: number }> = {
  idle:        { color: '#cbd5e1', opacity: 0.55 },
  active:      { color: '#ffffff', opacity: 1,   shadow: '0 0 24px currentColor' },
  correct:     { color: '#4ade80', opacity: 1,   shadow: '0 0 16px rgba(74,222,128,0.5)' },
  approximate: { color: '#fb923c', opacity: 1,   shadow: '0 0 16px rgba(251,146,60,0.4)' },
  missed:      { color: '#f87171', opacity: 1,   shadow: '0 0 14px rgba(248,113,113,0.35)' },
}

function scoreToState(score: number): WordState {
  if (score >= WORD_CORRECT) return 'correct'
  if (score >= WORD_APPROX) return 'approximate'
  return 'missed'
}

// Strip tokens that are purely punctuation (e.g. standalone "?", ",")
function cleanPhraseWords(text: string): string[] {
  return expandCompounds(text).split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w))
}

export function PhraseCard({ text, liveTranscript, wordScores, isRecording }: Props) {
  const phraseWords = cleanPhraseWords(text)
  const liveWords   = liveTranscript ? liveTranscript.trim().split(/\s+/).filter(Boolean) : []
  const hasLive     = isRecording && liveWords.length > 0
  const hasFinal    = !!wordScores && wordScores.length > 0

  const wordStates: WordState[] = hasLive
    ? getLiveWordStates(phraseWords, liveWords)
    : hasFinal
    ? wordScores.map(scoreToState)
    : phraseWords.map(() => 'idle')

  return (
    <div
      className="glass w-full rounded-3xl px-6 py-8 md:px-10 md:py-12 text-center shadow-xl"
      style={{ borderColor: isRecording ? 'rgb(var(--p) / 0.45)' : 'rgb(var(--p) / 0.2)',
               transition: 'border-color 0.4s ease' }}
    >
      {/* Quote top */}
      <div
        className="text-4xl mb-3 select-none"
        style={{ color: 'rgb(var(--p) / 0.4)', transition: 'opacity 0.3s' }}
        aria-hidden
      >
        "
      </div>

      {/* Words */}
      <div
        className="flex flex-wrap justify-center gap-x-3 gap-y-2 leading-snug"
        style={{ fontSize: 'clamp(1.3rem, 4.5vw, 2.25rem)' }}
        lang="auto"
      >
        {phraseWords.map((word, i) => {
          const ws    = wordStates[i] ?? 'idle'
          const style = STATE_STYLE[ws]
          const isActive = ws === 'active'

          return (
            <motion.span
              key={i}
              className="font-extrabold tracking-tight relative"
              style={{
                color:      style.color,
                opacity:    style.opacity,
                textShadow: style.shadow,
                display:    'inline-block',
              }}
              animate={{
                color:   style.color,
                opacity: style.opacity,
                scale:   isActive ? [1, 1.08, 1] : 1,
              }}
              transition={{
                color:   { duration: 0.25 },
                opacity: { duration: 0.25 },
                scale:   isActive
                  ? { repeat: Infinity, duration: 0.9, ease: 'easeInOut' }
                  : { duration: 0.15 },
              }}
            >
              {word}
              {/* Cursor underline on active word */}
              {isActive && (
                <motion.span
                  className="absolute bottom-0 left-0 right-0 rounded-full"
                  style={{ height: 3, background: 'rgb(var(--p))' }}
                  animate={{ scaleX: [0, 1, 0.8] }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              )}
            </motion.span>
          )
        })}
      </div>

      {/* Quote bottom */}
      <div
        className="text-4xl mt-3 select-none"
        style={{ color: 'rgb(var(--p) / 0.4)' }}
        aria-hidden
      >
        "
      </div>

      {/* Live listening indicator (when recording but no live transcript yet) */}
      <AnimatePresence>
        {isRecording && !hasLive && (
          <motion.div
            className="flex justify-center gap-1.5 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="rounded-full"
                style={{ width: 6, height: 6, background: 'rgb(var(--p) / 0.6)' }}
                animate={{ scaleY: [1, 2.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score summary after success/failure */}
      <AnimatePresence>
        {hasFinal && !isRecording && (
          <motion.div
            className="flex justify-center gap-2 mt-4 flex-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            {wordScores.map((score, i) => {
              const ws = scoreToState(score)
              const s  = STATE_STYLE[ws]
              return (
                <motion.span
                  key={i}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color:      s.color,
                    background: `${s.color}20`,
                    border:     `1px solid ${s.color}40`,
                  }}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', duration: 0.3, bounce: 0.2, delay: i * 0.04 }}
                >
                  {ws === 'correct' ? '✓' : ws === 'approximate' ? '~' : '✗'} {phraseWords[i]}
                </motion.span>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
