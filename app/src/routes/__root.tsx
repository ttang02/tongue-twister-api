import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Trophy, HelpCircle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { LANG_THEME, DEFAULT_THEME } from '@/constants/themes'
import { Onboarding } from '@/components/Onboarding'
import { useOnboarding } from '@/hooks/useOnboarding'

function RootLayout() {
  const { t }    = useTranslation()
  const language = useGameStore((s) => s.language)
  const { showOnboarding, complete, reset: resetOnboarding } = useOnboarding()

  const theme = language ? LANG_THEME[language] : DEFAULT_THEME

  return (
    <div data-lang={language ?? undefined} className="min-h-svh flex flex-col" style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {showOnboarding && <Onboarding onDone={complete} />}

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <Link to="/" onClick={() => useGameStore.getState().reset()} className="flex items-center gap-2 font-extrabold text-lg tracking-tight group">
          <span className="text-2xl transition-transform duration-300 group-hover:scale-110">
            {theme.flag}
          </span>
          <span className="text-gradient glow-text font-display">Virelangues</span>
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
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '42rem',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%',
          padding: '1.5rem 1rem',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
