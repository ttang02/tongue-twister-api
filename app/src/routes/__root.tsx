import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

function RootLayout() {
  const { t } = useTranslation()
  const language = useGameStore((s) => s.language)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <Link to="/" className="font-bold text-xl text-indigo-400 tracking-tight">
          🎤 Virelangues
        </Link>
        {language && (
          <Link
            to="/leaderboard"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            aria-label={t('nav.leaderboard')}
          >
            <Trophy size={16} />
            <span className="hidden sm:inline">{t('nav.leaderboard')}</span>
          </Link>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })
