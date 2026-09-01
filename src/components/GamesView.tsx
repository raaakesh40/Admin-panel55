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
  Edit2,
  Power,
  Filter,
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [newGameLogoUrl, setNewGameLogoUrl] = useState('')
  const [creatingGame, setCreatingGame] = useState(false)

  // Edit Modal
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [editGameName, setEditGameName] = useState('')
  const [editGameLogoUrl, setEditGameLogoUrl] = useState('')
  const [editGameIsActive, setEditGameIsActive] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [updatingGame, setUpdatingGame] = useState(false)

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

    const isDuplicate = games.some(
      (g) => g.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) {
      setErrorMessage('A game with this name already exists in the catalog.')
      setCreatingGame(false)
      return
    }

    const trimmedLogo = newGameLogoUrl.trim()
    if (trimmedLogo && !trimmedLogo.startsWith('http://') && !trimmedLogo.startsWith('https://')) {
      setErrorMessage('Logo URL must be a valid URL starting with http:// or https://')
      setCreatingGame(false)
      return
    }

    const payload = {
      name,
      logoUrl: trimmedLogo || null,
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
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('409') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('unique') ||
        msg.toLowerCase().includes('23505')
      ) {
        setErrorMessage('A game with this name already exists in the catalog.')
      } else {
        setErrorMessage(msg || 'Failed to create game')
      }
    } finally {
      setCreatingGame(false)
    }
  }

  function openEditGame(g: Game) {
    setEditingGame(g)
    setEditGameName(g.name)
    setEditGameLogoUrl(g.logoUrl || '')
    setEditGameIsActive(g.isActive !== false)
    setShowEditModal(true)
  }

  async function handleUpdateGame(e: FormEvent) {
    e.preventDefault()
    if (!editingGame) return

    setUpdatingGame(true)
    setErrorMessage('')
    setSuccessMessage('')

    const name = editGameName.trim()
    if (!name || name.length > 128) {
      setErrorMessage('Game name must be between 1 and 128 characters.')
      setUpdatingGame(false)
      return
    }

    const isDuplicate = games.some(
      (g) => g.id !== editingGame.id && g.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) {
      setErrorMessage('A game with this name already exists in the catalog.')
      setUpdatingGame(false)
      return
    }

    const trimmedLogo = editGameLogoUrl.trim()
    if (trimmedLogo && !trimmedLogo.startsWith('http://') && !trimmedLogo.startsWith('https://')) {
      setErrorMessage('Logo URL must be a valid URL starting with http:// or https://')
      setUpdatingGame(false)
      return
    }

    const payload = {
      name,
      logoUrl: trimmedLogo || null,
      isActive: editGameIsActive,
    }

    try {
      await api(`/admin/competition/games/${editingGame.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setSuccessMessage(`Game "${name}" updated successfully.`)
      setShowEditModal(false)
      setEditingGame(null)
      await loadData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update game')
    } finally {
      setUpdatingGame(false)
    }
  }

  async function toggleGameActive(g: Game) {
    const nextState = g.isActive === false
    try {
      await api(`/admin/competition/games/${g.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextState }),
      })
      setSuccessMessage(`Game "${g.name}" ${nextState ? 'activated' : 'deactivated'} successfully.`)
      setGames((prev) =>
        prev.map((item) => (item.id === g.id ? { ...item, isActive: nextState } : item))
      )
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle game status')
    }
  }

  const filteredGames = games.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (statusFilter === 'active') return g.isActive !== false
    if (statusFilter === 'inactive') return g.isActive === false
    return true
  })

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

        <div className="filter-group">
          <Filter size={13} color="var(--text-muted)" />
          <select
            id="game-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="filter-select"
          >
            <option value="all">All Status ({games.length})</option>
            <option value="active">Active Only ({games.filter((g) => g.isActive !== false).length})</option>
            <option value="inactive">Inactive Only ({games.filter((g) => g.isActive === false).length})</option>
          </select>
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
          <h3>{searchQuery || statusFilter !== 'all' ? 'No Matching Games Found' : 'No Games in Catalog'}</h3>
          <p className="state-desc">
            {searchQuery || statusFilter !== 'all'
              ? `No games match your filters. Try clearing search or status selection.`
              : 'The game catalog is empty. Click below to register your first game.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
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
            const isActive = g.isActive !== false

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
                    <div className="catalog-name-row">
                      <h4>{g.name}</h4>
                      <button
                        className="icon-edit-btn"
                        onClick={() => openEditGame(g)}
                        title="Edit Game"
                        aria-label={`Edit game ${g.name}`}
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                    <span className="catalog-game-uuid">ID: {g.id}</span>
                    <div className="status-toggle-row">
                      <span className={`catalog-status-badge ${isActive ? 'active' : 'inactive'}`}>
                        {isActive ? <Check size={10} /> : <Power size={10} />}
                        {isActive ? 'Active Catalog' : 'Deactivated'}
                      </span>
                      <button
                        className={`status-quick-toggle-btn ${isActive ? 'deactivate-btn' : 'activate-btn'}`}
                        onClick={() => toggleGameActive(g)}
                        title={isActive ? 'Deactivate Game' : 'Activate Game'}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
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

      {/* Modal: Edit Game */}
      {showEditModal && editingGame && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Gamepad2 size={20} color="#3b82f6" />
                <h3>Edit Game: {editingGame.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGame} className="modal-form">
              <p className="form-info-text">
                Updates game catalog item on <code>PATCH /api/admin/competition/games/{editingGame.id}</code>.
              </p>

              <label>
                Game Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. PUBG Mobile, Free Fire, Chess"
                  value={editGameName}
                  onChange={(e) => setEditGameName(e.target.value)}
                  maxLength={128}
                />
              </label>

              <label>
                Logo Image URL (Optional)
                <input
                  type="url"
                  placeholder="https://example.com/game-logo.png"
                  value={editGameLogoUrl}
                  onChange={(e) => setEditGameLogoUrl(e.target.value)}
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editGameIsActive}
                  onChange={(e) => setEditGameIsActive(e.target.checked)}
                />
                <span>Active in Catalog (allows new modes & schedules)</span>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small-btn"
                  disabled={updatingGame}
                >
                  {updatingGame ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
