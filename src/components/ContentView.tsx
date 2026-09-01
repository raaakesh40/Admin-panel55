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
} from 'lucide-react'

export function ContentView() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'createSchedule' | 'games' | 'createGame' | 'modes' | 'createMode' | 'testJoin'>('schedules')

  // Data lists from backend
  const [games, setGames] = useState<Game[]>([])
  const [modes, setModes] = useState<GameMode[]>([])
  const [schedules, setSchedules] = useState<CompetitionSchedule[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [loadingModes, setLoadingModes] = useState(false)
  const [loadingSchedules, setLoadingSchedules] = useState(false)

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Filter state for schedules
  const [filterType, setFilterType] = useState<'all' | 'omb' | 'tournament'>('all')
  const [filterModeId, setFilterModeId] = useState<string>('')

  // ==========================================
  // 1) Game Creation Form State
  // POST /api/admin/competition/games
  // { name: string, logoUrl?: string | null }
  // ==========================================
  const [newGameName, setNewGameName] = useState('')
  const [newGameLogoUrl, setNewGameLogoUrl] = useState('')
  const [creatingGame, setCreatingGame] = useState(false)

  // ==========================================
  // 2) Game Mode Creation Form State
  // POST /api/admin/competition/modes
  // { gameId: uuid, name: string, logoUrl?: string | null }
  // ==========================================
  const [selectedGameForMode, setSelectedGameForMode] = useState('')
  const [newModeName, setNewModeName] = useState('')
  const [newModeLogoUrl, setNewModeLogoUrl] = useState('')
  const [creatingMode, setCreatingMode] = useState(false)

  // ==========================================
  // 3) Competition Schedule Creation Form State
  // POST /api/admin/competition/schedules
  // ==========================================
  const [scheduleModeId, setScheduleModeId] = useState('')
  const [scheduleType, setScheduleType] = useState<'omb' | 'tournament'>('omb')
  const [scheduleStatus, setScheduleStatus] = useState<'draft' | 'published' | 'closed'>('published')
  const [entryFee, setEntryFee] = useState('50')
  const [maxParticipants, setMaxParticipants] = useState('2')
  const [teamSize, setTeamSize] = useState('1')
  
  // OMB specific
  const [startsAt, setStartsAt] = useState('')
  const [roomRevealMinutes, setRoomRevealMinutes] = useState('15')
  
  // Tournament specific
  const [entryClosesAt, setEntryClosesAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [tournamentMetric, setTournamentMetric] = useState('score')
  
  // Common & Defaults
  const [resultDeadlineMinutes, setResultDeadlineMinutes] = useState('90')
  const [managerAlertMinutes, setManagerAlertMinutes] = useState('5')
  const [guideVideoUrl, setGuideVideoUrl] = useState('')
  const [notes, setNotes] = useState('')
  
  // Prizes ladder
  const [prizes, setPrizes] = useState<PrizeTier[]>([
    { position: 1, amount: 90 },
  ])
  const [creatingSchedule, setCreatingSchedule] = useState(false)

  // ==========================================
  // 7) Join / Test Match Creation State
  // POST /api/competitions/join
  // { scheduleId: uuid, gameUid: string, gameName: string }
  // ==========================================
  const [testScheduleId, setTestScheduleId] = useState('')
  const [testGameUid, setTestGameUid] = useState('test-user-1')
  const [testGameName, setTestGameName] = useState('PlayerOne')
  const [joiningSchedule, setJoiningSchedule] = useState(false)

  // Fetch Games: GET /api/competitions/games
  async function fetchGames() {
    setLoadingGames(true)
    try {
      const res = await api<{ games?: Game[] }>('/competitions/games')
      const list = Array.isArray(res?.games) ? res.games : Array.isArray(res) ? (res as Game[]) : []
      setGames(list)
      if (list.length > 0 && !selectedGameForMode) {
        setSelectedGameForMode(list[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch games.')
    } finally {
      setLoadingGames(false)
    }
  }

  // Fetch Modes: GET /api/competitions/modes?gameId=...
  async function fetchModes(gameId?: string) {
    setLoadingModes(true)
    try {
      const queryParam = gameId ? `?gameId=${encodeURIComponent(gameId)}` : ''
      const res = await api<{ modes?: GameMode[] }>(`/competitions/modes${queryParam}`)
      const list = Array.isArray(res?.modes) ? res.modes : Array.isArray(res) ? (res as GameMode[]) : []
      setModes(list)
      if (list.length > 0 && !scheduleModeId) {
        setScheduleModeId(list[0].id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch game modes.')
    } finally {
      setLoadingModes(false)
    }
  }

  // Fetch Schedules: GET /api/competitions/schedules?type=omb|tournament&modeId=...
  async function fetchSchedules() {
    setLoadingSchedules(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') {
        params.append('type', filterType)
      }
      if (filterModeId) {
        params.append('modeId', filterModeId)
      }
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await api<{ schedules?: CompetitionSchedule[] }>(`/competitions/schedules${qs}`)
      const list = Array.isArray(res?.schedules) ? res.schedules : Array.isArray(res) ? (res as CompetitionSchedule[]) : []
      setSchedules(list)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch schedules.')
    } finally {
      setLoadingSchedules(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      setLoadingGames(true)
      setLoadingModes(true)
      setLoadingSchedules(true)

      try {
        const gamesRes = await api<{ games?: Game[] }>('/competitions/games').catch(() => null)
        if (isMounted && gamesRes) {
          const list = Array.isArray(gamesRes?.games) ? gamesRes.games : Array.isArray(gamesRes) ? (gamesRes as Game[]) : []
          setGames(list)
          if (list.length > 0) {
            setSelectedGameForMode((prev) => prev || list[0].id)
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
            setScheduleModeId((prev) => prev || list[0].id)
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

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  // Auto-reload modes when selectedGameForMode changes
  useEffect(() => {
    if (!selectedGameForMode) return
    let isMounted = true
    const gameId = selectedGameForMode

    api<{ modes?: GameMode[] }>(`/competitions/modes?gameId=${encodeURIComponent(gameId)}`)
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res?.modes) ? res.modes : Array.isArray(res) ? (res as GameMode[]) : []
          setModes(list)
          if (list.length > 0) {
            setScheduleModeId((prev) => prev || list[0].id)
          }
        }
      })
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [selectedGameForMode])

  // Adjust defaults when scheduleType toggles
  function handleScheduleTypeChange(type: 'omb' | 'tournament') {
    setScheduleType(type)
    if (type === 'omb') {
      setMaxParticipants('2')
      setPrizes([{ position: 1, amount: 90 }])
      if (!roomRevealMinutes) setRoomRevealMinutes('15')
    } else {
      setMaxParticipants('100')
      setPrizes([
        { position: 1, amount: 2000 },
        { position: 2, amount: 1000 },
        { position: 3, amount: 500 },
      ])
      if (!durationMinutes) setDurationMinutes('60')
      if (!tournamentMetric) setTournamentMetric('score')
    }
  }

  // Prize ladder management
  function addPrizeTier() {
    const nextPos = prizes.length + 1
    setPrizes([...prizes, { position: nextPos, amount: 0 }])
  }

  function removePrizeTier(index: number) {
    if (prizes.length <= 1) return
    const updated = prizes.filter((_, i) => i !== index).map((p, idx) => ({ ...p, position: idx + 1 }))
    setPrizes(updated)
  }

  function updatePrizeTier(index: number, amount: number) {
    const updated = [...prizes]
    updated[index].amount = Math.max(0, Math.round(amount))
    setPrizes(updated)
  }

  // 1) Handle Game Creation: POST /api/admin/competition/games
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
      await api('/admin/competition/games', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setActionSuccess(`Game "${name}" created successfully.`)
      setNewGameName('')
      setNewGameLogoUrl('')
      await fetchGames()
      setActiveTab('games')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create game.')
    } finally {
      setCreatingGame(false)
    }
  }

  // 2) Handle Mode Creation: POST /api/admin/competition/modes
  async function handleCreateMode(e: FormEvent) {
    e.preventDefault()
    setCreatingMode(true)
    setErrorMessage('')
    setActionSuccess('')

    const gameId = selectedGameForMode
    const name = newModeName.trim()

    if (!gameId) {
      setErrorMessage('Please select a game for this mode.')
      setCreatingMode(false)
      return
    }

    if (!name || name.length > 128) {
      setErrorMessage('Mode name must be between 1 and 128 characters.')
      setCreatingMode(false)
      return
    }

    const payload: { gameId: string; name: string; logoUrl?: string | null } = {
      gameId,
      name,
    }
    if (newModeLogoUrl.trim()) {
      payload.logoUrl = newModeLogoUrl.trim()
    }

    try {
      await api('/admin/competition/modes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setActionSuccess(`Mode "${name}" created successfully.`)
      setNewModeName('')
      setNewModeLogoUrl('')
      await fetchModes(gameId)
      setActiveTab('modes')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create game mode.')
    } finally {
      setCreatingMode(false)
    }
  }

  // 3) Handle Schedule Creation: POST /api/admin/competition/schedules
  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault()
    setCreatingSchedule(true)
    setErrorMessage('')
    setActionSuccess('')

    if (!scheduleModeId) {
      setErrorMessage('Please select a Game Mode.')
      setCreatingSchedule(false)
      return
    }

    const feeNum = Math.round(Number(entryFee))
    const maxPartNum = Math.round(Number(maxParticipants))
    const teamSizeNum = Math.round(Number(teamSize)) || 1
    const resDeadlineNum = Math.round(Number(resultDeadlineMinutes)) || 90
    const mgrAlertNum = Math.round(Number(managerAlertMinutes)) || 5

    if (feeNum <= 0) {
      setErrorMessage('Entry fee must be an integer greater than 0.')
      setCreatingSchedule(false)
      return
    }
    if (maxPartNum <= 0) {
      setErrorMessage('Max participants must be an integer greater than 0.')
      setCreatingSchedule(false)
      return
    }

    // Validation per backend contract:
    // If type === "omb", startsAt and roomRevealMinutesBeforeStart are required
    // If type === "tournament", entryClosesAt, durationMinutes, and tournamentMetric are required
    if (scheduleType === 'omb') {
      if (!startsAt) {
        setErrorMessage('For OMB matches, Start Time (startsAt) is required.')
        setCreatingSchedule(false)
        return
      }
      if (roomRevealMinutes === '' || Number(roomRevealMinutes) < 0) {
        setErrorMessage('Room Reveal Minutes (roomRevealMinutesBeforeStart) must be >= 0.')
        setCreatingSchedule(false)
        return
      }
    } else {
      if (!entryClosesAt) {
        setErrorMessage('For Tournaments, Entry Closes At is required.')
        setCreatingSchedule(false)
        return
      }
      if (!durationMinutes || Number(durationMinutes) <= 0) {
        setErrorMessage('Duration in minutes must be an integer > 0.')
        setCreatingSchedule(false)
        return
      }
      if (!tournamentMetric.trim()) {
        setErrorMessage('Tournament Metric (e.g. score, kills, placement) is required.')
        setCreatingSchedule(false)
        return
      }
    }

    const payload: Record<string, unknown> = {
      modeId: scheduleModeId,
      type: scheduleType,
      status: scheduleStatus,
      entryFee: feeNum,
      maxParticipants: maxPartNum,
      teamSize: teamSizeNum,
      resultDeadlineMinutes: resDeadlineNum,
      managerAlertAfterMinutes: mgrAlertNum,
      prizes: prizes.map((p) => ({ position: p.position, amount: Math.round(p.amount) })),
    }

    if (scheduleType === 'omb') {
      payload.startsAt = new Date(startsAt).toISOString()
      payload.roomRevealMinutesBeforeStart = Math.round(Number(roomRevealMinutes))
    } else {
      payload.entryClosesAt = new Date(entryClosesAt).toISOString()
      payload.durationMinutes = Math.round(Number(durationMinutes))
      payload.tournamentMetric = tournamentMetric.trim()
      if (startsAt) {
        payload.startsAt = new Date(startsAt).toISOString()
      }
    }

    if (guideVideoUrl.trim()) {
      payload.guideVideoUrl = guideVideoUrl.trim()
    }
    if (notes.trim()) {
      payload.notes = notes.trim()
    }

    try {
      await api('/admin/competition/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setActionSuccess(`Competition schedule created successfully.`)
      await fetchSchedules()
      setActiveTab('schedules')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create competition schedule.')
    } finally {
      setCreatingSchedule(false)
    }
  }

  // 7) Handle Join / Test match: POST /api/competitions/join
  async function handleJoinSchedule(e: FormEvent) {
    e.preventDefault()
    setJoiningSchedule(true)
    setErrorMessage('')
    setActionSuccess('')

    if (!testScheduleId) {
      setErrorMessage('Please select a Schedule ID to join.')
      setJoiningSchedule(false)
      return
    }

    try {
      const res = await api<Record<string, unknown>>('/competitions/join', {
        method: 'POST',
        body: JSON.stringify({
          scheduleId: testScheduleId,
          gameUid: testGameUid.trim(),
          gameName: testGameName.trim(),
        }),
      })

      setActionSuccess(`Joined schedule! Match/Tournament instance created: ${JSON.stringify(res || 'OK')}`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join competition schedule.')
    } finally {
      setJoiningSchedule(false)
    }
  }

  return (
    <div className="content-container">
      <div className="view-header">
        <div>
          <h2>Games & Schedules</h2>
          <p>Strict backend integration for games, modes, schedules & matchmaking</p>
        </div>
        <div className="header-actions">
          <button
            className={`tab-btn ${activeTab === 'schedules' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('schedules')
              fetchSchedules()
            }}
          >
            <Calendar size={14} /> Schedules ({schedules.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'createSchedule' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('createSchedule')}
          >
            <Plus size={14} /> New Schedule
          </button>
          <button
            className={`tab-btn ${activeTab === 'games' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('games')
              fetchGames()
            }}
          >
            <Gamepad2 size={14} /> Games ({games.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'createGame' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('createGame')}
          >
            <Plus size={14} /> New Game
          </button>
          <button
            className={`tab-btn ${activeTab === 'modes' ? 'active-tab' : ''}`}
            onClick={() => {
              setActiveTab('modes')
              fetchModes()
            }}
          >
            <Layers size={14} /> Modes ({modes.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'createMode' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('createMode')}
          >
            <Plus size={14} /> New Mode
          </button>
          <button
            className={`tab-btn ${activeTab === 'testJoin' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('testJoin')}
          >
            <Play size={14} /> Test Join
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert-box error">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert-box success">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: SCHEDULES LIST (GET /api/competitions/schedules)  */}
      {/* ======================================================== */}
      {activeTab === 'schedules' && (
        <>
          <div className="section-divider">
            <h3>Schedules from Database</h3>
            <div className="filters-row">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'omb' | 'tournament')}
                className="filter-select"
              >
                <option value="all">All Types</option>
                <option value="omb">OMB (1v1)</option>
                <option value="tournament">Tournaments</option>
              </select>

              <select
                value={filterModeId}
                onChange={(e) => setFilterModeId(e.target.value)}
                className="filter-select"
              >
                <option value="">All Game Modes</option>
                {modes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>

              <button
                className="secondary small-btn"
                onClick={fetchSchedules}
                disabled={loadingSchedules}
                title="Refresh from /api/competitions/schedules"
              >
                <RefreshCw size={13} className={loadingSchedules ? 'spinning' : ''} /> Refresh
              </button>
            </div>
          </div>

          {loadingSchedules ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Querying /api/competitions/schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Calendar size={32} color="#aa3bff" />
              </div>
              <h3>No Schedules Found in Database</h3>
              <p className="state-desc">
                No competition schedules match your query on <code>/api/competitions/schedules</code>. Click "New Schedule" to create a new match schedule.
              </p>
              <button className="primary small-btn" onClick={() => setActiveTab('createSchedule')}>
                <Plus size={14} /> Create Schedule
              </button>
            </div>
          ) : (
            <div className="schedules-grid">
              {schedules.map((item) => (
                <article key={item.id} className="schedule-card">
                  <div className="schedule-card-header">
                    <span className="badge-tag">{item.type.toUpperCase()}</span>
                    <span className={`status-pill ${item.status || 'draft'}`}>
                      {(item.status || 'draft').toUpperCase()}
                    </span>
                  </div>

                  <h4 className="schedule-title">
                    Mode ID: <small className="mono-code">{item.modeId}</small>
                  </h4>

                  <div className="schedule-stats-grid">
                    <div className="sstat">
                      <span>Fee</span>
                      <strong>{item.entryFee} Coins</strong>
                    </div>
                    <div className="sstat">
                      <span>Max Slots</span>
                      <strong>{item.maxParticipants}</strong>
                    </div>
                    <div className="sstat">
                      <span>Team Size</span>
                      <strong>{item.teamSize}</strong>
                    </div>
                    <div className="sstat">
                      <span>Prizes</span>
                      <strong>{item.prizes?.length || 0} Tiers</strong>
                    </div>
                  </div>

                  <div className="schedule-details-extra">
                    {item.startsAt && (
                      <div className="detail-line">
                        <Clock size={12} />
                        <span>Starts: {new Date(item.startsAt).toLocaleString()}</span>
                      </div>
                    )}
                    {item.entryClosesAt && (
                      <div className="detail-line">
                        <Clock size={12} />
                        <span>Closes: {new Date(item.entryClosesAt).toLocaleString()}</span>
                      </div>
                    )}
                    {item.durationMinutes && (
                      <div className="detail-line">
                        <span>Duration: {item.durationMinutes} mins</span>
                      </div>
                    )}
                    {item.tournamentMetric && (
                      <div className="detail-line">
                        <span>Metric: {item.tournamentMetric}</span>
                      </div>
                    )}
                  </div>

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
              ))}
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CREATE SCHEDULE (POST /api/admin/competition/schedules)       */}
      {/* =================================================================== */}
      {activeTab === 'createSchedule' && (
        <div className="schedule-create-view">
          <form className="admin-form-card" onSubmit={handleCreateSchedule}>
            <div className="form-legend">
              <Sparkles size={16} color="#aa3bff" />
              <strong>POST /api/admin/competition/schedules</strong>
            </div>

            <div className="form-grid">
              <label>
                Type *
                <select
                  value={scheduleType}
                  onChange={(e) => handleScheduleTypeChange(e.target.value as 'omb' | 'tournament')}
                >
                  <option value="omb">OMB (One Match Battle - 1v1)</option>
                  <option value="tournament">Tournament (Multiplayer)</option>
                </select>
              </label>

              <label>
                Game Mode (modeId) *
                <select
                  required
                  value={scheduleModeId}
                  onChange={(e) => setScheduleModeId(e.target.value)}
                >
                  <option value="">-- Select Mode --</option>
                  {modes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  value={scheduleStatus}
                  onChange={(e) => setScheduleStatus(e.target.value as 'draft' | 'published' | 'closed')}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <label>
                Entry Fee (Coins, integer &gt; 0) *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                />
              </label>

              <label>
                Max Participants (integer &gt; 0) *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                />
              </label>

              <label>
                Team Size (default 1)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                />
              </label>
            </div>

            {/* Type Specific Requirements */}
            <div className="contract-highlight-box">
              {scheduleType === 'omb' ? (
                <div>
                  <h4>OMB Specific Fields (Required)</h4>
                  <div className="form-grid">
                    <label>
                      Starts At (startsAt) *
                      <input
                        required
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                      />
                    </label>

                    <label>
                      Room Reveal Minutes Before Start (&gt;= 0) *
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={roomRevealMinutes}
                        onChange={(e) => setRoomRevealMinutes(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <h4>Tournament Specific Fields (Required)</h4>
                  <div className="form-grid">
                    <label>
                      Entry Closes At (entryClosesAt) *
                      <input
                        required
                        type="datetime-local"
                        value={entryClosesAt}
                        onChange={(e) => setEntryClosesAt(e.target.value)}
                      />
                    </label>

                    <label>
                      Duration (durationMinutes &gt; 0) *
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        placeholder="60"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                    </label>

                    <label>
                      Tournament Metric (e.g. score, kills, placement) *
                      <input
                        required
                        type="text"
                        placeholder="score"
                        value={tournamentMetric}
                        onChange={(e) => setTournamentMetric(e.target.value)}
                      />
                    </label>

                    <label>
                      Starts At (Optional for tournament)
                      <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Common Fields */}
            <div className="form-grid">
              <label>
                Result Deadline Minutes (default 90)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={resultDeadlineMinutes}
                  onChange={(e) => setResultDeadlineMinutes(e.target.value)}
                />
              </label>

              <label>
                Manager Alert After Minutes (default 5)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={managerAlertMinutes}
                  onChange={(e) => setManagerAlertMinutes(e.target.value)}
                />
              </label>

              <label>
                Guide Video URL (Optional)
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={guideVideoUrl}
                  onChange={(e) => setGuideVideoUrl(e.target.value)}
                />
              </label>

              <label>
                Notes (Optional)
                <input
                  type="text"
                  placeholder="Schedule notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>

            {/* Prize Ladder */}
            <div className="multi-slots-box">
              <div className="slots-header-line">
                <span className="slots-header-label">
                  <Award size={14} /> Prize Ladder (Array of position & amount):
                </span>
                <button type="button" className="secondary small-btn" onClick={addPrizeTier}>
                  <Plus size={12} /> Add Position
                </button>
              </div>

              <div className="prizes-editor-list">
                {prizes.map((p, idx) => (
                  <div key={idx} className="prize-row-edit">
                    <span className="pos-badge">#{p.position}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Amount ₹"
                      value={p.amount}
                      onChange={(e) => updatePrizeTier(idx, Number(e.target.value))}
                    />
                    {prizes.length > 1 && (
                      <button
                        type="button"
                        className="danger small-btn icon-only"
                        onClick={() => removePrizeTier(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('schedules')}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creatingSchedule}>
                {creatingSchedule ? 'Submitting to Backend...' : 'Create Schedule (POST /api/admin/competition/schedules)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GAMES LIST (GET /api/competitions/games)           */}
      {/* ======================================================== */}
      {activeTab === 'games' && (
        <div className="games-tab-content">
          <div className="section-divider">
            <h3>Games from Database (GET /api/competitions/games)</h3>
            <button
              className="secondary small-btn"
              onClick={fetchGames}
              disabled={loadingGames}
            >
              <RefreshCw size={13} className={loadingGames ? 'spinning' : ''} /> Refresh
            </button>
          </div>

          {loadingGames ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Fetching /api/competitions/games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Gamepad2 size={32} color="#aa3bff" />
              </div>
              <h3>No Games Found</h3>
              <p className="state-desc">
                No games currently exist on <code>/api/competitions/games</code>. Click "New Game" to register one.
              </p>
              <button className="primary small-btn" onClick={() => setActiveTab('createGame')}>
                <Plus size={14} /> Create First Game
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {games.map((g) => (
                <article key={g.id} className="game-card">
                  <div className="game-card-top">
                    {g.logoUrl ? (
                      <img src={g.logoUrl} alt={g.name} className="game-logo-img" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="game-logo-placeholder">
                        <Gamepad2 size={24} />
                      </div>
                    )}
                    <div>
                      <h4>{g.name}</h4>
                      <small className="mono-code">UUID: {g.id}</small>
                    </div>
                  </div>
                  <div className="game-card-actions">
                    <button
                      className="secondary small-btn"
                      onClick={() => {
                        setSelectedGameForMode(g.id)
                        setActiveTab('createMode')
                      }}
                    >
                      <Plus size={12} /> Add Mode
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: CREATE GAME (POST /api/admin/competition/games)    */}
      {/* ======================================================== */}
      {activeTab === 'createGame' && (
        <div className="game-create-view">
          <form className="admin-form-card" onSubmit={handleCreateGame}>
            <div className="form-legend">
              <Gamepad2 size={16} color="#aa3bff" />
              <strong>POST /api/admin/competition/games</strong>
            </div>

            <div className="form-grid">
              <label>
                Game Name (min 1, max 128) *
                <input
                  required
                  type="text"
                  maxLength={128}
                  placeholder="e.g. PUBG Mobile"
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                />
              </label>

              <label>
                Logo URL (Optional, valid URL if present)
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={newGameLogoUrl}
                  onChange={(e) => setNewGameLogoUrl(e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('games')}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creatingGame}>
                {creatingGame ? 'Submitting...' : 'Create Game (POST /api/admin/competition/games)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: MODES LIST (GET /api/competitions/modes)          */}
      {/* ======================================================== */}
      {activeTab === 'modes' && (
        <div className="modes-tab-content">
          <div className="section-divider">
            <h3>Game Modes from Database (GET /api/competitions/modes)</h3>
            <div className="filters-row">
              <select
                value={selectedGameForMode}
                onChange={(e) => setSelectedGameForMode(e.target.value)}
                className="filter-select"
              >
                <option value="">All Games</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                className="secondary small-btn"
                onClick={() => fetchModes(selectedGameForMode)}
                disabled={loadingModes}
              >
                <RefreshCw size={13} className={loadingModes ? 'spinning' : ''} /> Refresh
              </button>
            </div>
          </div>

          {loadingModes ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Fetching /api/competitions/modes...</p>
            </div>
          ) : modes.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Layers size={32} color="#aa3bff" />
              </div>
              <h3>No Modes Found</h3>
              <p className="state-desc">
                No game modes exist on <code>/api/competitions/modes</code>. Click "New Mode" to create one.
              </p>
              <button className="primary small-btn" onClick={() => setActiveTab('createMode')}>
                <Plus size={14} /> Create First Mode
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {modes.map((m) => (
                <article key={m.id} className="game-card">
                  <div className="game-card-top">
                    {m.logoUrl ? (
                      <img src={m.logoUrl} alt={m.name} className="game-logo-img" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="game-logo-placeholder">
                        <Layers size={24} />
                      </div>
                    )}
                    <div>
                      <h4>{m.name}</h4>
                      <small className="mono-code">Mode ID: {m.id}</small>
                      <br />
                      <small className="muted">Game ID: {m.gameId}</small>
                    </div>
                  </div>
                  <div className="game-card-actions">
                    <button
                      className="primary small-btn"
                      onClick={() => {
                        setScheduleModeId(m.id)
                        setActiveTab('createSchedule')
                      }}
                    >
                      <Plus size={12} /> Schedule Match
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: CREATE MODE (POST /api/admin/competition/modes)    */}
      {/* ======================================================== */}
      {activeTab === 'createMode' && (
        <div className="mode-create-view">
          <form className="admin-form-card" onSubmit={handleCreateMode}>
            <div className="form-legend">
              <Layers size={16} color="#aa3bff" />
              <strong>POST /api/admin/competition/modes</strong>
            </div>

            <div className="form-grid">
              <label>
                Target Game (gameId UUID) *
                <select
                  required
                  value={selectedGameForMode}
                  onChange={(e) => setSelectedGameForMode(e.target.value)}
                >
                  <option value="">-- Select Game --</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Mode Name (min 1, max 128) *
                <input
                  required
                  type="text"
                  maxLength={128}
                  placeholder="e.g. Solo, Squad, 1v1 Blitz"
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                />
              </label>

              <label>
                Mode Logo URL (Optional)
                <input
                  type="url"
                  placeholder="https://example.com/mode.png"
                  value={newModeLogoUrl}
                  onChange={(e) => setNewModeLogoUrl(e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('modes')}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={creatingMode}>
                {creatingMode ? 'Submitting...' : 'Create Mode (POST /api/admin/competition/modes)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: TEST JOIN (POST /api/competitions/join)           */}
      {/* ======================================================== */}
      {activeTab === 'testJoin' && (
        <div className="join-test-view">
          <form className="admin-form-card" onSubmit={handleJoinSchedule}>
            <div className="form-legend">
              <Play size={16} color="#aa3bff" />
              <strong>POST /api/competitions/join (Auto-creates match/tournament instance)</strong>
            </div>

            <div className="form-grid">
              <label>
                Schedule ID (UUID) *
                <select
                  required
                  value={testScheduleId}
                  onChange={(e) => setTestScheduleId(e.target.value)}
                >
                  <option value="">-- Select Schedule --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.type.toUpperCase()} - {s.entryFee} coins ({s.id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Game UID (e.g. In-game player ID) *
                <input
                  required
                  type="text"
                  placeholder="user-123"
                  value={testGameUid}
                  onChange={(e) => setTestGameUid(e.target.value)}
                />
              </label>

              <label>
                Game Name (In-game IGN) *
                <input
                  required
                  type="text"
                  placeholder="PUBG Mobile"
                  value={testGameName}
                  onChange={(e) => setTestGameName(e.target.value)}
                />
              </label>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="primary" disabled={joiningSchedule}>
                {joiningSchedule ? 'Joining...' : 'Execute Join (POST /api/competitions/join)'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
