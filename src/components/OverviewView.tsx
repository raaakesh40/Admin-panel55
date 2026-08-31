import type { DashboardData } from '../types'
import { RefreshCw, Users, Shield, Coins, Trophy, TrendingDown, AlertTriangle, LogIn } from 'lucide-react'

interface OverviewViewProps {
  dashboard: DashboardData | null
  error: string
  retry: () => void
  isRefreshing: boolean
  onSignOut?: () => void
}

export function OverviewView({ dashboard, error, retry, isRefreshing, onSignOut }: OverviewViewProps) {
  if (error) {
    const isAuthError =
      error.toLowerCase().includes('auth') ||
      error.toLowerCase().includes('401') ||
      error.toLowerCase().includes('token')

    return (
      <div className="state-card error-state">
        <div className="state-icon">
          <AlertTriangle size={32} color="#f64e60" />
        </div>
        <h2>Connection Error</h2>
        <p className="state-desc">{error}</p>
        <div className="header-btn-group">
          <button className="primary small-btn" onClick={retry} disabled={isRefreshing}>
            <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
            {isRefreshing ? 'Retrying...' : 'Retry'}
          </button>
          {isAuthError && onSignOut && (
            <button className="secondary small-btn" onClick={onSignOut}>
              <LogIn size={14} /> Re-login
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="loading-card">
        <RefreshCw size={24} className="spinning" color="#aa3bff" />
        <p>Loading metrics...</p>
      </div>
    )
  }

  const totals = dashboard.totals || {
    users: 0,
    hosts: 0,
    playCoins: 0,
    winningCoins: 0,
    cancelledOmbs: 0,
    cancelledTournaments: 0,
  }

  const metricCards = [
    {
      title: 'Users',
      value: (totals.users ?? 0).toLocaleString(),
      hint: 'Registered players',
      icon: <Users size={20} color="#aa3bff" />,
    },
    {
      title: 'Hosts',
      value: (totals.hosts ?? 0).toLocaleString(),
      hint: 'Active organizers',
      icon: <Shield size={20} color="#3699ff" />,
    },
    {
      title: 'Play Coins',
      value: (totals.playCoins ?? 0).toLocaleString(),
      hint: 'Platform balance',
      icon: <Coins size={20} color="#ffa800" />,
    },
    {
      title: 'Winning Coins',
      value: (totals.winningCoins ?? 0).toLocaleString(),
      hint: 'Withdrawable pool',
      icon: <Trophy size={20} color="#1bc5bd" />,
    },
  ]

  return (
    <div className="overview-container">
      <div className="welcome-banner">
        <div>
          <h2>Platform Overview</h2>
          <p>Real-time system stats</p>
        </div>
        <div className="live-status-badge">
          <span className="live-dot" />
          <span>Live</span>
        </div>
      </div>

      <div className="metric-grid">
        {metricCards.map((card, idx) => (
          <article className="metric-card" key={idx}>
            <div className="metric-card-top">
              <span className="metric-title">{card.title}</span>
              <div className="metric-icon-box">{card.icon}</div>
            </div>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-sub">{card.hint}</span>
          </article>
        ))}
      </div>

      <div className="section-divider">
        <h3>Operations</h3>
        <span className="period-chip">30 Days</span>
      </div>

      <div className="chart-grid">
        <article className="pulse-card coral-pulse">
          <div className="pulse-header">
            <div className="pulse-title">
              <TrendingDown size={18} color="#f64e60" />
              <span>OMB Cancellations</span>
            </div>
            <strong>{(totals.cancelledOmbs ?? 0).toLocaleString()}</strong>
          </div>
          <div className="pulse-footer">
            <small>Refunded to Play Coins</small>
          </div>
        </article>

        <article className="pulse-card teal-pulse">
          <div className="pulse-header">
            <div className="pulse-title">
              <TrendingDown size={18} color="#1bc5bd" />
              <span>Tournament Cancellations</span>
            </div>
            <strong>{(totals.cancelledTournaments ?? 0).toLocaleString()}</strong>
          </div>
          <div className="pulse-footer">
            <small>Slot fees returned</small>
          </div>
        </article>
      </div>
    </div>
  )
}
