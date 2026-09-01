import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Game, GameMode } from '../types'
import { api } from '../services/api'
import {
  Gamepad2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Swords,
  Trophy,
  Search,
  Check,
} from 'lucide-react'

interface GamesViewProps {
  onNavigateToOmb?: (gameId?: string) => void
  onNavigateToTournament?: (gameId?: string) => void
}

export function GamesView({ onNavigateToOmb, onNavigateToTournament }: GamesViewProps) {
  const [games, setGames] = useState<Game[]>([])
  const [modes, setModes] = useState<GameMode[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [newGameLogoUrl, setNewGameLogoUrl] = useState('')
  const [creatingGame, setCreatingGame] = useState(false)

  async function loadData() {
    setLoading(true)
    setErrorMessage('')
    try {
      const [gamesRes, modesRes] = await Promise.all([
        api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
        api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
      ])

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

      setGames(gamesList)
      setModes(modesList)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch games')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function init() {
      setLoading(true)
      try {
        const [gamesRes, modesRes] = await Promise.all([
          api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
          api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
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

        setGames(gamesList)
        setModes(modesList)
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch games')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  async function handleCreateGame(e: FormEvent) {
    e.preventDefault()
    setCreatingGame(true)
    setErrorMessage('')
    setSuccessMessage('')

    const name = newGameName.trim()
    if (!name || name.length > 128) {
      setErrorMessage('Game name must be between 1 and 128 characters.')
      setCreatingGame(false)
      return
    }

    const payload: { name: string; logoUrl?: string | null } = { name }
    if (newGameLogoUrl.trim()) {
      payload.logoUrl = newGameLogoUrl.trim()
    }

    try {
      const res = await api<{ game?: Game }>('/admin/competition/games', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.game?.id || (res as Record<string, unknown>)?.id || 'OK'
      setSuccessMessage(`Game "${name}" created successfully (ID: ${createdId}).`)
      setNewGameName('')
      setNewGameLogoUrl('')
      setShowCreateModal(false)
      await loadData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create game on /api/admin/competition/games')
    } finally {
      setCreatingGame(false)
    }
  }

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="domain-view-container">
      {/* Header */}
      <div className="view-header">
        <div>
          <h2>Master Game Catalog</h2>
          <p>
            Global game definitions (PUBG, Free Fire, Chess, etc.). Games are shared catalogs that host independent OMB and Tournament modes.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="refresh-games-catalog-btn"
            className="secondary small-btn"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spinning' : ''} /> Refresh Catalog
          </button>
          <button
            id="create-game-catalog-btn"
            className="primary small-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={14} /> Add New Game
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="alert-box error" role="alert">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button className="close-alert-btn" onClick={() => setErrorMessage('')}>
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert-box success" role="status">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
          <button className="close-alert-btn" onClick={() => setSuccessMessage('')}>
            ✕
          </button>
        </div>
      )}

      {/* Domain stats banner */}
      <div className="catalog-stats-bar">
        <div className="catalog-stat-item">
          <Gamepad2 size={18} color="#3b82f6" />
          <div>
            <strong>{games.length}</strong>
            <span>Total Games</span>
          </div>
        </div>
        <div className="catalog-stat-item">
          <Swords size={18} color="#8b5cf6" />
          <div>
            <strong>{modes.filter((m) => m.type === 'omb').length}</strong>
            <span>OMB Modes</span>
          </div>
        </div>
        <div className="catalog-stat-item">
          <Trophy size={18} color="#f59e0b" />
          <div>
            <strong>{modes.filter((m) => m.type === 'tournament').length}</strong>
            <span>Tournament Modes</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="section-divider">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            id="game-search-input"
            type="text"
            placeholder="Search games by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
        <span className="muted-count">Showing {filteredGames.length} of {games.length} catalog items</span>
      </div>

      {/* Grid */}
      {loading && games.length === 0 ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spinning" color="#3b82f6" />
          <p>Loading master games from /api/competitions/games...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="state-card">
          <div className="state-icon">
            <Gamepad2 size={32} color="#3b82f6" />
          </div>
          <h3>{searchQuery ? 'No Matching Games Found' : 'No Games in Catalog'}</h3>
          <p className="state-desc">
            {searchQuery
              ? `No games match "${searchQuery}". Try clearing your search.`
              : 'The game catalog is empty. Click below to register your first game.'}
          </p>
          {!searchQuery && (
            <button
              className="primary small-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={14} /> Add First Game
            </button>
          )}
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredGames.map((g) => {
            const ombModes = modes.filter((m) => m.gameId === g.id && m.type === 'omb')
            const tournamentModes = modes.filter((m) => m.gameId === g.id && m.type === 'tournament')

            return (
              <article key={g.id} className="catalog-game-card">
                <div className="catalog-card-header">
                  {g.logoUrl ? (
                    <img
                      src={g.logoUrl}
                      alt={g.name}
                      className="catalog-game-logo"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="catalog-logo-placeholder">
                      <Gamepad2 size={24} />
                    </div>
                  )}
                  <div className="catalog-game-info">
                    <h4>{g.name}</h4>
                    <span className="catalog-game-uuid">ID: {g.id}</span>
                    <span className="catalog-status-badge active">
                      <Check size={10} /> Active Catalog
                    </span>
                  </div>
                </div>

                <div className="catalog-domain-counts">
                  <div className="domain-count-pill omb-pill">
                    <Swords size={12} />
                    <span>{ombModes.length} OMB Mode{ombModes.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="domain-count-pill tournament-pill">
                    <Trophy size={12} />
                    <span>{tournamentModes.length} Tournament Mode{tournamentModes.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                <div className="catalog-actions">
                  <button
                    className="domain-nav-btn omb-nav-btn"
                    onClick={() => onNavigateToOmb && onNavigateToOmb(g.id)}
                    title="Open OMB Section for this Game"
                  >
                    <Swords size={12} /> Manage OMBs ({ombModes.length})
                  </button>
                  <button
                    className="domain-nav-btn tournament-nav-btn"
                    onClick={() => onNavigateToTournament && onNavigateToTournament(g.id)}
                    title="Open Tournament Section for this Game"
                  >
                    <Trophy size={12} /> Manage Tournaments ({tournamentModes.length})
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal: Create Game */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Gamepad2 size={20} color="#3b82f6" />
                <h3>Add New Game to Catalog</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="modal-form">
              <p className="form-info-text">
                Creates a game catalog item on <code>POST /api/admin/competition/games</code>. Competition rules (OMB/Tournament) are defined separately in their respective domains.
              </p>

              <label>
                Game Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. PUBG Mobile, Free Fire, Chess"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  maxLength={128}
                />
              </label>

              <label>
                Logo Image URL (Optional)
                <input
                  type="url"
                  placeholder="https://example.com/game-logo.png"
                  value={newGameLogoUrl}
                  onChange={(e) => setNewGameLogoUrl(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small-btn"
                  disabled={creatingGame}
                >
                  {creatingGame ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
