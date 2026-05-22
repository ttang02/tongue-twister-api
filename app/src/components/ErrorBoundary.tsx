import { Component, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-6">
          <p className="text-2xl">😵</p>
          <p className="text-slate-300 font-semibold">Quelque chose a planté</p>
          <p className="text-slate-500 text-sm font-mono max-w-xs break-all">
            {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <RotateCcw size={14} /> Retour à l'accueil
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
