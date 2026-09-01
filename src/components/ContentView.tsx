import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Game, GameMode, CompetitionSchedule, PrizeTier } from '../types'
import { api } from '../services/api'
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Gamepad2,
  Layers,
  Calendar,
  Play,
  Clock,
  Award,
  Edit2,
  Check,
  X,
  ExternalLink,
  Info,
} from 'lucide-react'

export function ContentView() {
  const [activeTab, setActiveTab] = useState<'games' | 'modes' | 'schedules' | 'testJoin'>('games')

  // Master Data from Backend
  const [games, setGames] = useState<Game[]>([])
  const [modes, setModes] = useState<GameMode[]>([])
  const [schedules, setSchedules] = useState<CompetitionSchedule[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [loadingModes, setLoadingModes] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // ----------------------------------------------------
  // Filters
  // ----------------------------------------------------
  const [modeFilterGameId, setModeFilterGameId] = useState<string>('')
  const [scheduleFilterGameId, setScheduleFilterGameId] = useState<string>('')
  const [scheduleFilterModeId, setScheduleFilterModeId] = useState<string>('')
  const [scheduleFilterType, setScheduleFilterType] = useState<'all' | 'omb' | 'tournament'>('all')

  // ----------------------------------------------------
  // Modals & Sub-forms
  // ----------------------------------------------------
  const [showCreateGameModal, setShowCreateGameModal] = useState(false)
  const [showCreateModeModal, setShowCreateModeModal] = useState(false)
  const [showEditModeModal, setShowEditModeModal] = useState(false)
  const [editingMode, setEditingMode] = useState<GameMode | null>(null)
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false)

  // ----------------------------------------------------
  // Form State 1: Game Creation (POST /api/admin/competition/games)
  // ----------------------------------------------------
  const [newGameName, setNewGameName] = useState('')
  const [newGameLogoUrl, setNewGameLogoUrl] = useState('')
  const [creatingGame, setCreatingGame] = useState(false)

  // ----------------------------------------------------
  // Form State 2: Mode Creation (POST /api/admin/competition/modes)
  // ----------------------------------------------------
  const [modeFormGameId, setModeFormGameId] = useState('')
  const [modeFormName, setModeFormName] = useState('')
  const [modeFormType, setModeFormType] = useState<'omb' | 'tournament'>('omb')
  const [modeFormEntryFee, setModeFormEntryFee] = useState('50')
  const [modeFormMaxParticipants, setModeFormMaxParticipants] = useState('2')
  const [modeFormTeamSize, setModeFormTeamSize] = useState('1')
  const [modeFormPrizes, setModeFormPrizes] = useState<PrizeTier[]>([
    { position: 1, amount: 90 },
  ])
  const [modeFormTournamentMetric, setModeFormTournamentMetric] = useState('score')
  const [modeFormLogoUrl, setModeFormLogoUrl] = useState('')
  const [creatingMode, setCreatingMode] = useState(false)

  // ----------------------------------------------------
  // Form State 2B: Mode Edit (PATCH /api/admin/competition/modes/:id)
  // ----------------------------------------------------
  const [editModeName, setEditModeName] = useState('')
  const [editModeType, setEditModeType] = useState<'omb' | 'tournament'>('omb')
  const [editModeEntryFee, setEditModeEntryFee] = useState('50')
  const [editModeMaxParticipants, setEditModeMaxParticipants] = useState('2')
  const [editModeTeamSize, setEditModeTeamSize] = useState('1')
  const [editModePrizes, setEditModePrizes] = useState<PrizeTier[]>([])
  const [editModeTournamentMetric, setEditModeTournamentMetric] = useState('')
  const [editModeLogoUrl, setEditModeLogoUrl] = useState('')
  const [editModeIsActive, setEditModeIsActive] = useState(true)
  const [updatingMode, setUpdatingMode] = useState(false)

  // ----------------------------------------------------
  // Form State 3: Schedule Creation (POST /api/admin/competition/schedules)
  // ONLY timing and operational fields!
  // ----------------------------------------------------
  const [scheduleFormModeId, setScheduleFormModeId] = useState('')
  const [scheduleFormStatus, setScheduleFormStatus] = useState<'published' | 'draft' | 'closed'>('published')
  // OMB specific timing
  const [scheduleFormStartsAt, setScheduleFormStartsAt] = useState('')
  const [scheduleFormRoomRevealMinutes, setScheduleFormRoomRevealMinutes] = useState('15')
  // Tournament specific timing
  const [scheduleFormEntryClosesAt, setScheduleFormEntryClosesAt] = useState('')
  const [scheduleFormDurationMinutes, setScheduleFormDurationMinutes] = useState('60')
  // Common operational fields
  const [scheduleFormResultDeadlineMinutes, setScheduleFormResultDeadlineMinutes] = useState('90')
  const [scheduleFormManagerAlertMinutes, setScheduleFormManagerAlertMinutes] = useState('5')
  const [scheduleFormGuideVideoUrl, setScheduleFormGuideVideoUrl] = useState('')
  const [scheduleFormNotes, setScheduleFormNotes] = useState('')
  const [creatingSchedule, setCreatingSchedule] = useState(false)

  // ----------------------------------------------------
  // Form State 4: Match Test Join (POST /api/competitions/join)
  // ----------------------------------------------------
  const [testScheduleId, setTestScheduleId] = useState('')
  const [testGameUid, setTestGameUid] = useState('test-user-1')
  const [testGameName, setTestGameName] = useState('PlayerOne')
  const [joiningSchedule, setJoiningSchedule] = useState(false)
  const [joinResult, setJoinResult] = useState<string | null>(null)

  // ----------------------------------------------------
  // Data Fetchers
  // ----------------------------------------------------
  async function fetchGames() {
    setLoadingGames(true)
    try {
      const res = await api<{ games?: Game[] }>('/competitions/games')
      const list = Array.isArray(res?.games) ? res.games : Array.isArray(res) ? (res as Game[]) : []
      setGames(list)
      if (list.length > 0 && !modeFormGameId) {
        setModeFormGameId(list[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch games from /api/competitions/games')
    } finally {
      setLoadingGames(false)
    }
  }

  async function fetchModes(gameId?: string) {
    setLoadingModes(true)
    try {
      const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : ''
      const res = await api<{ modes?: GameMode[] }>(`/competitions/modes${qs}`)
      const list = Array.isArray(res?.modes) ? res.modes : Array.isArray(res) ? (res as GameMode[]) : []
      setModes(list)
      if (list.length > 0 && !scheduleFormModeId) {
        setScheduleFormModeId(list[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch game modes from /api/competitions/modes')
    } finally {
      setLoadingModes(false)
    }
  }

  async function fetchSchedules(modeId?: string, type?: string) {
    setLoadingSchedules(true)
    try {
      const params = new URLSearchParams()
      if (type && type !== 'all') {
        params.append('type', type)
      }
      if (modeId) {
        params.append('modeId', modeId)
      }
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api<{ schedules?: CompetitionSchedule[] }>(`/competitions/schedules${qs}`)
      const list = Array.isArray(res?.schedules) ? res.schedules : Array.isArray(res) ? (res as CompetitionSchedule[]) : []
      setSchedules(list)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch schedules from /api/competitions/schedules')
    } finally {
      setLoadingSchedules(false)
    }
  }

  // Initial mount load
  useEffect(() => {
    let isMounted = true
    async function loadAll() {
      setLoadingGames(true)
      setLoadingModes(true)
      setLoadingSchedules(true)

      try {
        const gamesRes = await api<{ games?: Game[] }>('/competitions/games').catch(() => null)
        if (isMounted && gamesRes) {
          const list = Array.isArray(gamesRes?.games) ? gamesRes.games : Array.isArray(gamesRes) ? (gamesRes as Game[]) : []
          setGames(list)
          if (list.length > 0) {
            setModeFormGameId((prev) => prev || list[0].id)
          }
        }
      } finally {
        if (isMounted) setLoadingGames(false)
      }

      try {
        const modesRes = await api<{ modes?: GameMode[] }>('/competitions/modes').catch(() => null)
        if (isMounted && modesRes) {
          const list = Array.isArray(modesRes?.modes) ? modesRes.modes : Array.isArray(modesRes) ? (modesRes as GameMode[]) : []
          setModes(list)
          if (list.length > 0) {
            setScheduleFormModeId((prev) => prev || list[0].id)
          }
        }
      } finally {
        if (isMounted) setLoadingModes(false)
      }

      try {
        const schedRes = await api<{ schedules?: CompetitionSchedule[] }>('/competitions/schedules').catch(() => null)
        if (isMounted && schedRes) {
          const list = Array.isArray(schedRes?.schedules) ? schedRes.schedules : Array.isArray(schedRes) ? (schedRes as CompetitionSchedule[]) : []
          setSchedules(list)
        }
      } finally {
        if (isMounted) setLoadingSchedules(false)
      }
    }

    loadAll()
    return () => {
      isMounted = false
    }
  }, [])

  // Auto reload modes when modeFilterGameId changes
  useEffect(() => {
    let isMounted = true
    const gameId = modeFilterGameId

    const qs = gameId ? `?gameId=${encodeURIComponent(gameId)}` : ''
    api<{ modes?: GameMode[] }>(`/competitions/modes${qs}`)
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res?.modes) ? res.modes : Array.isArray(res) ? (res as GameMode[]) : []
          setModes(list)
          if (list.length > 0) {
            setScheduleFormModeId((prev) => prev || list[0].id)
          }
        }
      })
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [modeFilterGameId])

  // Helper maps for mode / game lookups
  const gameMap = new Map<string, Game>()
  games.forEach((g) => gameMap.set(g.id, g))

  const modeMap = new Map<string, GameMode>()
  modes.forEach((m) => modeMap.set(m.id, m))

  // Find the selected mode object for schedule creation
  const currentSelectedMode = modeMap.get(scheduleFormModeId)

  // ----------------------------------------------------
  // Mode Prize Management
  // ----------------------------------------------------
  function addModePrizeTier() {
    const nextPos = modeFormPrizes.length + 1
    setModeFormPrizes([...modeFormPrizes, { position: nextPos, amount: 0 }])
  }

  function removeModePrizeTier(index: number) {
    if (modeFormPrizes.length <= 1) return
    const updated = modeFormPrizes.filter((_, i) => i !== index).map((p, idx) => ({ ...p, position: idx + 1 }))
    setModeFormPrizes(updated)
  }

  function updateModePrizeTier(index: number, amount: number) {
    const updated = [...modeFormPrizes]
    updated[index].amount = Math.max(0, Math.round(amount))
    setModeFormPrizes(updated)
  }

  function handleModeTypeToggle(type: 'omb' | 'tournament') {
    setModeFormType(type)
    if (type === 'omb') {
      setModeFormMaxParticipants('2')
      setModeFormTeamSize('1')
      setModeFormPrizes([{ position: 1, amount: 90 }])
      setModeFormTournamentMetric('')
    } else {
      setModeFormMaxParticipants('100')
      setModeFormTeamSize('1')
      setModeFormPrizes([
        { position: 1, amount: 2000 },
        { position: 2, amount: 1000 },
        { position: 3, amount: 500 },
      ])
      if (!modeFormTournamentMetric) setModeFormTournamentMetric('score')
    }
  }

  // ----------------------------------------------------
  // Edit Mode Prize Management
  // ----------------------------------------------------
  function addEditModePrizeTier() {
    const nextPos = editModePrizes.length + 1
    setEditModePrizes([...editModePrizes, { position: nextPos, amount: 0 }])
  }

  function removeEditModePrizeTier(index: number) {
    if (editModePrizes.length <= 1) return
    const updated = editModePrizes.filter((_, i) => i !== index).map((p, idx) => ({ ...p, position: idx + 1 }))
    setEditModePrizes(updated)
  }

  function updateEditModePrizeTier(index: number, amount: number) {
    const updated = [...editModePrizes]
    updated[index].amount = Math.max(0, Math.round(amount))
    setEditModePrizes(updated)
  }

  function openEditMode(m: GameMode) {
    setEditingMode(m)
    setEditModeName(m.name)
    setEditModeType(m.type || 'omb')
    setEditModeEntryFee(String(m.entryFee || 50))
    setEditModeMaxParticipants(String(m.maxParticipants || 2))
    setEditModeTeamSize(String(m.teamSize || 1))
    setEditModePrizes(Array.isArray(m.prizes) && m.prizes.length > 0 ? m.prizes : [{ position: 1, amount: 90 }])
    setEditModeTournamentMetric(m.tournamentMetric || '')
    setEditModeLogoUrl(m.logoUrl || '')
    setEditModeIsActive(m.isActive !== false)
    setShowEditModeModal(true)
  }

  // ====================================================
  // 1) CREATE GAME: POST /api/admin/competition/games
  // ====================================================
  async function handleCreateGame(e: FormEvent) {
    e.preventDefault()
    setCreatingGame(true)
    setErrorMessage('')
    setActionSuccess('')

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
      setActionSuccess(`Game "${name}" created successfully (ID: ${createdId}).`)
      setNewGameName('')
      setNewGameLogoUrl('')
      setShowCreateGameModal(false)
      await fetchGames()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create game on /api/admin/competition/games')
    } finally {
      setCreatingGame(false)
    }
  }

  // ====================================================
  // 2) CREATE MODE: POST /api/admin/competition/modes
  // ====================================================
  async function handleCreateMode(e: FormEvent) {
    e.preventDefault()
    setCreatingMode(true)
    setErrorMessage('')
    setActionSuccess('')

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

    if (feeNum <= 0) {
      setErrorMessage('Entry fee must be an integer greater than 0.')
      setCreatingMode(false)
      return
    }

    if (maxPartNum <= 0) {
      setErrorMessage('Max participants must be an integer greater than 0.')
      setCreatingMode(false)
      return
    }

    if (teamSizeNum <= 0) {
      setErrorMessage('Team size must be an integer greater than 0.')
      setCreatingMode(false)
      return
    }

    if (modeFormType === 'tournament' && !modeFormTournamentMetric.trim()) {
      setErrorMessage('Tournament Metric (e.g. score, kills, placement) is required for Tournament modes.')
      setCreatingMode(false)
      return
    }

    const payload: {
      gameId: string
      name: string
      type: 'omb' | 'tournament'
      entryFee: number
      maxParticipants: number
      teamSize: number
      prizes: PrizeTier[]
      tournamentMetric: string | null
      logoUrl?: string | null
    } = {
      gameId,
      name,
      type: modeFormType,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: modeFormPrizes.map((p) => ({ position: p.position, amount: Math.round(p.amount) })),
      tournamentMetric: modeFormType === 'tournament' ? modeFormTournamentMetric.trim() : null,
    }

    if (modeFormLogoUrl.trim()) {
      payload.logoUrl = modeFormLogoUrl.trim()
    }

    try {
      const res = await api<{ mode?: GameMode }>('/admin/competition/modes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.mode?.id || (res as Record<string, unknown>)?.id || 'OK'
      setActionSuccess(`Mode "${name}" (${modeFormType.toUpperCase()}) created successfully (ID: ${createdId}).`)
      setModeFormName('')
      setModeFormLogoUrl('')
      setShowCreateModeModal(false)
      await fetchModes(gameId)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create game mode on /api/admin/competition/modes')
    } finally {
      setCreatingMode(false)
    }
  }

  // ====================================================
  // 2B) UPDATE MODE: PATCH /api/admin/competition/modes/:id
  // ====================================================
  async function handleUpdateMode(e: FormEvent) {
    e.preventDefault()
    if (!editingMode) return

    setUpdatingMode(true)
    setErrorMessage('')
    setActionSuccess('')

    const name = editModeName.trim()
    const feeNum = Math.round(Number(editModeEntryFee))
    const maxPartNum = Math.round(Number(editModeMaxParticipants))
    const teamSizeNum = Math.round(Number(editModeTeamSize)) || 1

    if (!name || name.length > 128) {
      setErrorMessage('Mode name is required (1 to 128 characters).')
      setUpdatingMode(false)
      return
    }

    if (feeNum <= 0) {
      setErrorMessage('Entry fee must be an integer greater than 0.')
      setUpdatingMode(false)
      return
    }

    if (maxPartNum <= 0) {
      setErrorMessage('Max participants must be an integer greater than 0.')
      setUpdatingMode(false)
      return
    }

    const payload: {
      name: string
      type: 'omb' | 'tournament'
      entryFee: number
      maxParticipants: number
      teamSize: number
      prizes: PrizeTier[]
      tournamentMetric: string | null
      logoUrl: string | null
      isActive: boolean
    } = {
      name,
      type: editModeType,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      prizes: editModePrizes.map((p) => ({ position: p.position, amount: Math.round(p.amount) })),
      tournamentMetric: editModeType === 'tournament' ? editModeTournamentMetric.trim() || 'score' : null,
      logoUrl: editModeLogoUrl.trim() || null,
      isActive: editModeIsActive,
    }

    try {
      await api(`/admin/competition/modes/${editingMode.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setActionSuccess(`Mode "${name}" updated successfully.`)
      setShowEditModeModal(false)
      setEditingMode(null)
      await fetchModes(modeFilterGameId || undefined)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update game mode on /api/admin/competition/modes/:id')
    } finally {
      setUpdatingMode(false)
    }
  }

  // ====================================================
  // 3) CREATE SCHEDULE: POST /api/admin/competition/schedules
  // CRITICAL: ONLY timing and operational fields sent!
  // ====================================================
  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault()
    setCreatingSchedule(true)
    setErrorMessage('')
    setActionSuccess('')

    if (!scheduleFormModeId) {
      setErrorMessage('Please select a Mode to schedule.')
      setCreatingSchedule(false)
      return
    }

    const targetMode = modeMap.get(scheduleFormModeId)
    if (!targetMode) {
      setErrorMessage('Selected Mode could not be found. Please refresh modes.')
      setCreatingSchedule(false)
      return
    }

    const resDeadlineNum = Math.round(Number(scheduleFormResultDeadlineMinutes)) || 90
    const mgrAlertNum = Math.round(Number(scheduleFormManagerAlertMinutes)) || 5

    // Strict validation based on targetMode.type
    if (targetMode.type === 'omb') {
      if (!scheduleFormStartsAt) {
        setErrorMessage('For OMB matches, Start Time (startsAt) is required.')
        setCreatingSchedule(false)
        return
      }
      if (scheduleFormRoomRevealMinutes === '' || Number(scheduleFormRoomRevealMinutes) < 0) {
        setErrorMessage('Room Reveal Minutes Before Start must be an integer >= 0.')
        setCreatingSchedule(false)
        return
      }
    } else {
      // Tournament mode
      if (!scheduleFormEntryClosesAt) {
        setErrorMessage('For Tournaments, Entry Close Time (entryClosesAt) is required.')
        setCreatingSchedule(false)
        return
      }
      if (!scheduleFormDurationMinutes || Number(scheduleFormDurationMinutes) <= 0) {
        setErrorMessage('Duration in minutes must be an integer > 0.')
        setCreatingSchedule(false)
        return
      }
    }

    // Prepare timing-only body payload strictly
    const payload: {
      modeId: string
      status: 'draft' | 'published' | 'closed'
      startsAt: string | null
      entryClosesAt: string | null
      durationMinutes: number | null
      roomRevealMinutesBeforeStart: number | null
      resultDeadlineMinutes: number
      managerAlertAfterMinutes: number
      guideVideoUrl?: string | null
      notes?: string | null
    } = {
      modeId: scheduleFormModeId,
      status: scheduleFormStatus,
      startsAt: targetMode.type === 'omb' ? new Date(scheduleFormStartsAt).toISOString() : (scheduleFormStartsAt ? new Date(scheduleFormStartsAt).toISOString() : null),
      entryClosesAt: targetMode.type === 'tournament' ? new Date(scheduleFormEntryClosesAt).toISOString() : null,
      durationMinutes: targetMode.type === 'tournament' ? Math.round(Number(scheduleFormDurationMinutes)) : null,
      roomRevealMinutesBeforeStart: targetMode.type === 'omb' ? Math.round(Number(scheduleFormRoomRevealMinutes)) : null,
      resultDeadlineMinutes: resDeadlineNum,
      managerAlertAfterMinutes: mgrAlertNum,
      guideVideoUrl: scheduleFormGuideVideoUrl.trim() || null,
      notes: scheduleFormNotes.trim() || null,
    }

    try {
      const res = await api<{ schedule?: CompetitionSchedule }>('/admin/competition/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const createdId = res?.schedule?.id || (res as Record<string, unknown>)?.id || 'OK'
      setActionSuccess(`Schedule slot created successfully for Mode "${targetMode.name}" (ID: ${createdId}).`)
      setShowCreateScheduleModal(false)
      setScheduleFormStartsAt('')
      setScheduleFormEntryClosesAt('')
      setScheduleFormNotes('')
      setScheduleFormGuideVideoUrl('')
      await fetchSchedules(scheduleFilterModeId || undefined, scheduleFilterType)
      setActiveTab('schedules')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create schedule on /api/admin/competition/schedules')
    } finally {
      setCreatingSchedule(false)
    }
  }

  // ====================================================
  // 4) TEST JOIN: POST /api/competitions/join
  // ====================================================
  async function handleTestJoin(e: FormEvent) {
    e.preventDefault()
    setJoiningSchedule(true)
    setErrorMessage('')
    setActionSuccess('')
    setJoinResult(null)

    if (!testScheduleId) {
      setErrorMessage('Please select or specify a Schedule ID.')
      setJoiningSchedule(false)
      return
    }

    try {
      const res = await api<Record<string, unknown>>('/competitions/join', {
        method: 'POST',
        body: JSON.stringify({
          scheduleId: testScheduleId.trim(),
          gameUid: testGameUid.trim(),
          gameName: testGameName.trim(),
        }),
      })
      setJoinResult(JSON.stringify(res, null, 2))
      setActionSuccess(`Successfully joined schedule! Competition instance initiated.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join competition schedule on /api/competitions/join')
    } finally {
      setJoiningSchedule(false)
    }
  }

  return (
    <div className="content-container">
      {/* View Header with 3 Core Tabs (Screen A, Screen B, Screen C) + Test Join */}
      <div className="view-header">
        <div>
          <h2>Games, Modes & Schedules</h2>
          <p>
            Configuration belongs to the <strong>Mode</strong> &bull; Timing belongs to the <strong>Schedule</strong>
          </p>
        </div>
        <div className="header-actions">
          <button
            id="tab-games-btn"
            className={`tab-btn ${activeTab === 'games' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('games')
              fetchGames()
            }}
          >
            <Gamepad2 size={14} /> Screen A: Games ({games.length})
          </button>
          <button
            id="tab-modes-btn"
            className={`tab-btn ${activeTab === 'modes' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('modes')
              fetchModes(modeFilterGameId || undefined)
            }}
          >
            <Layers size={14} /> Screen B: Modes ({modes.length})
          </button>
          <button
            id="tab-schedules-btn"
            className={`tab-btn ${activeTab === 'schedules' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('schedules')
              fetchSchedules(scheduleFilterModeId || undefined, scheduleFilterType)
            }}
          >
            <Calendar size={14} /> Screen C: Schedules ({schedules.length})
          </button>
          <button
            id="tab-testjoin-btn"
            className={`tab-btn ${activeTab === 'testJoin' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('testJoin')}
          >
            <Play size={14} /> Match Test Join
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

      {actionSuccess && (
        <div className="alert-box success" role="status">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
          <button className="close-alert-btn" onClick={() => setActionSuccess('')}>
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN A: GAMES (GET /api/competitions/games)            */}
      {/* ======================================================== */}
      {activeTab === 'games' && (
        <div className="games-tab-content">
          <div className="section-divider">
            <div className="section-title-wrap">
              <h3>Games Directory</h3>
              <span className="muted-count">Representing top-level game categories</span>
            </div>
            <div className="filters-row">
              <button
                id="refresh-games-btn"
                className="secondary small-btn"
                onClick={fetchGames}
                disabled={loadingGames}
              >
                <RefreshCw size={13} className={loadingGames ? 'spinning' : ''} /> Refresh
              </button>
              <button
                id="open-create-game-btn"
                className="primary small-btn"
                onClick={() => setShowCreateGameModal(true)}
              >
                <Plus size={14} /> Create Game
              </button>
            </div>
          </div>

          {loadingGames ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Fetching games from /api/competitions/games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Gamepad2 size={32} color="#aa3bff" />
              </div>
              <h3>No Games Found in Database</h3>
              <p className="state-desc">
                No games are currently registered on <code>/api/competitions/games</code>. Create your first game below.
              </p>
              <button
                id="create-first-game-btn"
                className="primary small-btn"
                onClick={() => setShowCreateGameModal(true)}
              >
                <Plus size={14} /> Create First Game
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {games.map((g) => {
                const gameModes = modes.filter((m) => m.gameId === g.id)
                return (
                  <article key={g.id} className="game-card">
                    <div className="game-card-top">
                      {g.logoUrl ? (
                        <img
                          src={g.logoUrl}
                          alt={g.name}
                          className="game-logo-img"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            ;(e.target as HTMLElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="game-logo-placeholder">
                          <Gamepad2 size={24} />
                        </div>
                      )}
                      <div>
                        <h4>{g.name}</h4>
                        <span className="mono-code">UUID: {g.id}</span>
                        <div className="game-modes-count">
                          <Layers size={11} />
                          <span>{gameModes.length} Mode{gameModes.length === 1 ? '' : 's'} Configured</span>
                        </div>
                      </div>
                    </div>

                    <div className="game-card-actions">
                      <button
                        className="secondary small-btn"
                        onClick={() => {
                          setModeFilterGameId(g.id)
                          setActiveTab('modes')
                        }}
                      >
                        <Layers size={12} /> View Modes
                      </button>
                      <button
                        className="primary small-btn"
                        onClick={() => {
                          setModeFormGameId(g.id)
                          setShowCreateModeModal(true)
                        }}
                      >
                        <Plus size={12} /> Add Mode
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREEN B: MODES (GET /api/competitions/modes)            */}
      {/* ======================================================== */}
      {activeTab === 'modes' && (
        <div className="modes-tab-content">
          <div className="section-divider">
            <div className="section-title-wrap">
              <h3>Game Modes Configuration</h3>
              <span className="muted-count">Permanent competition definition with fee, slots & prize ladder</span>
            </div>
            <div className="filters-row">
              <select
                id="mode-game-filter"
                value={modeFilterGameId}
                onChange={(e) => setModeFilterGameId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Games ({games.length})</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <button
                id="refresh-modes-btn"
                className="secondary small-btn"
                onClick={() => fetchModes(modeFilterGameId || undefined)}
                disabled={loadingModes}
              >
                <RefreshCw size={13} className={loadingModes ? 'spinning' : ''} /> Refresh
              </button>

              <button
                id="open-create-mode-btn"
                className="primary small-btn"
                onClick={() => {
                  if (modeFilterGameId) {
                    setModeFormGameId(modeFilterGameId)
                  }
                  setShowCreateModeModal(true)
                }}
              >
                <Plus size={14} /> Create Mode
              </button>
            </div>
          </div>

          {loadingModes ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Fetching modes from /api/competitions/modes...</p>
            </div>
          ) : modes.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Layers size={32} color="#aa3bff" />
              </div>
              <h3>No Modes Found</h3>
              <p className="state-desc">
                {modeFilterGameId
                  ? 'No modes found for the selected game. Create a new mode with fee, slots, and prize rules.'
                  : 'No competition modes exist on /api/competitions/modes. Click "Create Mode" to configure one.'}
              </p>
              <button
                id="create-first-mode-btn"
                className="primary small-btn"
                onClick={() => setShowCreateModeModal(true)}
              >
                <Plus size={14} /> Create First Mode
              </button>
            </div>
          ) : (
            <div className="modes-grid">
              {modes.map((m) => {
                const parentGame = gameMap.get(m.gameId)
                const isOmb = m.type === 'omb'
                const prizeTotal = (m.prizes || []).reduce((acc, p) => acc + (p.amount || 0), 0)

                return (
                  <article key={m.id} className="mode-config-card">
                    <div className="mode-card-header">
                      <div className="mode-badge-wrap">
                        <span className={`mode-type-pill ${isOmb ? 'type-omb' : 'type-tournament'}`}>
                          {isOmb ? 'OMB (1v1 Match)' : 'TOURNAMENT'}
                        </span>
                        {m.isActive === false ? (
                          <span className="status-pill closed">INACTIVE</span>
                        ) : (
                          <span className="status-pill published">ACTIVE</span>
                        )}
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
                        <div className="mode-logo-placeholder">
                          <Layers size={16} />
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
                        <strong className="spec-val highlight-green">{prizeTotal} Coins</strong>
                      </div>
                    </div>

                    {/* Metric info if tournament */}
                    {m.tournamentMetric && (
                      <div className="mode-metric-badge">
                        <span>Scoring Metric: <strong>{m.tournamentMetric}</strong></span>
                      </div>
                    )}

                    {/* Prizes ladder summary */}
                    <div className="mode-prizes-preview">
                      <span className="prizes-lbl">Prize Ladder:</span>
                      <div className="prizes-tags-wrap">
                        {(m.prizes || []).map((p, idx) => (
                          <span key={idx} className="prize-chip">
                            #{p.position}: {p.amount} Coins
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mode-card-actions">
                      <button
                        className="secondary small-btn"
                        onClick={() => {
                          setScheduleFilterModeId(m.id)
                          setActiveTab('schedules')
                          fetchSchedules(m.id)
                        }}
                      >
                        <Calendar size={12} /> View Schedules
                      </button>
                      <button
                        className="primary small-btn"
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
      )}

      {/* ======================================================== */}
      {/* SCREEN C: SCHEDULES (GET /api/competitions/schedules)    */}
      {/* ======================================================== */}
      {activeTab === 'schedules' && (
        <div className="schedules-tab-content">
          <div className="section-divider">
            <div className="section-title-wrap">
              <h3>Match & Tournament Schedules</h3>
              <span className="muted-count">Active timing slots & instances belonging to Modes</span>
            </div>

            <div className="filters-row">
              <select
                id="sched-type-filter"
                value={scheduleFilterType}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'omb' | 'tournament'
                  setScheduleFilterType(val)
                  fetchSchedules(scheduleFilterModeId || undefined, val)
                }}
                className="filter-select"
              >
                <option value="all">All Types (OMB & Tournaments)</option>
                <option value="omb">OMB Only</option>
                <option value="tournament">Tournaments Only</option>
              </select>

              <select
                id="sched-game-filter"
                value={scheduleFilterGameId}
                onChange={(e) => {
                  const gId = e.target.value
                  setScheduleFilterGameId(gId)
                  setScheduleFilterModeId('')
                }}
                className="filter-select"
              >
                <option value="">All Games</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                id="sched-mode-filter"
                value={scheduleFilterModeId}
                onChange={(e) => {
                  const mId = e.target.value
                  setScheduleFilterModeId(mId)
                  fetchSchedules(mId || undefined, scheduleFilterType)
                }}
                className="filter-select"
              >
                <option value="">All Modes</option>
                {modes
                  .filter((m) => !scheduleFilterGameId || m.gameId === scheduleFilterGameId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.type.toUpperCase()})
                    </option>
                  ))}
              </select>

              <button
                id="refresh-schedules-btn"
                className="secondary small-btn"
                onClick={() => fetchSchedules(scheduleFilterModeId || undefined, scheduleFilterType)}
                disabled={loadingSchedules}
              >
                <RefreshCw size={13} className={loadingSchedules ? 'spinning' : ''} /> Refresh
              </button>

              <button
                id="open-create-schedule-btn"
                className="primary small-btn"
                onClick={() => {
                  if (scheduleFilterModeId) {
                    setScheduleFormModeId(scheduleFilterModeId)
                  }
                  setShowCreateScheduleModal(true)
                }}
              >
                <Plus size={14} /> New Schedule Slot
              </button>
            </div>
          </div>

          {/* Mode Context Preview Banner if filtered by a specific mode */}
          {scheduleFilterModeId && modeMap.get(scheduleFilterModeId) && (
            <div className="mode-context-banner">
              <div className="mode-context-info">
                <span className="context-label">Mode Context:</span>
                <strong>{modeMap.get(scheduleFilterModeId)?.name}</strong>
                <span className={`mode-type-pill ${modeMap.get(scheduleFilterModeId)?.type === 'omb' ? 'type-omb' : 'type-tournament'}`}>
                  {modeMap.get(scheduleFilterModeId)?.type?.toUpperCase()}
                </span>
                <span className="context-sep">&bull;</span>
                <span>Fee: <strong>{modeMap.get(scheduleFilterModeId)?.entryFee} Coins</strong></span>
                <span className="context-sep">&bull;</span>
                <span>Slots: <strong>{modeMap.get(scheduleFilterModeId)?.maxParticipants}</strong></span>
              </div>
              <button
                className="secondary small-btn"
                onClick={() => setScheduleFilterModeId('')}
              >
                Clear Filter
              </button>
            </div>
          )}

          {loadingSchedules ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Fetching schedules from /api/competitions/schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Calendar size={32} color="#aa3bff" />
              </div>
              <h3>No Schedule Slots Found</h3>
              <p className="state-desc">
                No timing schedules match your query on <code>/api/competitions/schedules</code>. Click "New Schedule Slot" to publish a match instance.
              </p>
              <button
                id="create-first-schedule-btn"
                className="primary small-btn"
                onClick={() => setShowCreateScheduleModal(true)}
              >
                <Plus size={14} /> Create Schedule Slot
              </button>
            </div>
          ) : (
            <div className="schedules-grid">
              {schedules.map((item) => {
                const parentMode = modeMap.get(item.modeId)
                const parentGame = parentMode ? gameMap.get(parentMode.gameId) : undefined
                const isOmb = parentMode?.type === 'omb' || (item.startsAt && item.roomRevealMinutesBeforeStart !== null)

                return (
                  <article key={item.id} className="schedule-card">
                    <div className="schedule-card-header">
                      <div className="schedule-badge-wrap">
                        <span className={`mode-type-pill ${isOmb ? 'type-omb' : 'type-tournament'}`}>
                          {isOmb ? 'OMB' : 'TOURNAMENT'}
                        </span>
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

                    {/* Timing Specific Fields */}
                    <div className="schedule-timing-box">
                      {item.startsAt && (
                        <div className="detail-line">
                          <Clock size={13} color="#10b981" />
                          <span>
                            <strong>Starts:</strong> {new Date(item.startsAt).toLocaleString()}
                          </span>
                        </div>
                      )}

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
                          <span><strong>Duration:</strong> {item.durationMinutes} minutes</span>
                        </div>
                      )}

                      {item.roomRevealMinutesBeforeStart !== null && item.roomRevealMinutesBeforeStart !== undefined && (
                        <div className="detail-line">
                          <span><strong>Room Reveal:</strong> {item.roomRevealMinutesBeforeStart} mins before start</span>
                        </div>
                      )}

                      <div className="detail-line-muted">
                        <span>Result Deadline: {item.resultDeadlineMinutes || 90}m &bull; Manager Alert: {item.managerAlertAfterMinutes || 5}m</span>
                      </div>
                    </div>

                    {/* Metadata & Notes */}
                    {item.notes && (
                      <p className="schedule-notes-text">
                        <strong>Note:</strong> {item.notes}
                      </p>
                    )}

                    {item.guideVideoUrl && (
                      <a
                        href={item.guideVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="guide-video-link"
                      >
                        <ExternalLink size={12} /> Guide Video
                      </a>
                    )}

                    <div className="schedule-card-actions">
                      <button
                        className="primary small-btn"
                        onClick={() => {
                          setTestScheduleId(item.id)
                          setActiveTab('testJoin')
                        }}
                      >
                        <Play size={12} /> Test Join Instance
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MATCH TEST JOIN (POST /api/competitions/join)            */}
      {/* ======================================================== */}
      {activeTab === 'testJoin' && (
        <div className="test-join-view">
          <form className="admin-form-card" onSubmit={handleTestJoin}>
            <div className="form-legend">
              <Sparkles size={16} color="#aa3bff" />
              <strong>POST /api/competitions/join</strong>
            </div>
            <p className="form-sub-desc">
              Directly tests the matchmaking endpoint by sending player game credentials and joining a published schedule.
            </p>

            <div className="form-grid">
              <label>
                Target Schedule ID *
                <select
                  id="test-schedule-select"
                  required
                  value={testScheduleId}
                  onChange={(e) => setTestScheduleId(e.target.value)}
                >
                  <option value="">-- Select Published Schedule Slot --</option>
                  {schedules.map((s) => {
                    const m = modeMap.get(s.modeId)
                    return (
                      <option key={s.id} value={s.id}>
                        {m?.name || s.modeId} ({s.startsAt ? new Date(s.startsAt).toLocaleTimeString() : s.id.slice(0, 8)}) - {s.status}
                      </option>
                    )
                  })}
                </select>
              </label>

              <label>
                In-Game UID (gameUid) *
                <input
                  id="test-game-uid"
                  required
                  type="text"
                  placeholder="e.g. 5182910291"
                  value={testGameUid}
                  onChange={(e) => setTestGameUid(e.target.value)}
                />
              </label>

              <label>
                In-Game Name (gameName) *
                <input
                  id="test-game-name"
                  required
                  type="text"
                  placeholder="e.g. Victor_Gamer"
                  value={testGameName}
                  onChange={(e) => setTestGameName(e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions-row">
              <button
                id="submit-test-join-btn"
                type="submit"
                className="primary"
                disabled={joiningSchedule}
              >
                {joiningSchedule ? 'Joining Competition...' : 'Join Schedule (POST /api/competitions/join)'}
              </button>
            </div>

            {joinResult && (
              <div className="join-result-box">
                <h4>Match Instance Creation Response:</h4>
                <pre>{joinResult}</pre>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE GAME (POST /api/admin/competition/games)  */}
      {/* ======================================================== */}
      {showCreateGameModal && (
        <div className="modal-overlay" onClick={() => setShowCreateGameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Game</h3>
              <button
                id="close-game-modal-btn"
                className="close-btn"
                onClick={() => setShowCreateGameModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Endpoint: <code>POST /api/admin/competition/games</code>
            </p>

            <form onSubmit={handleCreateGame} className="modal-form">
              <label>
                Game Name (1 to 128 characters) *
                <input
                  id="create-game-name-input"
                  required
                  type="text"
                  maxLength={128}
                  placeholder="e.g. PUBG Mobile, Free Fire, Chess"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                />
              </label>

              <label>
                Logo URL (Optional)
                <input
                  id="create-game-logo-input"
                  type="url"
                  placeholder="https://example.com/pubg.png"
                  value={newGameLogoUrl}
                  onChange={(e) => setNewGameLogoUrl(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowCreateGameModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="save-game-submit-btn"
                  type="submit"
                  className="primary"
                  disabled={creatingGame}
                >
                  {creatingGame ? 'Creating Game...' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE MODE (POST /api/admin/competition/modes)  */}
      {/* ======================================================== */}
      {showCreateModeModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Game Mode (Competition Definition)</h3>
              <button
                id="close-mode-modal-btn"
                className="close-btn"
                onClick={() => setShowCreateModeModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Endpoint: <code>POST /api/admin/competition/modes</code> &bull; Sets entryFee, maxParticipants, prizes & metric
            </p>

            <form onSubmit={handleCreateMode} className="modal-form">
              <div className="form-grid">
                <label>
                  Parent Game (gameId) *
                  <select
                    id="create-mode-game-select"
                    required
                    value={modeFormGameId}
                    onChange={(e) => setModeFormGameId(e.target.value)}
                  >
                    <option value="">-- Select Game --</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.id.slice(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Mode Name (1 to 128 characters) *
                  <input
                    id="create-mode-name-input"
                    required
                    type="text"
                    maxLength={128}
                    placeholder="e.g. Solo, Duo, Squad, Blitz"
                    value={modeFormName}
                    onChange={(e) => setModeFormName(e.target.value)}
                  />
                </label>
              </div>

              <label>
                Competition Type *
                <div className="segmented-control">
                  <button
                    type="button"
                    className={`segment-btn ${modeFormType === 'omb' ? 'active' : ''}`}
                    onClick={() => handleModeTypeToggle('omb')}
                  >
                    OMB (One Match Battle - 1v1)
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${modeFormType === 'tournament' ? 'active' : ''}`}
                    onClick={() => handleModeTypeToggle('tournament')}
                  >
                    Tournament (Multiplayer)
                  </button>
                </div>
              </label>

              <div className="form-grid">
                <label>
                  Entry Fee (Coins, integer &gt; 0) *
                  <input
                    id="create-mode-fee-input"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={modeFormEntryFee}
                    onChange={(e) => setModeFormEntryFee(e.target.value)}
                  />
                </label>

                <label>
                  Max Participants (integer &gt; 0) *
                  <input
                    id="create-mode-maxparts-input"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={modeFormMaxParticipants}
                    onChange={(e) => setModeFormMaxParticipants(e.target.value)}
                  />
                </label>

                <label>
                  Team Size (default 1) *
                  <input
                    id="create-mode-teamsize-input"
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={modeFormTeamSize}
                    onChange={(e) => setModeFormTeamSize(e.target.value)}
                  />
                </label>

                {modeFormType === 'tournament' && (
                  <label>
                    Tournament Metric (e.g. score, kills, placement) *
                    <input
                      id="create-mode-metric-input"
                      required
                      type="text"
                      maxLength={128}
                      placeholder="score"
                      value={modeFormTournamentMetric}
                      onChange={(e) => setModeFormTournamentMetric(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <label>
                Logo URL (Optional)
                <input
                  id="create-mode-logo-input"
                  type="url"
                  placeholder="https://example.com/solo.png"
                  value={modeFormLogoUrl}
                  onChange={(e) => setModeFormLogoUrl(e.target.value)}
                />
              </label>

              {/* Prize Ladder */}
              <div className="multi-slots-box">
                <div className="slots-header-line">
                  <span className="slots-header-label">
                    <Award size={14} /> Prize Ladder Configuration:
                  </span>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={addModePrizeTier}
                  >
                    <Plus size={12} /> Add Position
                  </button>
                </div>

                <div className="prizes-editor-list">
                  {modeFormPrizes.map((p, idx) => (
                    <div key={idx} className="prize-row-edit">
                      <span className="pos-badge">Rank #{p.position}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Amount in Coins"
                        value={p.amount}
                        onChange={(e) => updateModePrizeTier(idx, Number(e.target.value))}
                      />
                      {modeFormPrizes.length > 1 && (
                        <button
                          type="button"
                          className="danger small-btn icon-only"
                          onClick={() => removeModePrizeTier(idx)}
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
                  className="secondary"
                  onClick={() => setShowCreateModeModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="save-mode-submit-btn"
                  type="submit"
                  className="primary"
                  disabled={creatingMode}
                >
                  {creatingMode ? 'Creating Mode...' : 'Create Mode (POST /api/admin/competition/modes)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2B: EDIT MODE (PATCH /api/admin/competition/modes/:id) */}
      {/* ======================================================== */}
      {showEditModeModal && editingMode && (
        <div className="modal-overlay" onClick={() => setShowEditModeModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Mode: {editingMode.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditModeModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Endpoint: <code>PATCH /api/admin/competition/modes/{editingMode.id}</code>
            </p>

            <form onSubmit={handleUpdateMode} className="modal-form">
              <div className="form-grid">
                <label>
                  Mode Name *
                  <input
                    required
                    type="text"
                    maxLength={128}
                    value={editModeName}
                    onChange={(e) => setEditModeName(e.target.value)}
                  />
                </label>

                <label>
                  Competition Type *
                  <select
                    value={editModeType}
                    onChange={(e) => setEditModeType(e.target.value as 'omb' | 'tournament')}
                  >
                    <option value="omb">OMB (One Match Battle)</option>
                    <option value="tournament">Tournament (Multiplayer)</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Entry Fee (Coins &gt; 0) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editModeEntryFee}
                    onChange={(e) => setEditModeEntryFee(e.target.value)}
                  />
                </label>

                <label>
                  Max Participants (&gt; 0) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editModeMaxParticipants}
                    onChange={(e) => setEditModeMaxParticipants(e.target.value)}
                  />
                </label>

                <label>
                  Team Size (&gt; 0) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editModeTeamSize}
                    onChange={(e) => setEditModeTeamSize(e.target.value)}
                  />
                </label>

                {editModeType === 'tournament' && (
                  <label>
                    Tournament Metric
                    <input
                      type="text"
                      maxLength={128}
                      value={editModeTournamentMetric}
                      onChange={(e) => setEditModeTournamentMetric(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <div className="form-grid">
                <label>
                  Logo URL (Optional)
                  <input
                    type="url"
                    value={editModeLogoUrl}
                    onChange={(e) => setEditModeLogoUrl(e.target.value)}
                  />
                </label>

                <label>
                  Active Status
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={`toggle-btn ${editModeIsActive ? 'active-green' : ''}`}
                      onClick={() => setEditModeIsActive(true)}
                    >
                      <Check size={12} /> Active
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn ${!editModeIsActive ? 'active-red' : ''}`}
                      onClick={() => setEditModeIsActive(false)}
                    >
                      <X size={12} /> Inactive
                    </button>
                  </div>
                </label>
              </div>

              {/* Prize Ladder */}
              <div className="multi-slots-box">
                <div className="slots-header-line">
                  <span className="slots-header-label">
                    <Award size={14} /> Prize Ladder:
                  </span>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={addEditModePrizeTier}
                  >
                    <Plus size={12} /> Add Position
                  </button>
                </div>

                <div className="prizes-editor-list">
                  {editModePrizes.map((p, idx) => (
                    <div key={idx} className="prize-row-edit">
                      <span className="pos-badge">Rank #{p.position}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={p.amount}
                        onChange={(e) => updateEditModePrizeTier(idx, Number(e.target.value))}
                      />
                      {editModePrizes.length > 1 && (
                        <button
                          type="button"
                          className="danger small-btn icon-only"
                          onClick={() => removeEditModePrizeTier(idx)}
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
                  className="secondary"
                  onClick={() => setShowEditModeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={updatingMode}
                >
                  {updatingMode ? 'Saving Changes...' : 'Save Mode Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE SCHEDULE (POST /api/admin/competition/schedules) */}
      {/* STRICT TIMING ONLY FIELDS                                */}
      {/* ======================================================== */}
      {showCreateScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowCreateScheduleModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Schedule Slot (Timing Only)</h3>
              <button
                id="close-schedule-modal-btn"
                className="close-btn"
                onClick={() => setShowCreateScheduleModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Endpoint: <code>POST /api/admin/competition/schedules</code> &bull; Schedules define active time slots for a mode
            </p>

            <form onSubmit={handleCreateSchedule} className="modal-form">
              <div className="form-grid">
                <label>
                  Select Mode (modeId) *
                  <select
                    id="create-schedule-mode-select"
                    required
                    value={scheduleFormModeId}
                    onChange={(e) => setScheduleFormModeId(e.target.value)}
                  >
                    <option value="">-- Choose Mode to Schedule --</option>
                    {modes.map((m) => {
                      const g = gameMap.get(m.gameId)
                      return (
                        <option key={m.id} value={m.id}>
                          {g?.name ? `${g.name} - ` : ''}{m.name} ({m.type.toUpperCase()}) &bull; {m.entryFee} Coins
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label>
                  Schedule Status *
                  <select
                    id="create-schedule-status-select"
                    value={scheduleFormStatus}
                    onChange={(e) => setScheduleFormStatus(e.target.value as 'published' | 'draft' | 'closed')}
                  >
                    <option value="published">Published (Visible in App)</option>
                    <option value="draft">Draft (Internal)</option>
                    <option value="closed">Closed</option>
                  </select>
                </label>
              </div>

              {/* Mode preview badge */}
              {currentSelectedMode && (
                <div className="selected-mode-info-card">
                  <Info size={16} color="#aa3bff" />
                  <div>
                    <strong>{currentSelectedMode.name}</strong> ({currentSelectedMode.type.toUpperCase()}) &bull;{' '}
                    Entry: <strong>{currentSelectedMode.entryFee} Coins</strong> &bull;{' '}
                    Max Slots: <strong>{currentSelectedMode.maxParticipants}</strong> &bull;{' '}
                    Team Size: <strong>{currentSelectedMode.teamSize}</strong>
                  </div>
                </div>
              )}

              {/* Conditional Timing Fields based on Mode Type */}
              <div className="contract-highlight-box">
                {currentSelectedMode?.type === 'omb' || (!currentSelectedMode && true) ? (
                  <div>
                    <h4>OMB Timing Configuration (Match Start & Room Reveal)</h4>
                    <div className="form-grid">
                      <label>
                        Match Start Time (startsAt) *
                        <input
                          id="create-schedule-startsat-input"
                          required
                          type="datetime-local"
                          value={scheduleFormStartsAt}
                          onChange={(e) => setScheduleFormStartsAt(e.target.value)}
                        />
                      </label>

                      <label>
                        Room Reveal Minutes Before Start (&gt;= 0) *
                        <input
                          id="create-schedule-roomreveal-input"
                          required
                          type="number"
                          min="0"
                          step="1"
                          placeholder="15"
                          value={scheduleFormRoomRevealMinutes}
                          onChange={(e) => setScheduleFormRoomRevealMinutes(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4>Tournament Timing Configuration (Entry Close & Duration)</h4>
                    <div className="form-grid">
                      <label>
                        Entry Closes At (entryClosesAt) *
                        <input
                          id="create-schedule-entrycloses-input"
                          required
                          type="datetime-local"
                          value={scheduleFormEntryClosesAt}
                          onChange={(e) => setScheduleFormEntryClosesAt(e.target.value)}
                        />
                      </label>

                      <label>
                        Duration (durationMinutes &gt; 0) *
                        <input
                          id="create-schedule-duration-input"
                          required
                          type="number"
                          min="1"
                          step="1"
                          placeholder="60"
                          value={scheduleFormDurationMinutes}
                          onChange={(e) => setScheduleFormDurationMinutes(e.target.value)}
                        />
                      </label>

                      <label>
                        Start Time (startsAt - Optional for tournament)
                        <input
                          type="datetime-local"
                          value={scheduleFormStartsAt}
                          onChange={(e) => setScheduleFormStartsAt(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Common Operational Metadata */}
              <div className="form-grid">
                <label>
                  Result Deadline Minutes (default 90)
                  <input
                    id="create-schedule-deadline-input"
                    type="number"
                    min="1"
                    step="1"
                    value={scheduleFormResultDeadlineMinutes}
                    onChange={(e) => setScheduleFormResultDeadlineMinutes(e.target.value)}
                  />
                </label>

                <label>
                  Manager Alert After Minutes (default 5)
                  <input
                    id="create-schedule-alert-input"
                    type="number"
                    min="0"
                    step="1"
                    value={scheduleFormManagerAlertMinutes}
                    onChange={(e) => setScheduleFormManagerAlertMinutes(e.target.value)}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Guide Video URL (Optional)
                  <input
                    id="create-schedule-video-input"
                    type="url"
                    placeholder="https://example.com/guide.mp4"
                    value={scheduleFormGuideVideoUrl}
                    onChange={(e) => setScheduleFormGuideVideoUrl(e.target.value)}
                  />
                </label>

                <label>
                  Notes / Instructions (Optional)
                  <input
                    id="create-schedule-notes-input"
                    type="text"
                    maxLength={5000}
                    placeholder="e.g. Morning OMB slot #1"
                    value={scheduleFormNotes}
                    onChange={(e) => setScheduleFormNotes(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowCreateScheduleModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="save-schedule-submit-btn"
                  type="submit"
                  className="primary"
                  disabled={creatingSchedule}
                >
                  {creatingSchedule ? 'Creating Schedule...' : 'Create Schedule (POST /api/admin/competition/schedules)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
