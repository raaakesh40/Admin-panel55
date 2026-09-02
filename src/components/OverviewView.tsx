import { useState, useEffect } from 'react'
import type { DashboardData, Game, GameMode, CompetitionSchedule } from '../types'
import { api } from '../services/api'
import {
  RefreshCw,
  Users,
  Shield,
  Coins,
  Trophy,
  TrendingDown,
  AlertTriangle,
  LogIn,
  Gamepad2,
  Swords,
  Calendar,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  Archive,
} from 'lucide-react'

interface OverviewViewProps {
  dashboard: DashboardData | null
  error: string
  retry: () => void
  isRefreshing: boolean
  onSignOut?: () => void
  onNavigateToGames?: () => void
  onNavigateToOmb?: () => void
  onNavigateToTournaments?: () => void
}

export function OverviewView({
  dashboard,
  error,
  retry,
  isRefreshing,
  onSignOut,
  onNavigateToGames,
  onNavigateToOmb,
  onNavigateToTournaments,
}: OverviewViewProps) {
  const [games, setGames] = useState<Game[]>([])
  const [modes, setModes] = useState<GameMode[]>([])
  const [schedules, setSchedules] = useState<CompetitionSchedule[]>([])
  const [loadingCompetitions, setLoadingCompetitions] = useState(false)

  // Quick filter states
  const [typeFilter, setTypeFilter] = useState<'all' | 'omb' | 'tournament'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'closed'>('all')

  useEffect(() => {
    let ignore = false
    async function loadCompetitions() {
      setLoadingCompetitions(true)
      try {
        const [gamesRes, modesRes, schedulesRes] = await Promise.all([
          api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
          api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
          api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules').catch(() => ({ schedules: [] })),
        ])
        if (ignore) return

        const gamesList = Array.isArray(gamesRes?.games)
          ? gamesRes.games
          : Array.isArray(gamesRes)
          ? (gamesRes as Game[])
          : []
        const modesList = Array.isArray(modesRes?.modes)
          ? modesRes.modes
          : Array.isArray(modesRes)
          ? (modesRes as GameMode[])
          : []
        const schedulesList = Array.isArray(schedulesRes?.schedules)
          ? schedulesRes.schedules
          : Array.isArray(schedulesRes)
          ? (schedulesRes as CompetitionSchedule[])
          : []

        setGames(gamesList)
        setModes(modesList)
        setSchedules(schedulesList)
      } catch {
        // Soft fallback
      } finally {
        if (!ignore) setLoadingCompetitions(false)
      }
    }
    loadCompetitions()
    return () => {
      ignore = true
    }
  }, [])

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

  const ombModes = modes.filter((m) => m.type === 'omb')
  const tournamentModes = modes.filter((m) => m.type === 'tournament')

  const modeMap = new Map<string, GameMode>()
  modes.forEach((m) => modeMap.set(m.id, m))

  const publishedSchedules = schedules.filter((s) => s.status === 'published')
  const draftSchedules = schedules.filter((s) => s.status === 'draft')
  const closedSchedules = schedules.filter((s) => s.status === 'closed')

  // Filtered schedules for quick preview
  const filteredSchedules = schedules.filter((s) => {
    const parentMode = modeMap.get(s.modeId)
    if (typeFilter !== 'all' && parentMode && parentMode.type !== typeFilter) {
      return false
    }
    if (statusFilter !== 'all' && s.status !== statusFilter) {
      return false
    }
    return true
  })

  const metricCards = [
    {
      title: 'Games Catalog',
      value: games.length.toLocaleString(),
      hint: 'Global titles',
      icon: <Gamepad2 size={20} color="#3b82f6" />,
      onClick: onNavigateToGames,
    },
    {
      title: 'OMB Modes',
      value: ombModes.length.toLocaleString(),
      hint: '1v1 battle configurations',
      icon: <Swords size={20} color="#8b5cf6" />,
      onClick: onNavigateToOmb,
    },
    {
      title: 'Tournament Modes',
      value: tournamentModes.length.toLocaleString(),
      hint: 'Championship league configs',
      icon: <Trophy size={20} color="#f59e0b" />,
      onClick: onNavigateToTournaments,
    },
    {
      title: 'Active Schedules',
      value: publishedSchedules.length.toLocaleString(),
      hint: `${draftSchedules.length} drafts, ${closedSchedules.length} closed`,
      icon: <Calendar size={20} color="#10b981" />,
    },
  ]

  const platformCards = [
    {
      title: 'Registered Users',
      value: (totals.users ?? 0).toLocaleString(),
      hint: 'Platform players',
      icon: <Users size={18} color="#aa3bff" />,
    },
    {
      title: 'Active Hosts',
      value: (totals.hosts ?? 0).toLocaleString(),
      hint: 'Room organizers',
      icon: <Shield size={18} color="#3699ff" />,
    },
    {
      title: 'Play Coins in Wallets',
      value: (totals.playCoins ?? 0).toLocaleString(),
      hint: 'Entry fee deposits',
      icon: <Coins size={18} color="#ffa800" />,
    },
    {
      title: 'Winning Coins Pool',
      value: (totals.winningCoins ?? 0).toLocaleString(),
      hint: 'Withdrawable balance',
      icon: <Trophy size={18} color="#1bc5bd" />,
    },
  ]

  return (
    <div className="overview-container">
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div>
          <h2>Competition Platform Overview</h2>
          <p>Overview of active games, match modes, schedules, and player activity</p>
        </div>
        <div className="live-status-badge">
          <span className="live-dot" />
          <span>Live Operations</span>
        </div>
      </div>

      {/* Primary Competition Metric Cards */}
      <div className="metric-grid">
        {metricCards.map((card, idx) => (
          <article
            className={`metric-card ${card.onClick ? 'clickable-card' : ''}`}
            key={idx}
            onClick={card.onClick}
          >
            <div className="metric-card-top">
              <span className="metric-title">{card.title}</span>
              <div className="metric-icon-box">{card.icon}</div>
            </div>
            <strong className="metric-value">{loadingCompetitions ? '...' : card.value}</strong>
            <div className="metric-card-foot">
              <span className="metric-sub">{card.hint}</span>
              {card.onClick && <ChevronRight size={14} className="chevron-indicator" />}
            </div>
          </article>
        ))}
      </div>

      {/* Schedule Status Breakdown Bar */}
      <div className="schedule-status-breakdown-bar">
        <div className="status-pill published-pill">
          <CheckCircle2 size={14} />
          <span>Published / Live: <strong>{publishedSchedules.length}</strong></span>
        </div>
        <div className="status-pill draft-pill">
          <Clock size={14} />
          <span>Draft Slots: <strong>{draftSchedules.length}</strong></span>
        </div>
        <div className="status-pill closed-pill">
          <Archive size={14} />
          <span>Closed / Ended: <strong>{closedSchedules.length}</strong></span>
        </div>
      </div>

      {/* Quick Filters & Recent Schedule Activity */}
      <div className="section-divider">
        <div className="filter-group">
          <Filter size={13} color="var(--text-muted)" />
          <select
            id="overview-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'omb' | 'tournament')}
            className="filter-select"
          >
            <option value="all">All Competition Types ({schedules.length})</option>
            <option value="omb">OMB Only ({schedules.filter((s) => modeMap.get(s.modeId)?.type === 'omb').length})</option>
            <option value="tournament">Tournament Only ({schedules.filter((s) => modeMap.get(s.modeId)?.type === 'tournament').length})</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            id="overview-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft' | 'closed')}
            className="filter-select"
          >
            <option value="all">All Statuses ({schedules.length})</option>
            <option value="published">Published ({publishedSchedules.length})</option>
            <option value="draft">Draft ({draftSchedules.length})</option>
            <option value="closed">Closed ({closedSchedules.length})</option>
          </select>
        </div>

        <span className="muted-count">
          Showing {filteredSchedules.length} of {schedules.length} match schedules
        </span>
      </div>

      {/* Platform Finance & Cancellations */}
      <div className="section-divider" style={{ marginTop: '24px' }}>
        <h3>Platform Wallets & Audit</h3>
        <span className="period-chip">30 Days</span>
      </div>

      <div className="metric-grid platform-metric-grid">
        {platformCards.map((card, idx) => (
          <article className="metric-card mini-metric-card" key={idx}>
            <div className="metric-card-top">
              <span className="metric-title">{card.title}</span>
              <div className="metric-icon-box">{card.icon}</div>
            </div>
            <strong className="metric-value">{card.value}</strong>
            <span className="metric-sub">{card.hint}</span>
          </article>
        ))}
      </div>

      <div className="chart-grid" style={{ marginTop: '16px' }}>
        <article className="pulse-card coral-pulse">
          <div className="pulse-header">
            <div className="pulse-title">
              <TrendingDown size={18} color="#f64e60" />
              <span>OMB Cancellations</span>
            </div>
            <strong>{(totals.cancelledOmbs ?? 0).toLocaleString()}</strong>
          </div>
          <div className="pulse-footer">
            <small>Entry fees refunded to Play Coins</small>
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
            <small>Slot fees refunded to players</small>
          </div>
        </article>
      </div>
    </div>
  )
}

