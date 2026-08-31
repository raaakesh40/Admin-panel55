import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
          <div
            style={{
              padding: '24px',
              borderRadius: '12px',
              background: 'var(--surface-color, #1e1e2d)',
              border: '1px solid var(--border-color, #2d2d3f)',
              color: 'var(--text-color, #fff)',
            }}
          >
            <AlertCircle size={40} color="#ff4d4f" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '18px' }}>
              {this.props.fallbackTitle || 'Something went wrong on this page'}
            </h3>
            <p style={{ color: '#aaa', fontSize: '14px', margin: '0 0 20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#aa3bff',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={16} /> Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
