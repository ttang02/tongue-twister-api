import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import { LANG_THEME, DEFAULT_THEME } from '@/constants/themes'
import { Onboarding } from '@/components/Onboarding'
import { useOnboarding } from '@/hooks/useOnboarding'

function RootLayout() {
  const { t }    = useTranslation()
  const language = useGameStore((s) => s.language)
  const { showOnboarding, complete } = useOnboarding()

  const theme = language ? LANG_THEME[language] : DEFAULT_THEME

  return (
    <div
      data-lang={language ?? undefined}
      className="min-h-svh flex flex-col"
    >
      {showOnboarding && <Onboarding onDone={complete} />}

      <header className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link to="/" className="flex items-center gap-2 font-extrabold text-xl tracking-tight">
          <span className="text-2xl">{theme.flag}</span>
          <span style={{ color: 'rgb(var(--p))' }}>Virelangues</span>
        </Link>

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
      </header>

      <main className="flex-1 flex flex-col items-center justify-center
                       px-4 py-6 max-w-2xl mx-auto w-full
                       pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
