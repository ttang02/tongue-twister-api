import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Trophy, HelpCircle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { Onboarding } from '@/components/Onboarding'
import { useOnboarding } from '@/hooks/useOnboarding'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function RootLayout() {
  const { t }    = useTranslation()
  const language = useGameStore((s) => s.language)
  const { showOnboarding, complete, reset: resetOnboarding } = useOnboarding()

  return (
    <div data-lang={language ?? undefined} className="min-h-svh flex flex-col w-full">
      {showOnboarding && <Onboarding onDone={complete} />}

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-white/8"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.25)' }}
      >
        <Link to="/" onClick={() => useGameStore.getState().reset()} className="flex items-center gap-2 font-extrabold text-lg tracking-tight group">
          <img
            src="/logo.png"
            alt=""
            className="w-8 h-8 rounded-lg transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-gradient glow-text font-display">Tongue Twister</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Re-open onboarding */}
          <button
            onClick={resetOnboarding}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label="Comment jouer"
            title="Comment jouer"
          >
            <HelpCircle size={17} />
          </button>

          {language && (
            <Link
              to="/leaderboard"
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white
                         transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
              aria-label={t('nav.leaderboard')}
            >
              <Trophy size={15} />
              <span className="hidden sm:inline">{t('nav.leaderboard')}</span>
            </Link>
          )}
        </div>
      </header>

      <main
        className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-2xl mx-auto w-full"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
