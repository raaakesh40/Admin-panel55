import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Game, GameMode, CompetitionSchedule, PrizeTier } from '../types'
import { api } from '../services/api'
import {
  Swords,
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
  Gamepad2,
} from 'lucide-react'

interface OmbViewProps {
  initialGameId?: string
}

export function OmbView({ initialGameId }: OmbViewProps) {
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

  // OMB Mode Form State (Config Only - NEVER timing!)
  const [modeFormGameId, setModeFormGameId] = useState('')
  const [modeFormName, setModeFormName] = useState('')
  const [modeFormEntryFee, setModeFormEntryFee] = useState('50')
  const [modeFormMaxParticipants, setModeFormMaxParticipants] = useState('2')
  const [modeFormTeamSize, setModeFormTeamSize] = useState('1')
  const [modeFormPrizes, setModeFormPrizes] = useState<PrizeTier[]>([
    { position: 1, amount: 90 },
  ])
  const [modeFormLogoUrl, setModeFormLogoUrl] = useState('')
  const [creatingMode, setCreatingMode] = useState(false)

  // Edit Mode Form State
  const [editModeName, setEditModeName] = useState('')
  const [editModeEntryFee, setEditModeEntryFee] = useState('50')
  const [editModeMaxParticipants, setEditModeMaxParticipants] = useState('2')
  const [editModeTeamSize, setEditModeTeamSize] = useState('1')
  const [editModePrizes, setEditModePrizes] = useState<PrizeTier[]>([])
  const [editModeLogoUrl, setEditModeLogoUrl] = useState('')
  const [editModeIsActive, setEditModeIsActive] = useState(true)
  const [updatingMode, setUpdatingMode] = useState(false)

  // OMB Schedule Form State (Timing Only - NEVER config!)
  const [scheduleFormModeId, setScheduleFormModeId] = useState('')
  const [scheduleFormStatus, setScheduleFormStatus] = useState<'published' | 'draft' | 'closed'>('published')
  const [scheduleFormStartsAt, setScheduleFormStartsAt] = useState('')
  const [scheduleFormRoomRevealMinutes, setScheduleFormRoomRevealMinutes] = useState('15')
  const [scheduleFormResultDeadlineMinutes, setScheduleFormResultDeadlineMinutes] = useState('90')
  const [scheduleFormManagerAlertMinutes, setScheduleFormManagerAlertMinutes] = useState('5')
  const [scheduleFormGuideVideoUrl, setScheduleFormGuideVideoUrl] = useState('')
  const [scheduleFormNotes, setScheduleFormNotes] = useState('')
  const [creatingSchedule, setCreatingSchedule] = useState(false)

  // Fetch all domain data strictly for OMB
  async function loadOmbData() {
    setLoading(true)
    setErrorMessage('')
    try {
      const [gamesRes, modesRes, schedulesRes] = await Promise.all([
        api<{ games?: Game[] }>('/competitions/games').catch(() => ({ games: [] })),
        api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => ({ modes: [] })),
        api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules?type=omb').catch(() => ({ schedules: [] })),
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
      const ombModes = allModes.filter((m) => m.type === 'omb')

      const schedulesList = Array.isArray(schedulesRes?.schedules)
        ? schedulesRes.schedules
        : Array.isArray(schedulesRes)
        ? (schedulesRes as CompetitionSchedule[])
        : []

      setGames(gamesList)
      setModes(ombModes)
      setSchedules(schedulesList)

      if (gamesList.length > 0 && !modeFormGameId) {
        setModeFormGameId(gamesList[0].id)
      }
      if (ombModes.length > 0 && !scheduleFormModeId) {
        setScheduleFormModeId(ombModes[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load OMB domain data')
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
          api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules?type=omb').catch(() => ({ schedules: [] })),
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
        const ombModes = allModes.filter((m) => m.type === 'omb')

        const schedulesList = Array.isArray(schedulesRes?.schedules)
          ? schedulesRes.schedules
          : Array.isArray(schedulesRes)
          ? (schedulesRes as CompetitionSchedule[])
          : []

        setGames(gamesList)
        setModes(ombModes)
        setSchedules(schedulesList)

        if (gamesList.length > 0) {
          setModeFormGameId(gamesList[0].id)
        }
        if (ombModes.length > 0) {
          setScheduleFormModeId(ombModes[0].id)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load OMB domain data')
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
  // Games that have at least one OMB mode or are in the catalog
  const filteredModes = modes.filter((m) => !selectedGameId || m.gameId === selectedGameId)

  const filteredSchedules = schedules.filter((s) => {
    const parentMode = modeMap.get(s.modeId)
    if (!parentMode) {
      // If mode not loaded in OMB modes, check if matches filter
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
    setEditModeEntryFee(String(m.entryFee || 50))
    setEditModeMaxParticipants(String(m.maxParticipants || 2))
    setEditModeTeamSize(String(m.teamSize || 1))
    setEditModePrizes(
      Array.isArray(m.prizes) && m.prizes.length > 0 ? m.prizes : [{ position: 1, amount: 90 }]
    )
    setEditModeLogoUrl(m.logoUrl || '')
    setEditModeIsActive(m.isActive !== false)
    setShowEditModeModal(true)
  }

  // ====================================================
  // CREATE OMB MODE: POST /api/admin/competition/modes
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
      setErrorMessage('Mode name is required (1 to 128 characters).')
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

    for (const p of modeFormPrizes) {
      if (typeof p.position !== 'number' || isNaN(p.position) || p.position <= 0) {
        setErrorMessage('Prize position must be an integer greater than 0.')
        setCreatingMode(false)
        return
      }
      if (typeof p.amount !== 'number' || isNaN(p.amount) || p.amount < 0) {
        setErrorMessage('Prize amount must be an integer greater than or equal to 0.')
        setCreatingMode(false)
        return
      }
    }

    const trimmedLogo = modeFormLogoUrl.trim()
    if (trimmedLogo && !trimmedLogo.startsWith('http://') && !trimmedLogo.startsWith('https://')) {
      setErrorMessage('Logo URL must be a valid URL starting with http:// or https://')
      setCreatingMode(false)
      return
    }

    const payload = {
      gameId,
      name,
      type: 'omb' as const,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: modeFormPrizes.map((p) => ({ position: Math.round(p.position), amount: Math.round(p.amount) })),
      tournamentMetric: null,
      logoUrl: trimmedLogo || null,
    }

    try {
      const res = await api<{ mode?: GameMode }>('/admin/competition/modes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.mode?.id || (res as Record<string, unknown>)?.id || 'OK'
      setSuccessMessage(`OMB Mode "${name}" created successfully (ID: ${createdId}).`)
      
      // Reset form fields
      setModeFormName('')
      setModeFormEntryFee('50')
      setModeFormMaxParticipants('2')
      setModeFormTeamSize('1')
      setModeFormPrizes([{ position: 1, amount: 90 }])
      setModeFormLogoUrl('')
      setShowCreateModeModal(false)

      await loadOmbData()
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
  // UPDATE OMB MODE: PATCH /api/admin/competition/modes/:id
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
      setErrorMessage('Mode name is required (1 to 128 characters).')
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

    if (!Array.isArray(editModePrizes) || editModePrizes.length === 0) {
      setErrorMessage('At least one prize tier is required.')
      setUpdatingMode(false)
      return
    }

    for (const p of editModePrizes) {
      if (typeof p.position !== 'number' || isNaN(p.position) || p.position <= 0) {
        setErrorMessage('Prize position must be an integer greater than 0.')
        setUpdatingMode(false)
        return
      }
      if (typeof p.amount !== 'number' || isNaN(p.amount) || p.amount < 0) {
        setErrorMessage('Prize amount must be an integer greater than or equal to 0.')
        setUpdatingMode(false)
        return
      }
    }

    const trimmedLogo = editModeLogoUrl.trim()
    if (trimmedLogo && !trimmedLogo.startsWith('http://') && !trimmedLogo.startsWith('https://')) {
      setErrorMessage('Logo URL must be a valid URL starting with http:// or https://')
      setUpdatingMode(false)
      return
    }

    const payload = {
      name,
      type: 'omb' as const,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: editModePrizes.map((p) => ({ position: Math.round(p.position), amount: Math.round(p.amount) })),
      tournamentMetric: null,
      logoUrl: trimmedLogo || null,
      isActive: editModeIsActive,
    }

    try {
      await api(`/admin/competition/modes/${editingMode.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setSuccessMessage(`OMB Mode "${name}" updated successfully.`)
      setShowEditModeModal(false)
      setEditingMode(null)
      await loadOmbData()
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
        setErrorMessage(msg || 'Failed to update OMB mode')
      }
    } finally {
      setUpdatingMode(false)
    }
  }

  // ====================================================
  // CREATE OMB SCHEDULE: POST /api/admin/competition/schedules
  // (TIMING ONLY - NO CONFIG FIELDS)
  // ====================================================
  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault()
    setCreatingSchedule(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (!scheduleFormModeId) {
      setErrorMessage('Please select an OMB Mode to schedule.')
      setCreatingSchedule(false)
      return
    }

    const targetMode = modeMap.get(scheduleFormModeId)
    if (!targetMode) {
      setErrorMessage('Selected OMB Mode not found.')
      setCreatingSchedule(false)
      return
    }

    if (!scheduleFormStartsAt) {
      setErrorMessage('For OMB matches, Start Time (startsAt) is required.')
      setCreatingSchedule(false)
      return
    }

    const parsedDate = new Date(scheduleFormStartsAt)
    if (isNaN(parsedDate.getTime())) {
      setErrorMessage('Start Time must be a valid date.')
      setCreatingSchedule(false)
      return
    }

    const roomReveal = Math.round(Number(scheduleFormRoomRevealMinutes))
    if (isNaN(roomReveal) || roomReveal < 0) {
      setErrorMessage('Room Reveal Minutes Before Start must be an integer >= 0.')
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

    const trimmedVideo = scheduleFormGuideVideoUrl.trim()
    if (trimmedVideo && !trimmedVideo.startsWith('http://') && !trimmedVideo.startsWith('https://')) {
      setErrorMessage('Guide Video URL must be a valid URL starting with http:// or https://')
      setCreatingSchedule(false)
      return
    }

    const payload = {
      modeId: scheduleFormModeId,
      status: scheduleFormStatus,
      startsAt: parsedDate.toISOString(),
      entryClosesAt: null,
      durationMinutes: null,
      roomRevealMinutesBeforeStart: roomReveal,
      resultDeadlineMinutes: resultDeadline,
      managerAlertAfterMinutes: managerAlert,
      guideVideoUrl: trimmedVideo || null,
      notes: scheduleFormNotes.trim() || null,
    }

    try {
      const res = await api<{ schedule?: CompetitionSchedule }>('/admin/competition/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.schedule?.id || (res as Record<string, unknown>)?.id || 'OK'
      setSuccessMessage(`OMB Schedule slot created successfully for Mode "${targetMode.name}" (ID: ${createdId}).`)
      
      // Reset form fields
      setShowCreateScheduleModal(false)
      setScheduleFormStartsAt('')
      setScheduleFormRoomRevealMinutes('15')
      setScheduleFormResultDeadlineMinutes('90')
      setScheduleFormManagerAlertMinutes('5')
      setScheduleFormNotes('')
      setScheduleFormGuideVideoUrl('')
      setScheduleFormStatus('draft')
      
      await loadOmbData()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create OMB schedule slot')
    } finally {
      setCreatingSchedule(false)
    }
  }

  const selectedGame = selectedGameId ? gameMap.get(selectedGameId) : null
  const selectedMode = selectedModeId ? modeMap.get(selectedModeId) : null

  return (
    <div className="domain-view-container omb-domain-theme">
      {/* Header */}
      <div className="view-header omb-header">
        <div className="omb-title-area">
          <div className="domain-badge omb-badge">
            <Swords size={14} /> OMB DOMAIN
          </div>
          <h2>One Match Battle (OMB) Management</h2>
          <p>
            1v1 and quick-match competitive lobbies. Strict separation: Game &rarr; OMB Modes (Config) &rarr; OMB Schedules (Timing).
          </p>
        </div>

        <div className="header-actions">
          <button
            id="refresh-omb-btn"
            className="secondary small-btn"
            onClick={loadOmbData}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button
            id="create-omb-mode-btn"
            className="primary small-btn omb-primary-btn"
            onClick={() => {
              if (selectedGameId) setModeFormGameId(selectedGameId)
              setShowCreateModeModal(true)
            }}
          >
            <Plus size={14} /> New OMB Mode
          </button>
          <button
            id="create-omb-schedule-btn"
            className="primary small-btn omb-primary-btn"
            onClick={() => {
              if (selectedModeId) setScheduleFormModeId(selectedModeId)
              else if (filteredModes.length > 0) setScheduleFormModeId(filteredModes[0].id)
              setShowCreateScheduleModal(true)
            }}
          >
            <Calendar size={14} /> Schedule OMB Slot
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
      <div className="drilldown-nav-bar omb-drilldown-bar">
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
      {/* SECTION 1: OMB MODES (Config Only)                       */}
      {/* ======================================================== */}
      <div className="domain-section">
        <div className="section-divider">
          <div className="section-title-wrap">
            <h3 className="section-heading">
              <Layers size={16} color="#8b5cf6" /> OMB Competition Modes ({filteredModes.length})
            </h3>
            <span className="muted-count">
              {selectedGame ? `Configured for ${selectedGame.name}` : 'All games'} &bull; Permanent configuration with fee, slots & prize ladder
            </span>
          </div>

          <div className="filters-row">
            <select
              id="omb-game-filter"
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
            <RefreshCw size={24} className="spinning" color="#8b5cf6" />
            <p>Loading OMB modes...</p>
          </div>
        ) : filteredModes.length === 0 ? (
          <div className="state-card omb-state-card">
            <div className="state-icon omb-icon-bg">
              <Layers size={32} color="#8b5cf6" />
            </div>
            <h3>No OMB Modes Found</h3>
            <p className="state-desc">
              {selectedGame
                ? `No OMB modes configured for "${selectedGame.name}". Create a 1v1 mode with entry fee and prize rules.`
                : 'No OMB modes registered in the system. Click below to create your first OMB mode.'}
            </p>
            <button
              className="primary small-btn omb-primary-btn"
              onClick={() => {
                if (selectedGameId) setModeFormGameId(selectedGameId)
                setShowCreateModeModal(true)
              }}
            >
              <Plus size={14} /> Create OMB Mode
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
                  className={`mode-config-card omb-mode-card ${isSelected ? 'selected-card' : ''}`}
                >
                  <div className="mode-card-header">
                    <div className="mode-badge-wrap">
                      <span className="mode-type-pill type-omb">OMB 1v1</span>
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
                      <div className="mode-logo-placeholder omb-logo-placeholder">
                        <Swords size={16} />
                      </div>
                    )}
                    <div>
                      <h4 className="mode-name">{m.name}</h4>
                      <span className="mode-game-tag">
                        Game: <strong>{parentGame?.name || m.gameId.slice(0, 8)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Mode Configuration Specs */}
                  <div className="mode-specs-grid">
                    <div className="spec-cell">
                      <span className="spec-lbl">Entry Fee</span>
                      <strong className="spec-val highlight-gold">{m.entryFee} Coins</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Max Slots</span>
                      <strong className="spec-val">{m.maxParticipants}</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Team Size</span>
                      <strong className="spec-val">{m.teamSize || 1}</strong>
                    </div>
                    <div className="spec-cell">
                      <span className="spec-lbl">Total Prize</span>
                      <strong className="spec-val highlight-green">{totalPrize} Coins</strong>
                    </div>
                  </div>

                  {/* Prize Ladder */}
                  <div className="mode-prizes-preview">
                    <span className="prizes-lbl">Prize Breakdown:</span>
                    <div className="prizes-tags-wrap">
                      {(m.prizes || []).map((p, idx) => (
                        <span key={idx} className="prize-chip omb-prize-chip">
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
                      className="primary small-btn omb-primary-btn"
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
      {/* SECTION 2: OMB SCHEDULES (Timing Only)                   */}
      {/* ======================================================== */}
      <div className="domain-section">
        <div className="section-divider">
          <div className="section-title-wrap">
            <h3 className="section-heading">
              <Calendar size={16} color="#8b5cf6" /> OMB Timing Schedules ({filteredSchedules.length})
            </h3>
            <span className="muted-count">
              Operational match instances with start time & room reveal offsets
            </span>
          </div>

          <div className="filters-row">
            <select
              id="omb-status-filter"
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
              id="add-slot-btn"
              className="primary small-btn omb-primary-btn"
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
          <div className="context-focus-banner omb-focus-banner">
            <div className="context-focus-info">
              <span className="focus-label">Filtered by Mode:</span>
              <strong>{selectedMode.name}</strong>
              <span className="context-dot">&bull;</span>
              <span>Game: <strong>{gameMap.get(selectedMode.gameId)?.name || 'Game'}</strong></span>
              <span className="context-dot">&bull;</span>
              <span>Fee: <strong>{selectedMode.entryFee} Coins</strong></span>
              <span className="context-dot">&bull;</span>
              <span>Slots: <strong>{selectedMode.maxParticipants}</strong></span>
            </div>
            <button
              className="secondary small-btn"
              onClick={() => setSelectedModeId('')}
            >
              Show All OMB Schedules
            </button>
          </div>
        )}

        {filteredSchedules.length === 0 ? (
          <div className="state-card omb-state-card">
            <div className="state-icon omb-icon-bg">
              <Calendar size={32} color="#8b5cf6" />
            </div>
            <h3>No OMB Schedules Found</h3>
            <p className="state-desc">
              No timing slots exist for the current filter. Create an operational schedule slot to launch an OMB match.
            </p>
            <button
              className="primary small-btn omb-primary-btn"
              onClick={() => {
                if (selectedModeId) setScheduleFormModeId(selectedModeId)
                else if (filteredModes.length > 0) setScheduleFormModeId(filteredModes[0].id)
                setShowCreateScheduleModal(true)
              }}
            >
              <Plus size={14} /> Schedule OMB Slot
            </button>
          </div>
        ) : (
          <div className="domain-cards-grid">
            {filteredSchedules.map((item) => {
              const parentMode = modeMap.get(item.modeId)
              const parentGame = parentMode ? gameMap.get(parentMode.gameId) : undefined

              return (
                <article key={item.id} className="schedule-card omb-schedule-card">
                  <div className="schedule-card-header">
                    <div className="schedule-badge-wrap">
                      <span className="mode-type-pill type-omb">OMB MATCH</span>
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

                  {/* Timing Specific Fields (Strict OMB timing) */}
                  <div className="schedule-timing-box">
                    {item.startsAt && (
                      <div className="detail-line">
                        <Clock size={13} color="#10b981" />
                        <span>
                          <strong>Starts At:</strong> {new Date(item.startsAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="detail-line">
                      <Clock size={13} color="#8b5cf6" />
                      <span>
                        <strong>Room Reveal:</strong> {item.roomRevealMinutesBeforeStart ?? 15} mins before match start
                      </span>
                    </div>

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
                      <ExternalLink size={12} /> Match Guide Video
                    </a>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: CREATE OMB MODE (Config Fields Only)              */}
      {/* ======================================================== */}
      {showCreateModeModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Swords size={20} color="#8b5cf6" />
                <h3>Create OMB Competition Mode</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateModeModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMode} className="modal-form">
              <p className="form-info-text">
                Defines the competition rules and prize ladder for OMB matches (1v1 / quick matches). Stored permanently on <code>POST /api/admin/competition/modes</code>.
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
                OMB Mode Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. 1v1 Classic Solo, Quick Clash, Pro Duel"
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
                  Mode Logo URL (Optional)
                  <input
                    type="url"
                    placeholder="https://example.com/mode-icon.png"
                    value={modeFormLogoUrl}
                    onChange={(e) => setModeFormLogoUrl(e.target.value)}
                  />
                </label>
              </div>

              {/* Prize Ladder Builder */}
              <div className="prize-ladder-section">
                <div className="prize-ladder-header">
                  <label className="prize-ladder-title">Prize Ladder (Coins) *</label>
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
                      <span className="position-chip">Rank #{p.position}</span>
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
                  className="primary small-btn omb-primary-btn"
                  disabled={creatingMode}
                >
                  {creatingMode ? 'Creating Mode...' : 'Save OMB Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT OMB MODE                                     */}
      {/* ======================================================== */}
      {showEditModeModal && editingMode && (
        <div className="modal-overlay" onClick={() => setShowEditModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Edit2 size={18} color="#8b5cf6" />
                <h3>Edit OMB Mode: {editingMode.name}</h3>
              </div>
              <button className="close-btn" onClick={() => setShowEditModeModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMode} className="modal-form">
              <label>
                Mode Name *
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
                  Logo URL
                  <input
                    type="url"
                    value={editModeLogoUrl}
                    onChange={(e) => setEditModeLogoUrl(e.target.value)}
                  />
                </label>
              </div>

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
                  <label className="prize-ladder-title">Prize Ladder (Coins)</label>
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
                      <span className="position-chip">Rank #{p.position}</span>
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
                  className="primary small-btn omb-primary-btn"
                  disabled={updatingMode}
                >
                  {updatingMode ? 'Saving...' : 'Update Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE OMB SCHEDULE (Timing Only)                 */}
      {/* ======================================================== */}
      {showCreateScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowCreateScheduleModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Calendar size={20} color="#8b5cf6" />
                <h3>Create OMB Schedule Slot</h3>
              </div>
              <button className="close-btn" onClick={() => setShowCreateScheduleModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="modal-form">
              <p className="form-info-text">
                Creates an operational launch timing instance on <code>POST /api/admin/competition/schedules</code>. Configuration (fee, slots, prize ladder) is inherited directly from the Mode.
              </p>

              <label>
                Target OMB Mode *
                <select
                  required
                  value={scheduleFormModeId}
                  onChange={(e) => setScheduleFormModeId(e.target.value)}
                >
                  <option value="">Select OMB Mode...</option>
                  {modes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({gameMap.get(m.gameId)?.name || 'Game'} &bull; {m.entryFee} Coins)
                    </option>
                  ))}
                </select>
              </label>

              {/* Display mode specs preview */}
              {scheduleFormModeId && modeMap.get(scheduleFormModeId) && (
                <div className="mode-spec-preview-banner">
                  <span>Fee: <strong>{modeMap.get(scheduleFormModeId)?.entryFee} Coins</strong></span>
                  <span>&bull; Slots: <strong>{modeMap.get(scheduleFormModeId)?.maxParticipants}</strong></span>
                  <span>&bull; Type: <strong>OMB (1v1)</strong></span>
                </div>
              )}

              <div className="form-row-2">
                <label>
                  Match Start Time (startsAt) *
                  <input
                    type="datetime-local"
                    required
                    value={scheduleFormStartsAt}
                    onChange={(e) => setScheduleFormStartsAt(e.target.value)}
                  />
                </label>

                <label>
                  Room Reveal (Mins Before Start) *
                  <input
                    type="number"
                    required
                    min={0}
                    value={scheduleFormRoomRevealMinutes}
                    onChange={(e) => setScheduleFormRoomRevealMinutes(e.target.value)}
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
                  placeholder="Special instructions, lobby region, match rules..."
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
                  className="primary small-btn omb-primary-btn"
                  disabled={creatingSchedule}
                >
                  {creatingSchedule ? 'Creating...' : 'Create OMB Schedule Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
