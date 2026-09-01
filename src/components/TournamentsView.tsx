import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Game, GameMode, CompetitionSchedule, PrizeTier } from '../types'
import { api } from '../services/api'
import {
  Trophy,
  Layers,
  Calendar,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  ChevronRight,
  Target,
  Gamepad2,
} from 'lucide-react'

interface TournamentsViewProps {
  initialGameId?: string
}

export function TournamentsView({ initialGameId }: TournamentsViewProps) {
  // Domain data
  const [games, setGames] = useState<Game[]>([])
  const [modes, setModes] = useState<GameMode[]>([])
  const [schedules, setSchedules] = useState<CompetitionSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Drilldown / Active Filter Selection: Game -> Mode -> Schedules
  const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId || '')
  const [selectedModeId, setSelectedModeId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals
  const [showCreateModeModal, setShowCreateModeModal] = useState(false)
  const [showEditModeModal, setShowEditModeModal] = useState(false)
  const [editingMode, setEditingMode] = useState<GameMode | null>(null)
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false)

  // Tournament Mode Form State (Config Only - NEVER timing!)
  const [modeFormGameId, setModeFormGameId] = useState('')
  const [modeFormName, setModeFormName] = useState('')
  const [modeFormEntryFee, setModeFormEntryFee] = useState('100')
  const [modeFormMaxParticipants, setModeFormMaxParticipants] = useState('100')
  const [modeFormTeamSize, setModeFormTeamSize] = useState('1')
  const [modeFormTournamentMetric, setModeFormTournamentMetric] = useState('Score / Kills')
  const [modeFormPrizes, setModeFormPrizes] = useState<PrizeTier[]>([
    { position: 1, amount: 2000 },
    { position: 2, amount: 1000 },
    { position: 3, amount: 500 },
  ])
  const [modeFormLogoUrl, setModeFormLogoUrl] = useState('')
  const [creatingMode, setCreatingMode] = useState(false)

  // Edit Mode Form State
  const [editModeName, setEditModeName] = useState('')
  const [editModeEntryFee, setEditModeEntryFee] = useState('100')
  const [editModeMaxParticipants, setEditModeMaxParticipants] = useState('100')
  const [editModeTeamSize, setEditModeTeamSize] = useState('1')
  const [editModeTournamentMetric, setEditModeTournamentMetric] = useState('')
  const [editModePrizes, setEditModePrizes] = useState<PrizeTier[]>([])
  const [editModeLogoUrl, setEditModeLogoUrl] = useState('')
  const [editModeIsActive, setEditModeIsActive] = useState(true)
  const [updatingMode, setUpdatingMode] = useState(false)

  // Tournament Schedule Form State (Timing Only - NEVER config!)
  const [scheduleFormModeId, setScheduleFormModeId] = useState('')
  const [scheduleFormStatus, setScheduleFormStatus] = useState<'published' | 'draft' | 'closed'>('published')
  const [scheduleFormEntryClosesAt, setScheduleFormEntryClosesAt] = useState('')
  const [scheduleFormDurationMinutes, setScheduleFormDurationMinutes] = useState('60')
  const [scheduleFormResultDeadlineMinutes, setScheduleFormResultDeadlineMinutes] = useState('90')
  const [scheduleFormManagerAlertMinutes, setScheduleFormManagerAlertMinutes] = useState('5')
  const [scheduleFormGuideVideoUrl, setScheduleFormGuideVideoUrl] = useState('')
  const [scheduleFormNotes, setScheduleFormNotes] = useState('')
  const [creatingSchedule, setCreatingSchedule] = useState(false)

  // Fetch all domain data strictly for Tournaments
  async function loadTournamentData() {
    setLoading(true)
    setErrorMessage('')
    try {
      const [gamesRes, modesRes, schedulesRes] = await Promise.all([
        api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
        api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
        api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules?type=tournament').catch(() => ({ schedules: [] })),
      ])

      const gamesList = Array.isArray(gamesRes?.games)
        ? gamesRes.games
        : Array.isArray(gamesRes)
        ? (gamesRes as Game[])
        : []
      const allModes = Array.isArray(modesRes?.modes)
        ? modesRes.modes
        : Array.isArray(modesRes)
        ? (modesRes as GameMode[])
        : []
      const tournamentModes = allModes.filter((m) => m.type === 'tournament')

      const schedulesList = Array.isArray(schedulesRes?.schedules)
        ? schedulesRes.schedules
        : Array.isArray(schedulesRes)
        ? (schedulesRes as CompetitionSchedule[])
        : []

      setGames(gamesList)
      setModes(tournamentModes)
      setSchedules(schedulesList)

      if (gamesList.length > 0 && !modeFormGameId) {
        setModeFormGameId(gamesList[0].id)
      }
      if (tournamentModes.length > 0 && !scheduleFormModeId) {
        setScheduleFormModeId(tournamentModes[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load Tournament domain data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function init() {
      setLoading(true)
      try {
        const [gamesRes, modesRes, schedulesRes] = await Promise.all([
          api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
          api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
          api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules?type=tournament').catch(() => ({ schedules: [] })),
        ])
        if (ignore) return

        const gamesList = Array.isArray(gamesRes?.games)
          ? gamesRes.games
          : Array.isArray(gamesRes)
          ? (gamesRes as Game[])
          : []
        const allModes = Array.isArray(modesRes?.modes)
          ? modesRes.modes
          : Array.isArray(modesRes)
          ? (modesRes as GameMode[])
          : []
        const tournamentModes = allModes.filter((m) => m.type === 'tournament')

        const schedulesList = Array.isArray(schedulesRes?.schedules)
          ? schedulesRes.schedules
          : Array.isArray(schedulesRes)
          ? (schedulesRes as CompetitionSchedule[])
          : []

        setGames(gamesList)
        setModes(tournamentModes)
        setSchedules(schedulesList)

        if (gamesList.length > 0) {
          setModeFormGameId(gamesList[0].id)
        }
        if (tournamentModes.length > 0) {
          setScheduleFormModeId(tournamentModes[0].id)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load Tournament domain data')
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

  // Lookup maps
  const gameMap = new Map<string, Game>()
  games.forEach((g) => gameMap.set(g.id, g))

  const modeMap = new Map<string, GameMode>()
  modes.forEach((m) => modeMap.set(m.id, m))

  // Filtered lists
  const filteredModes = modes.filter((m) => !selectedGameId || m.gameId === selectedGameId)

  const filteredSchedules = schedules.filter((s) => {
    const parentMode = modeMap.get(s.modeId)
    if (!parentMode) {
      return false
    }
    if (selectedGameId && parentMode.gameId !== selectedGameId) {
      return false
    }
    if (selectedModeId && s.modeId !== selectedModeId) {
      return false
    }
    if (statusFilter !== 'all' && s.status !== statusFilter) {
      return false
    }
    return true
  })

  // Prize ladder management
  function addPrizeTier() {
    setModeFormPrizes([...modeFormPrizes, { position: modeFormPrizes.length + 1, amount: 0 }])
  }
  function removePrizeTier(index: number) {
    if (modeFormPrizes.length <= 1) return
    setModeFormPrizes(
      modeFormPrizes.filter((_, i) => i !== index).map((p, idx) => ({ ...p, position: idx + 1 }))
    )
  }
  function updatePrizeAmount(index: number, amount: number) {
    const updated = [...modeFormPrizes]
    updated[index].amount = Math.max(0, Math.round(amount))
    setModeFormPrizes(updated)
  }

  function addEditPrizeTier() {
    setEditModePrizes([...editModePrizes, { position: editModePrizes.length + 1, amount: 0 }])
  }
  function removeEditPrizeTier(index: number) {
    if (editModePrizes.length <= 1) return
    setEditModePrizes(
      editModePrizes.filter((_, i) => i !== index).map((p, idx) => ({ ...p, position: idx + 1 }))
    )
  }
  function updateEditPrizeAmount(index: number, amount: number) {
    const updated = [...editModePrizes]
    updated[index].amount = Math.max(0, Math.round(amount))
    setEditModePrizes(updated)
  }

  function openEditMode(m: GameMode) {
    setEditingMode(m)
    setEditModeName(m.name)
    setEditModeEntryFee(String(m.entryFee || 100))
    setEditModeMaxParticipants(String(m.maxParticipants || 100))
    setEditModeTeamSize(String(m.teamSize || 1))
    setEditModeTournamentMetric(m.tournamentMetric || '')
    setEditModePrizes(
      Array.isArray(m.prizes) && m.prizes.length > 0
        ? m.prizes
        : [
            { position: 1, amount: 2000 },
            { position: 2, amount: 1000 },
          ]
    )
    setEditModeLogoUrl(m.logoUrl || '')
    setEditModeIsActive(m.isActive !== false)
    setShowEditModeModal(true)
  }

  // ====================================================
  // CREATE TOURNAMENT MODE: POST /api/admin/competition/modes
  // ====================================================
  async function handleCreateMode(e: FormEvent) {
    e.preventDefault()
    setCreatingMode(true)
    setErrorMessage('')
    setSuccessMessage('')

    const gameId = modeFormGameId
    const name = modeFormName.trim()
    const feeNum = Math.round(Number(modeFormEntryFee))
    const maxPartNum = Math.round(Number(modeFormMaxParticipants))
    const teamSizeNum = Math.round(Number(modeFormTeamSize)) || 1

    if (!gameId) {
      setErrorMessage('Please select a target Game.')
      setCreatingMode(false)
      return
    }
    if (!name || name.length > 128) {
      setErrorMessage('Tournament Mode name is required (1 to 128 characters).')
      setCreatingMode(false)
      return
    }

    // Client-side uniqueness check for (gameId, name)
    const isDuplicate = modes.some(
      (m) => m.gameId === gameId && m.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) {
      setErrorMessage('A mode with this name already exists in this game.')
      setCreatingMode(false)
      return
    }

    if (isNaN(feeNum) || feeNum <= 0) {
      setErrorMessage('Entry fee must be a positive integer greater than 0.')
      setCreatingMode(false)
      return
    }
    if (isNaN(maxPartNum) || maxPartNum <= 0) {
      setErrorMessage('Max participants must be a positive integer greater than 0.')
      setCreatingMode(false)
      return
    }
    if (isNaN(teamSizeNum) || teamSizeNum <= 0) {
      setErrorMessage('Team size must be a positive integer greater than 0.')
      setCreatingMode(false)
      return
    }

    if (!Array.isArray(modeFormPrizes) || modeFormPrizes.length === 0) {
      setErrorMessage('At least one prize tier is required.')
      setCreatingMode(false)
      return
    }

    const payload = {
      gameId,
      name,
      type: 'tournament' as const,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: modeFormPrizes.map((p) => ({ position: p.position, amount: Math.round(p.amount) })),
      tournamentMetric: modeFormTournamentMetric.trim() || 'Score',
      logoUrl: modeFormLogoUrl.trim() || null,
    }

    try {
      const res = await api<{ mode?: GameMode }>('/admin/competition/modes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.mode?.id || (res as Record<string, unknown>)?.id || 'OK'
      setSuccessMessage(`Tournament Mode "${name}" created successfully (ID: ${createdId}).`)
      
      // Reset form fields
      setModeFormName('')
      setModeFormEntryFee('100')
      setModeFormMaxParticipants('100')
      setModeFormTeamSize('1')
      setModeFormTournamentMetric('Score')
      setModeFormPrizes([
        { position: 1, amount: 2000 },
        { position: 2, amount: 1000 },
      ])
      setModeFormLogoUrl('')
      setShowCreateModeModal(false)

      await loadTournamentData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('409') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('unique') ||
        msg.toLowerCase().includes('23505')
      ) {
        setErrorMessage('A mode with this name already exists in this game.')
      } else {
        setErrorMessage(msg || 'A mode with this name already exists in this game.')
      }
    } finally {
      setCreatingMode(false)
    }
  }

  // ====================================================
  // UPDATE TOURNAMENT MODE: PATCH /api/admin/competition/modes/:id
  // ====================================================
  async function handleUpdateMode(e: FormEvent) {
    e.preventDefault()
    if (!editingMode) return

    setUpdatingMode(true)
    setErrorMessage('')
    setSuccessMessage('')

    const name = editModeName.trim()
    const feeNum = Math.round(Number(editModeEntryFee))
    const maxPartNum = Math.round(Number(editModeMaxParticipants))
    const teamSizeNum = Math.round(Number(editModeTeamSize)) || 1

    if (!name || name.length > 128) {
      setErrorMessage('Tournament Mode name is required (1 to 128 characters).')
      setUpdatingMode(false)
      return
    }

    // Client-side uniqueness check for (gameId, name) on update
    const isDuplicate = modes.some(
      (m) =>
        m.gameId === editingMode.gameId &&
        m.id !== editingMode.id &&
        m.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (isDuplicate) {
      setErrorMessage('A mode with this name already exists in this game.')
      setUpdatingMode(false)
      return
    }

    if (isNaN(feeNum) || feeNum <= 0) {
      setErrorMessage('Entry fee must be a positive integer greater than 0.')
      setUpdatingMode(false)
      return
    }
    if (isNaN(maxPartNum) || maxPartNum <= 0) {
      setErrorMessage('Max participants must be a positive integer greater than 0.')
      setUpdatingMode(false)
      return
    }
    if (isNaN(teamSizeNum) || teamSizeNum <= 0) {
      setErrorMessage('Team size must be a positive integer greater than 0.')
      setUpdatingMode(false)
      return
    }

    const payload = {
      name,
      type: 'tournament' as const,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: editModePrizes.map((p) => ({ position: p.position, amount: Math.round(p.amount) })),
      tournamentMetric: editModeTournamentMetric.trim() || 'Score',
      logoUrl: editModeLogoUrl.trim() || null,
      isActive: editModeIsActive,
    }

    try {
      await api(`/admin/competition/modes/${editingMode.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setSuccessMessage(`Tournament Mode "${name}" updated successfully.`)
      setShowEditModeModal(false)
      setEditingMode(null)
      await loadTournamentData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('409') ||
        msg.toLowerCase().includes('already exists') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('unique') ||
        msg.toLowerCase().includes('23505')
      ) {
        setErrorMessage('A mode with this name already exists in this game.')
      } else {
        setErrorMessage(msg || 'Failed to update Tournament mode')
      }
    } finally {
      setUpdatingMode(false)
    }
  }

  // ====================================================
  // CREATE TOURNAMENT SCHEDULE: POST /api/admin/competition/schedules
  // (TIMING ONLY - NO CONFIG FIELDS)
  // ====================================================
  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault()
    setCreatingSchedule(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!scheduleFormModeId) {
      setErrorMessage('Please select a Tournament Mode to schedule.')
      setCreatingSchedule(false)
      return
    }

    const targetMode = modeMap.get(scheduleFormModeId)
    if (!targetMode) {
      setErrorMessage('Selected Tournament Mode not found.')
      setCreatingSchedule(false)
      return
    }

    if (!scheduleFormEntryClosesAt) {
      setErrorMessage('For Tournaments, Entry Close Time (entryClosesAt) is required.')
      setCreatingSchedule(false)
      return
    }

    const durNum = Math.round(Number(scheduleFormDurationMinutes))
    if (isNaN(durNum) || durNum <= 0) {
      setErrorMessage('Tournament duration in minutes must be an integer > 0.')
      setCreatingSchedule(false)
      return
    }

    const resultDeadline = Math.round(Number(scheduleFormResultDeadlineMinutes))
    if (isNaN(resultDeadline) || resultDeadline <= 0) {
      setErrorMessage('Result Deadline Minutes must be an integer > 0.')
      setCreatingSchedule(false)
      return
    }

    const managerAlert = Math.round(Number(scheduleFormManagerAlertMinutes))
    if (isNaN(managerAlert) || managerAlert < 0) {
      setErrorMessage('Manager Alert Delay must be an integer >= 0.')
      setCreatingSchedule(false)
      return
    }

    const payload = {
      modeId: scheduleFormModeId,
      status: scheduleFormStatus,
      startsAt: null,
      entryClosesAt: new Date(scheduleFormEntryClosesAt).toISOString(),
      durationMinutes: durNum,
      roomRevealMinutesBeforeStart: null,
      resultDeadlineMinutes: resultDeadline,
      managerAlertAfterMinutes: managerAlert,
      guideVideoUrl: scheduleFormGuideVideoUrl.trim() || null,
      notes: scheduleFormNotes.trim() || null,
    }

    try {
      const res = await api<{ schedule?: CompetitionSchedule }>('/admin/competition/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.schedule?.id || (res as Record<string, unknown>)?.id || 'OK'
      setSuccessMessage(`Tournament Schedule slot created successfully for Mode "${targetMode.name}" (ID: ${createdId}).`)
      
      // Reset form fields
      setShowCreateScheduleModal(false)
      setScheduleFormEntryClosesAt('')
      setScheduleFormDurationMinutes('120')
      setScheduleFormResultDeadlineMinutes('90')
      setScheduleFormManagerAlertMinutes('5')
      setScheduleFormNotes('')
      setScheduleFormGuideVideoUrl('')
      setScheduleFormStatus('draft')

      await loadTournamentData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create Tournament schedule slot')
    } finally {
      setCreatingSchedule(false)
    }
  }

  const selectedGame = selectedGameId ? gameMap.get(selectedGameId) : null
  const selectedMode = selectedModeId ? modeMap.get(selectedModeId) : null

  return (
    <div className="domain-view-container tournament-domain-theme">
      {/* Header */}
      <div className="view-header tournament-header">
        <div className="tournament-title-area">
          <div className="domain-badge tournament-badge">
            <Trophy size={14} /> TOURNAMENT DOMAIN
          </div>
          <h2>Tournament Championship Management</h2>
          <p>
            Multi-player, leaderboard, and bracket tournaments. Strict separation: Game &rarr; Tournament Modes (Config & Prize Pool) &rarr; Tournament Schedules (Timing).
          </p>
        </div>

        <div className="header-actions">
          <button
            id="refresh-tournaments-btn"
            className="secondary small-btn"
            onClick={loadTournamentData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button
            id="create-tournament-mode-btn"
            className="primary small-btn tournament-primary-btn"
            onClick={() => {
              if (selectedGameId) setModeFormGameId(selectedGameId)
              setShowCreateModeModal(true)
            }}
          >
            <Plus size={14} /> New Tournament Mode
          </button>
          <button
            id="create-tournament-schedule-btn"
            className="primary small-btn tournament-primary-btn"
            onClick={() => {
              if (selectedModeId) setScheduleFormModeId(selectedModeId)
              else if (filteredModes.length > 0) setScheduleFormModeId(filteredModes[0].id)
              setShowCreateScheduleModal(true)
            }}
          >
            <Calendar size={14} /> Schedule Tournament Slot
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

      {/* Breadcrumb Hierarchy Bar */}
      <div className="drilldown-nav-bar tournament-drilldown-bar">
        <div className="drilldown-path">
          <button
            className={`drilldown-step ${!selectedGameId ? 'active' : ''}`}
            onClick={() => {
              setSelectedGameId('')
              setSelectedModeId('')
            }}
          >
            <Gamepad2 size={13} /> All Games ({games.length})
          </button>

          {selectedGame && (
            <>
              <ChevronRight size={14} className="drilldown-sep" />
              <button
                className={`drilldown-step ${selectedGameId && !selectedModeId ? 'active' : ''}`}
                onClick={() => setSelectedModeId('')}
              >
                <Gamepad2 size={13} /> {selectedGame.name}
              </button>
            </>
          )}

          {selectedMode && (
            <>
              <ChevronRight size={14} className="drilldown-sep" />
              <div className="drilldown-step active">
                <Layers size={13} /> {selectedMode.name}
              </div>
            </>
          )}
        </div>

        {(selectedGameId || selectedModeId) && (
          <button
            className="clear-filter-btn"
            onClick={() => {
              setSelectedGameId('')
              setSelectedModeId('')
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: TOURNAMENT MODES (Config Only)                */}
      {/* ======================================================== */}
      <div className="domain-section">
        <div className="section-divider">
          <div className="section-title-wrap">
            <h3 className="section-heading">
              <Trophy size={16} color="#f59e0b" /> Tournament Competition Modes ({filteredModes.length})
            </h3>
            <span className="muted-count">
              {selectedGame ? `Configured for ${selectedGame.name}` : 'All games'} &bull; Multi-slot definitions with scoring metrics & prize pool
            </span>
          </div>

          <div className="filters-row">
            <select
              id="tournament-game-filter"
              value={selectedGameId}
              onChange={(e) => {
                setSelectedGameId(e.target.value)
                setSelectedModeId('')
              }}
              className="filter-select"
            >
              <option value="">Filter by Game (All Games)</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && modes.length === 0 ? (
          <div className="loading-card">
            <RefreshCw size={24} className="spinning" color="#f59e0b" />
            <p>Loading Tournament modes...</p>
          </div>
        ) : filteredModes.length === 0 ? (
          <div className="state-card tournament-state-card">
            <div className="state-icon tournament-icon-bg">
              <Trophy size={32} color="#f59e0b" />
            </div>
            <h3>No Tournament Modes Found</h3>
            <p className="state-desc">
              {selectedGame
                ? `No tournament modes configured for "${selectedGame.name}". Create a multi-tier tournament mode with scoring metrics.`
                : 'No tournament modes registered in the system. Click below to create your first Tournament mode.'}
            </p>
            <button
              className="primary small-btn tournament-primary-btn"
              onClick={() => {
                if (selectedGameId) setModeFormGameId(selectedGameId)
                setShowCreateModeModal(true)
              }}
            >
              <Plus size={14} /> Create Tournament Mode
            </button>
          </div>
        ) : (
          <div className="domain-cards-grid">
            {filteredModes.map((m) => {
              const parentGame = gameMap.get(m.gameId)
              const modeSchedules = schedules.filter((s) => s.modeId === m.id)
              const isSelected = selectedModeId === m.id
              const totalPrize = (m.prizes || []).reduce((sum, p) => sum + (p.amount || 0), 0)

              return (
                <article
                  key={m.id}
                  className={`mode-config-card tournament-mode-card ${isSelected ? 'selected-card' : ''}`}
                >
                  <div className="mode-card-header">
                    <div className="mode-badge-wrap">
                      <span className="mode-type-pill type-tournament">TOURNAMENT</span>
                      <span className={`status-pill ${m.isActive !== false ? 'published' : 'closed'}`}>
                        {m.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <button
                      className="icon-btn edit-mode-btn"
                      onClick={() => openEditMode(m)}
                      title="Edit Mode Configuration"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>

                  <div className="mode-title-row">
                    {m.logoUrl ? (
                      <img
                        src={m.logoUrl}
                        alt={m.name}
                        className="mode-logo-thumb"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="mode-logo-placeholder tournament-logo-placeholder">
                        <Trophy size={16} />
                      </div>
                    )}
                    <div>
                      <h4 className="mode-name">{m.name}</h4>
                      <span className="mode-game-tag">
                        Game: <strong>{parentGame?.name || m.gameId.slice(0, 8)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Scoring Metric Tag */}
                  {m.tournamentMetric && (
                    <div className="tournament-metric-chip">
                      <Target size={12} />
                      <span>Metric: <strong>{m.tournamentMetric}</strong></span>
                    </div>
                  )}

                  {/* Mode Configuration Specs */}
                  <div className="mode-specs-grid">
                    <div className="spec-cell">
                      <span className="spec-lbl">Entry Fee</span>
                      <strong className="spec-val highlight-gold">{m.entryFee} Coins</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Max Players</span>
                      <strong className="spec-val">{m.maxParticipants}</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Team Size</span>
                      <strong className="spec-val">{m.teamSize || 1}</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Prize Pool</span>
                      <strong className="spec-val highlight-green">{totalPrize} Coins</strong>
                    </div>
                  </div>

                  {/* Prize Ladder */}
                  <div className="mode-prizes-preview">
                    <span className="prizes-lbl">Tournament Prize Chart:</span>
                    <div className="prizes-tags-wrap">
                      {(m.prizes || []).map((p, idx) => (
                        <span key={idx} className="prize-chip tournament-prize-chip">
                          Rank #{p.position}: {p.amount} Coins
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mode-card-actions">
                    <button
                      className={`secondary small-btn ${isSelected ? 'active-filter-btn' : ''}`}
                      onClick={() => setSelectedModeId(isSelected ? '' : m.id)}
                    >
                      <Calendar size={12} /> {modeSchedules.length} Slot{modeSchedules.length === 1 ? '' : 's'}
                    </button>
                    <button
                      className="primary small-btn tournament-primary-btn"
                      onClick={() => {
                        setScheduleFormModeId(m.id)
                        setShowCreateScheduleModal(true)
                      }}
                    >
                      <Plus size={12} /> Schedule Slot
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: TOURNAMENT SCHEDULES (Timing Only)            */}
      {/* ======================================================== */}
      <div className="domain-section">
        <div className="section-divider">
          <div className="section-title-wrap">
            <h3 className="section-heading">
              <Calendar size={16} color="#f59e0b" /> Tournament Timing Schedules ({filteredSchedules.length})
            </h3>
            <span className="muted-count">
              Operational tournament instances with entry deadline & match duration
            </span>
          </div>

          <div className="filters-row">
            <select
              id="tournament-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>

            <button
              id="add-tournament-slot-btn"
              className="primary small-btn tournament-primary-btn"
              onClick={() => {
                if (selectedModeId) setScheduleFormModeId(selectedModeId)
                else if (filteredModes.length > 0) setScheduleFormModeId(filteredModes[0].id)
                setShowCreateScheduleModal(true)
              }}
            >
              <Plus size={14} /> Add Timing Slot
            </button>
          </div>
        </div>

        {/* Selected Mode Context Banner */}
        {selectedMode && (
          <div className="context-focus-banner tournament-focus-banner">
            <div className="context-focus-info">
              <span className="focus-label">Filtered by Mode:</span>
              <strong>{selectedMode.name}</strong>
              <span className="context-dot">&bull;</span>
              <span>Game: <strong>{gameMap.get(selectedMode.gameId)?.name || 'Game'}</strong></span>
              <span className="context-dot">&bull;</span>
              <span>Fee: <strong>{selectedMode.entryFee} Coins</strong></span>
              <span className="context-dot">&bull;</span>
              <span>Slots: <strong>{selectedMode.maxParticipants}</strong></span>
              {selectedMode.tournamentMetric && (
                <>
                  <span className="context-dot">&bull;</span>
                  <span>Metric: <strong>{selectedMode.tournamentMetric}</strong></span>
                </>
              )}
            </div>
            <button
              className="secondary small-btn"
              onClick={() => setSelectedModeId('')}
            >
              Show All Tournament Schedules
            </button>
          </div>
        )}

        {filteredSchedules.length === 0 ? (
          <div className="state-card tournament-state-card">
            <div className="state-icon tournament-icon-bg">
              <Calendar size={32} color="#f59e0b" />
            </div>
            <h3>No Tournament Schedules Found</h3>
            <p className="state-desc">
              No timing slots exist for the current filter. Create an operational schedule slot to launch a tournament instance.
            </p>
            <button
              className="primary small-btn tournament-primary-btn"
              onClick={() => {
                if (selectedModeId) setScheduleFormModeId(selectedModeId)
                else if (filteredModes.length > 0) setScheduleFormModeId(filteredModes[0].id)
                setShowCreateScheduleModal(true)
              }}
            >
              <Plus size={14} /> Schedule Tournament Slot
            </button>
          </div>
        ) : (
          <div className="domain-cards-grid">
            {filteredSchedules.map((item) => {
              const parentMode = modeMap.get(item.modeId)
              const parentGame = parentMode ? gameMap.get(parentMode.gameId) : undefined

              return (
                <article key={item.id} className="schedule-card tournament-schedule-card">
                  <div className="schedule-card-header">
                    <div className="schedule-badge-wrap">
                      <span className="mode-type-pill type-tournament">TOURNAMENT</span>
                      <span className={`status-pill ${item.status || 'draft'}`}>
                        {(item.status || 'draft').toUpperCase()}
                      </span>
                    </div>
                    <span className="schedule-id-chip">ID: {item.id.slice(0, 8)}</span>
                  </div>

                  <div className="schedule-mode-context">
                    <h4>{parentMode?.name || 'Mode ' + item.modeId.slice(0, 8)}</h4>
                    <span className="sched-game-name">
                      {parentGame?.name || 'Game'} &bull; Fee: {parentMode?.entryFee ?? '-'} Coins
                    </span>
                  </div>

                  {/* Timing Specific Fields (Strict Tournament timing) */}
                  <div className="schedule-timing-box">
                    {item.entryClosesAt && (
                      <div className="detail-line">
                        <Clock size={13} color="#f59e0b" />
                        <span>
                          <strong>Entry Closes:</strong> {new Date(item.entryClosesAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {item.durationMinutes && (
                      <div className="detail-line">
                        <Clock size={13} color="#3b82f6" />
                        <span>
                          <strong>Duration:</strong> {item.durationMinutes} minutes
                        </span>
                      </div>
                    )}

                    <div className="detail-line-muted">
                      <span>Result Deadline: {item.resultDeadlineMinutes || 90}m &bull; Manager Alert: {item.managerAlertAfterMinutes || 5}m</span>
                    </div>
                  </div>

                  {/* Metadata & Notes */}
                  {item.notes && (
                    <p className="schedule-notes-text">
                      <strong>Notes:</strong> {item.notes}
                    </p>
                  )}

                  {item.guideVideoUrl && (
                    <a
                      href={item.guideVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="guide-video-link"
                    >
                      <ExternalLink size={12} /> Tournament Guide Video
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE TOURNAMENT MODE (Config Fields Only)       */}
      {/* ======================================================== */}
      {showCreateModeModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Trophy size={20} color="#f59e0b" />
                <h3>Create Tournament Competition Mode</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateModeModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMode} className="modal-form">
              <p className="form-info-text">
                Defines the competition rules, scoring metric, and prize pool for tournament leagues. Stored permanently on <code>POST /api/admin/competition/modes</code>.
              </p>

              <label>
                Target Game *
                <select
                  required
                  value={modeFormGameId}
                  onChange={(e) => setModeFormGameId(e.target.value)}
                >
                  <option value="">Select Game Catalog Item...</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tournament Mode Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Master Championship, Weekly Cup, Squad Elimination"
                  value={modeFormName}
                  onChange={(e) => setModeFormName(e.target.value)}
                  maxLength={128}
                />
              </label>

              <div className="form-row-2">
                <label>
                  Entry Fee (Coins) *
                  <input
                    type="number"
                    required
                    min={1}
                    value={modeFormEntryFee}
                    onChange={(e) => setModeFormEntryFee(e.target.value)}
                  />
                </label>

                <label>
                  Max Participants *
                  <input
                    type="number"
                    required
                    min={1}
                    value={modeFormMaxParticipants}
                    onChange={(e) => setModeFormMaxParticipants(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row-2">
                <label>
                  Team Size
                  <input
                    type="number"
                    min={1}
                    value={modeFormTeamSize}
                    onChange={(e) => setModeFormTeamSize(e.target.value)}
                  />
                </label>

                <label>
                  Tournament Scoring Metric *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Total Kills + Rank, Score, Survival"
                    value={modeFormTournamentMetric}
                    onChange={(e) => setModeFormTournamentMetric(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Mode Logo URL (Optional)
                <input
                  type="url"
                  placeholder="https://example.com/mode-icon.png"
                  value={modeFormLogoUrl}
                  onChange={(e) => setModeFormLogoUrl(e.target.value)}
                />
              </label>

              {/* Prize Ladder Builder */}
              <div className="prize-ladder-section">
                <div className="prize-ladder-header">
                  <label className="prize-ladder-title">Tournament Prize Pool Chart (Coins) *</label>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={addPrizeTier}
                  >
                    <Plus size={12} /> Add Position
                  </button>
                </div>

                <div className="prize-tiers-list">
                  {modeFormPrizes.map((p, idx) => (
                    <div key={idx} className="prize-tier-row">
                      <span className="position-chip tournament-pos-chip">Rank #{p.position}</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Prize Coins"
                        value={p.amount}
                        onChange={(e) => updatePrizeAmount(idx, Number(e.target.value))}
                      />
                      <span className="unit-label">Coins</span>
                      {modeFormPrizes.length > 1 && (
                        <button
                          type="button"
                          className="remove-tier-btn"
                          onClick={() => removePrizeTier(idx)}
                          title="Remove position"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => setShowCreateModeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small-btn tournament-primary-btn"
                  disabled={creatingMode}
                >
                  {creatingMode ? 'Creating Mode...' : 'Save Tournament Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT TOURNAMENT MODE                              */}
      {/* ======================================================== */}
      {showEditModeModal && editingMode && (
        <div className="modal-overlay" onClick={() => setShowEditModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Edit2 size={18} color="#f59e0b" />
                <h3>Edit Tournament Mode: {editingMode.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowEditModeModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMode} className="modal-form">
              <label>
                Tournament Mode Name *
                <input
                  type="text"
                  required
                  value={editModeName}
                  onChange={(e) => setEditModeName(e.target.value)}
                  maxLength={128}
                />
              </label>

              <div className="form-row-2">
                <label>
                  Entry Fee (Coins) *
                  <input
                    type="number"
                    required
                    min={1}
                    value={editModeEntryFee}
                    onChange={(e) => setEditModeEntryFee(e.target.value)}
                  />
                </label>

                <label>
                  Max Participants *
                  <input
                    type="number"
                    required
                    min={1}
                    value={editModeMaxParticipants}
                    onChange={(e) => setEditModeMaxParticipants(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row-2">
                <label>
                  Team Size
                  <input
                    type="number"
                    min={1}
                    value={editModeTeamSize}
                    onChange={(e) => setEditModeTeamSize(e.target.value)}
                  />
                </label>

                <label>
                  Tournament Scoring Metric *
                  <input
                    type="text"
                    required
                    value={editModeTournamentMetric}
                    onChange={(e) => setEditModeTournamentMetric(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Logo URL
                <input
                  type="url"
                  value={editModeLogoUrl}
                  onChange={(e) => setEditModeLogoUrl(e.target.value)}
                />
              </label>

              {/* Status toggle */}
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editModeIsActive}
                  onChange={(e) => setEditModeIsActive(e.target.checked)}
                />
                <span>Active (Mode visible to players)</span>
              </label>

              {/* Prize Ladder */}
              <div className="prize-ladder-section">
                <div className="prize-ladder-header">
                  <label className="prize-ladder-title">Tournament Prize Pool Chart (Coins)</label>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={addEditPrizeTier}
                  >
                    <Plus size={12} /> Add Position
                  </button>
                </div>

                <div className="prize-tiers-list">
                  {editModePrizes.map((p, idx) => (
                    <div key={idx} className="prize-tier-row">
                      <span className="position-chip tournament-pos-chip">Rank #{p.position}</span>
                      <input
                        type="number"
                        min={0}
                        value={p.amount}
                        onChange={(e) => updateEditPrizeAmount(idx, Number(e.target.value))}
                      />
                      <span className="unit-label">Coins</span>
                      {editModePrizes.length > 1 && (
                        <button
                          type="button"
                          className="remove-tier-btn"
                          onClick={() => removeEditPrizeTier(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => setShowEditModeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small-btn tournament-primary-btn"
                  disabled={updatingMode}
                >
                  {updatingMode ? 'Saving...' : 'Update Tournament Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE TOURNAMENT SCHEDULE (Timing Only)          */}
      {/* ======================================================== */}
      {showCreateScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowCreateScheduleModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Calendar size={20} color="#f59e0b" />
                <h3>Create Tournament Schedule Slot</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateScheduleModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="modal-form">
              <p className="form-info-text">
                Creates an operational tournament launch timing instance on <code>POST /api/admin/competition/schedules</code>. Configuration (fee, slots, metric, prize ladder) is inherited directly from the Tournament Mode.
              </p>

              <label>
                Target Tournament Mode *
                <select
                  required
                  value={scheduleFormModeId}
                  onChange={(e) => setScheduleFormModeId(e.target.value)}
                >
                  <option value="">Select Tournament Mode...</option>
                  {modes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({gameMap.get(m.gameId)?.name || 'Game'} &bull; {m.entryFee} Coins &bull; {m.tournamentMetric || 'Score'})
                    </option>
                  ))}
                </select>
              </label>

              {/* Display mode specs preview */}
              {scheduleFormModeId && modeMap.get(scheduleFormModeId) && (
                <div className="mode-spec-preview-banner tournament-spec-preview">
                  <span>Fee: <strong>{modeMap.get(scheduleFormModeId)?.entryFee} Coins</strong></span>
                  <span>&bull; Max Slots: <strong>{modeMap.get(scheduleFormModeId)?.maxParticipants}</strong></span>
                  <span>&bull; Metric: <strong>{modeMap.get(scheduleFormModeId)?.tournamentMetric || 'Score'}</strong></span>
                </div>
              )}

              <div className="form-row-2">
                <label>
                  Entry Closes At (entryClosesAt) *
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormEntryClosesAt}
                    onChange={(e) => setScheduleFormEntryClosesAt(e.target.value)}
                  />
                </label>

                <label>
                  Tournament Duration (Minutes) *
                  <input
                    type="number"
                    required
                    min={1}
                    value={scheduleFormDurationMinutes}
                    onChange={(e) => setScheduleFormDurationMinutes(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row-2">
                <label>
                  Result Deadline (Minutes)
                  <input
                    type="number"
                    min={1}
                    value={scheduleFormResultDeadlineMinutes}
                    onChange={(e) => setScheduleFormResultDeadlineMinutes(e.target.value)}
                  />
                </label>

                <label>
                  Manager Alert Delay (Minutes)
                  <input
                    type="number"
                    min={0}
                    value={scheduleFormManagerAlertMinutes}
                    onChange={(e) => setScheduleFormManagerAlertMinutes(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-row-2">
                <label>
                  Publication Status *
                  <select
                    value={scheduleFormStatus}
                    onChange={(e) => setScheduleFormStatus(e.target.value as 'published' | 'draft' | 'closed')}
                  >
                    <option value="published">Published (Visible & Joinable)</option>
                    <option value="draft">Draft (Admin Only)</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>

                <label>
                  Guide Video URL (Optional)
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={scheduleFormGuideVideoUrl}
                    onChange={(e) => setScheduleFormGuideVideoUrl(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Operational Notes (Optional)
                <textarea
                  rows={2}
                  placeholder="Leaderboard rules, scoring cutoff time, bracket details..."
                  value={scheduleFormNotes}
                  onChange={(e) => setScheduleFormNotes(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => setShowCreateScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small-btn tournament-primary-btn"
                  disabled={creatingSchedule}
                >
                  {creatingSchedule ? 'Creating...' : 'Create Tournament Schedule Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
