import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { DailyScheduleItem } from '../types'
import { api } from '../services/api'
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  PlayCircle,
  PauseCircle,
  Plus,
  X,
  ListFilter,
  PlusCircle,
  RefreshCw,
  Gamepad2,
} from 'lucide-react'

function normalizeScheduleItem(raw: unknown): DailyScheduleItem {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawSlots = d.dailySlots || d.slots || d.scheduleSlots || d.timings
  let dailySlots: string[] = []
  if (Array.isArray(rawSlots)) {
    dailySlots = rawSlots.map((s) => String(s))
  } else if (typeof rawSlots === 'string') {
    dailySlots = rawSlots.split(',').map((s) => s.trim()).filter(Boolean)
  } else if (d.scheduleTime || d.schedule_time || d.time) {
    dailySlots = [String(d.scheduleTime || d.schedule_time || d.time)]
  }

  const rawRecurrence = String(d.recurrence || 'daily').toLowerCase()
  const recurrence: 'daily' | 'weekdays' | 'weekends' | 'custom' =
    rawRecurrence === 'weekdays' || rawRecurrence === 'weekends' || rawRecurrence === 'custom'
      ? rawRecurrence
      : 'daily'

  const rawStatus = String(d.status || 'published').toLowerCase()
  const status: 'published' | 'draft' | 'closed' =
    rawStatus === 'draft' || rawStatus === 'closed' ? rawStatus : 'published'

  const rawType = String(d.type || 'tournament').toLowerCase()
  const type: 'omb' | 'tournament' = rawType.includes('omb') ? 'omb' : 'tournament'

  const rawMode = String(d.mode || (type === 'omb' ? '1v1' : 'Squad'))
  const mode: 'Solo' | 'Duo' | 'Squad' | '1v1' =
    rawMode === 'Solo' || rawMode === 'Duo' || rawMode === 'Squad' || rawMode === '1v1'
      ? rawMode
      : 'Squad'

  return {
    id: String(d.id || d._id || d.scheduleId || ''),
    game: String(d.game || d.gameTitle || 'BGMI'),
    title: String(d.title || d.name || 'Schedule'),
    type,
    mode,
    entryFee: Number(d.entryFee ?? d.entry_fee ?? d.fee ?? 0) || 0,
    maxParticipants: Number(d.maxParticipants ?? d.maxSlots ?? d.slots ?? (type === 'omb' ? 2 : 100)) || 100,
    prizePool: Number(d.prizePool ?? d.prize_pool ?? d.prize ?? 0) || 0,
    dailySlots: dailySlots.length > 0 ? dailySlots : ['18:00'],
    recurrence,
    status,
    roomRevealMinutesBeforeStart: Number(d.roomRevealMinutesBeforeStart ?? d.revealMinutes ?? 15) || 15,
    createdAt: String(d.createdAt || d.created_at || new Date().toISOString()),
  }
}

function extractSchedulesArray(data: unknown): DailyScheduleItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data.map(normalizeScheduleItem).filter((s) => Boolean(s.id))
  if (typeof data === 'object') {
    const rec = data as Record<string, unknown>
    if (Array.isArray(rec.schedules)) return rec.schedules.map(normalizeScheduleItem).filter((s) => Boolean(s.id))
    if (Array.isArray(rec.data)) return rec.data.map(normalizeScheduleItem).filter((s) => Boolean(s.id))
    if (Array.isArray(rec.competitions)) return rec.competitions.map(normalizeScheduleItem).filter((s) => Boolean(s.id))
  }
  return []
}

export function ContentView() {
  const [activeTab, setActiveTab] = useState<'roster' | 'create'>('roster')

  // Real Database Schedules State (no fake initial items)
  const [schedules, setSchedules] = useState<DailyScheduleItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  // Form State
  const [competitionType, setCompetitionType] = useState<'tournament' | 'omb'>('tournament')
  const [game, setGame] = useState('BGMI')
  const [customGameName, setCustomGameName] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'Solo' | 'Duo' | 'Squad' | '1v1'>('Squad')

  // Financials & Slots
  const [entryFee, setEntryFee] = useState('50')
  const [maxSlots, setMaxSlots] = useState('100')
  const [prizePool, setPrizePool] = useState('3500')

  // Recurring Schedule Slots
  const [recurrence, setRecurrence] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily')
  const [dailySlots, setDailySlots] = useState<string[]>(['14:00', '18:00', '21:00'])
  const [newSlotTime, setNewSlotTime] = useState('12:00')
  const [revealTimeMinutes, setRevealTimeMinutes] = useState('15')

  // Submission state
  const [loading, setLoading] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function fetchSchedulesFromDB() {
    setLoadingList(true)
    setErrorMessage('')
    try {
      let list: DailyScheduleItem[] = []
      try {
        const data = await api<unknown>('/admin/competition/schedules')
        list = extractSchedulesArray(data)
      } catch {
        try {
          const altData = await api<unknown>('/competitions/schedules')
          list = extractSchedulesArray(altData)
        } catch {
          const opsData = await api<unknown>('/operations/schedules')
          list = extractSchedulesArray(opsData)
        }
      }
      setSchedules(list)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to connect to database for schedules.')
      setSchedules([])
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoadingList(true)
      try {
        let list: DailyScheduleItem[] = []
        try {
          const data = await api<unknown>('/admin/competition/schedules')
          list = extractSchedulesArray(data)
        } catch {
          try {
            const altData = await api<unknown>('/competitions/schedules')
            list = extractSchedulesArray(altData)
          } catch {
            const opsData = await api<unknown>('/operations/schedules')
            list = extractSchedulesArray(opsData)
          }
        }
        if (!ignore) {
          setSchedules(list)
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Database query failed.')
          setSchedules([])
        }
      } finally {
        if (!ignore) {
          setLoadingList(false)
        }
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  function handleAddSlot() {
    if (!newSlotTime) return
    if (!dailySlots.includes(newSlotTime)) {
      const updated = [...dailySlots, newSlotTime].sort()
      setDailySlots(updated)
    }
  }

  function handleRemoveSlot(slot: string) {
    setDailySlots(dailySlots.filter((s) => s !== slot))
  }

  function applyPreset(presetType: 'bgmi_prime' | 'ff_squad' | 'ludo_hourly' | 'omb_duel') {
    if (presetType === 'bgmi_prime') {
      setCompetitionType('tournament')
      setGame('BGMI')
      setTitle('BGMI Prime Squad')
      setMode('Squad')
      setEntryFee('50')
      setMaxSlots('100')
      setPrizePool('3500')
      setDailySlots(['12:00', '15:00', '18:00', '21:30'])
      setRevealTimeMinutes('15')
      setRecurrence('daily')
    } else if (presetType === 'ff_squad') {
      setCompetitionType('tournament')
      setGame('Free Fire MAX')
      setTitle('Free Fire Daily')
      setMode('Squad')
      setEntryFee('30')
      setMaxSlots('48')
      setPrizePool('1000')
      setDailySlots(['16:00', '19:00', '21:00'])
      setRevealTimeMinutes('15')
      setRecurrence('daily')
    } else if (presetType === 'ludo_hourly') {
      setCompetitionType('omb')
      setGame('Ludo King')
      setTitle('Ludo 1v1 Blitz')
      setMode('1v1')
      setEntryFee('20')
      setMaxSlots('2')
      setPrizePool('35')
      setDailySlots(['11:00', '14:00', '17:00', '20:00', '22:00'])
      setRevealTimeMinutes('5')
      setRecurrence('daily')
    } else if (presetType === 'omb_duel') {
      setCompetitionType('omb')
      setGame('BGMI')
      setTitle('BGMI 1v1 Duel')
      setMode('1v1')
      setEntryFee('50')
      setMaxSlots('2')
      setPrizePool('90')
      setDailySlots(['13:00', '16:00', '19:00', '21:00', '23:00'])
      setRevealTimeMinutes('5')
      setRecurrence('daily')
    }
  }

  async function handleToggleScheduleStatus(id: string, currentStatus: 'published' | 'draft' | 'closed') {
    const nextStatus: 'published' | 'draft' = currentStatus === 'published' ? 'draft' : 'published'
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/competition/schedules/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setSchedules((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      )
      setActionSuccess(`Schedule status updated to ${nextStatus}.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update schedule status in database.')
    }
  }

  async function handleDeleteSchedule(id: string) {
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/competition/schedules/${id}`, {
        method: 'DELETE',
      })
      setSchedules((prev) => prev.filter((s) => s.id !== id))
      setActionSuccess('Schedule removed from database.')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete schedule in database.')
    }
  }

  async function handleCreateSchedule(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    const effectiveGame = game === 'Custom' ? customGameName.trim() || 'Custom Game' : game
    const cleanTitle = title.trim() || `${effectiveGame} ${mode}`

    if (dailySlots.length === 0) {
      setErrorMessage('Please add at least one time slot.')
      setLoading(false)
      return
    }

    const payload = {
      title: cleanTitle,
      game: effectiveGame,
      type: competitionType,
      mode,
      entryFee: Number(entryFee) || 0,
      prizePool: Number(prizePool) || 0,
      maxParticipants: Number(maxSlots) || (mode === '1v1' ? 2 : 100),
      dailySlots,
      recurrence,
      roomRevealMinutesBeforeStart: Number(revealTimeMinutes) || 15,
      status: 'published' as const,
    }

    try {
      await api('/admin/competition/schedules', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setActionSuccess(`Schedule "${cleanTitle}" created in database.`)
      await fetchSchedulesFromDB()
      setActiveTab('roster')
      setTitle('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database error: failed to create schedule.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-container">
      <div className="view-header">
        <div>
          <h2>Daily Schedules</h2>
          <p>Recurring daily matches synchronized with database</p>
        </div>
        <div className="header-actions">
          <button
            className="secondary small-btn"
            onClick={fetchSchedulesFromDB}
            disabled={loadingList}
            title="Refresh database records"
          >
            <RefreshCw size={14} className={loadingList ? 'spinning' : ''} />
          </button>
          <button
            className={`tab-btn ${activeTab === 'roster' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <ListFilter size={14} /> Active ({schedules.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active-tab' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusCircle size={14} /> New Schedule
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

      {activeTab === 'roster' && (
        <>
          {loadingList ? (
            <div className="loading-card">
              <RefreshCw size={24} className="spinning" color="#aa3bff" />
              <p>Loading database schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="state-card">
              <div className="state-icon">
                <Gamepad2 size={32} color="#aa3bff" />
              </div>
              <h3>No Schedules in Database</h3>
              <p className="state-desc">
                No recurring match schedules are currently stored in the database. Click "New Schedule" to configure and publish recurring tournaments.
              </p>
              <button
                className="primary small-btn"
                onClick={() => setActiveTab('create')}
              >
                <Plus size={14} /> Create First Schedule
              </button>
            </div>
          ) : (
            <div className="schedules-grid">
              {schedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className={`schedule-card ${schedule.status === 'draft' ? 'draft' : ''}`}
                >
                  <div className="schedule-card-header">
                    <span className="game-badge">{schedule.game}</span>
                    <span
                      className={`status-pill ${
                        schedule.status === 'published' ? 'published' : 'draft'
                      }`}
                    >
                      {schedule.status === 'published' ? 'Active' : 'Draft'}
                    </span>
                  </div>

                  <h4 className="schedule-title">{schedule.title}</h4>

                  <div className="schedule-meta-row">
                    <span className="badge-tag">{schedule.type.toUpperCase()}</span>
                    <span className="badge-tag">{schedule.mode}</span>
                    <span className="badge-tag">{schedule.recurrence}</span>
                  </div>

                  {/* Daily Slots */}
                  <div className="schedule-slots-section">
                    <span className="slots-label">Daily Slots:</span>
                    <div className="slots-chip-list">
                      {schedule.dailySlots.map((slot) => (
                        <span className="time-chip" key={slot}>
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="schedule-stats-grid">
                    <div className="sstat">
                      <span>Entry Fee</span>
                      <strong>{schedule.entryFee} Coins</strong>
                    </div>
                    <div className="sstat">
                      <span>Prize Pool</span>
                      <strong>₹{schedule.prizePool}</strong>
                    </div>
                    <div className="sstat">
                      <span>Capacity</span>
                      <strong>{schedule.maxParticipants} slots</strong>
                    </div>
                  </div>

                  <div className="schedule-card-actions">
                    <button
                      type="button"
                      className="secondary small-btn"
                      onClick={() => handleToggleScheduleStatus(schedule.id, schedule.status)}
                    >
                      {schedule.status === 'published' ? (
                        <>
                          <PauseCircle size={13} /> Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle size={13} /> Activate
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="danger small-btn icon-only"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      title="Delete Schedule"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'create' && (
        <div className="schedule-create-view">
          {/* Quick Presets */}
          <div className="presets-bar">
            <span className="presets-title">
              <Sparkles size={14} color="#8b5cf6" /> Presets:
            </span>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset('bgmi_prime')}
            >
              BGMI Prime
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset('ff_squad')}
            >
              Free Fire
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset('ludo_hourly')}
            >
              Ludo 1v1
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset('omb_duel')}
            >
              1v1 Duel
            </button>
          </div>

          <form className="admin-form-card" onSubmit={handleCreateSchedule}>
            <div className="form-grid">
              <label>
                Type
                <select
                  value={competitionType}
                  onChange={(e) =>
                    setCompetitionType(e.target.value as 'tournament' | 'omb')
                  }
                >
                  <option value="tournament">Tournament (Multiplayer)</option>
                  <option value="omb">OMB (1v1)</option>
                </select>
              </label>

              <label>
                Game
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                >
                  <option value="BGMI">BGMI</option>
                  <option value="Free Fire MAX">Free Fire MAX</option>
                  <option value="Call of Duty: Mobile">Call of Duty: Mobile</option>
                  <option value="Ludo King">Ludo King</option>
                  <option value="Custom">Custom Game</option>
                </select>
              </label>

              {game === 'Custom' && (
                <label>
                  Custom Game Name
                  <input
                    required
                    type="text"
                    placeholder="Game title"
                    value={customGameName}
                    onChange={(e) => setCustomGameName(e.target.value)}
                  />
                </label>
              )}

              <label>
                Schedule Title
                <input
                  type="text"
                  placeholder="e.g. BGMI Daily Squad"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label>
                Mode
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as 'Solo' | 'Duo' | 'Squad' | '1v1')
                  }
                >
                  <option value="Solo">Solo</option>
                  <option value="Duo">Duo</option>
                  <option value="Squad">Squad</option>
                  <option value="1v1">1v1</option>
                </select>
              </label>

              <label>
                Entry Fee (Coins)
                <input
                  required
                  type="number"
                  min="0"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                />
              </label>

              <label>
                Prize Pool (₹)
                <input
                  required
                  type="number"
                  min="0"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                />
              </label>

              <label>
                Max Slots
                <input
                  required
                  type="number"
                  min="2"
                  value={maxSlots}
                  onChange={(e) => setMaxSlots(e.target.value)}
                />
              </label>

              <label>
                Recurrence
                <select
                  value={recurrence}
                  onChange={(e) =>
                    setRecurrence(e.target.value as 'daily' | 'weekdays' | 'weekends' | 'custom')
                  }
                >
                  <option value="daily">Daily (Every Day)</option>
                  <option value="weekdays">Weekdays (Mon-Fri)</option>
                  <option value="weekends">Weekends (Sat-Sun)</option>
                </select>
              </label>
            </div>

            {/* Daily Slots */}
            <div className="multi-slots-box">
              <span className="slots-header-label">Daily Time Slots ({dailySlots.length}):</span>
              <div className="slots-chip-editor">
                {dailySlots.map((slot) => (
                  <span className="editable-time-chip" key={slot}>
                    {slot}
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(slot)}
                      title="Remove Slot"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="add-slot-row">
                <input
                  type="time"
                  className="time-input"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                />
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={handleAddSlot}
                >
                  <Plus size={13} /> Add Slot
                </button>
              </div>
            </div>

            <div className="form-actions-row">
              <button
                type="button"
                className="secondary"
                onClick={() => setActiveTab('roster')}
              >
                Cancel
              </button>
              <button type="submit" className="primary" disabled={loading}>
                {loading ? 'Saving to Database...' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
