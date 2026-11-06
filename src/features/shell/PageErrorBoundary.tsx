import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Changing this value (e.g. the route path) clears a previous error. */
  resetKey?: string
}

interface State {
  error: Error | null
}

/**
 * Keeps a crashing page (or a failed lazy chunk after a redeploy) from unmounting
 * the whole app into a blank dark screen.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <h2 className="text-base font-semibold text-text-strong">This page failed to load</h2>
        <p className="max-w-md text-xs text-text-muted">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-accent-blue px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
        >
          Reload
        </button>
      </div>
    )
  }
}
