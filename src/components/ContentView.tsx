import { useState } from 'react'
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
} from 'lucide-react'

const DEFAULT_SCHEDULES: DailyScheduleItem[] = [
  {
    id: 'sch_bgmi_daily_squad',
    game: 'BGMI',
    title: 'BGMI Mega Squad Battle',
    type: 'tournament',
    mode: 'Squad',
    entryFee: 50,
    maxParticipants: 100,
    prizePool: 3500,
    dailySlots: ['14:00', '18:00', '21:30'],
    recurrence: 'daily',
    status: 'published',
    roomRevealMinutesBeforeStart: 15,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sch_bgmi_solo_omb',
    game: 'BGMI',
    title: 'BGMI 1v1 Cash Duel',
    type: 'omb',
    mode: '1v1',
    entryFee: 30,
    maxParticipants: 2,
    prizePool: 50,
    dailySlots: ['12:00', '15:00', '19:00', '22:00'],
    recurrence: 'daily',
    status: 'published',
    roomRevealMinutesBeforeStart: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sch_ff_squad_daily',
    game: 'Free Fire MAX',
    title: 'Free Fire Daily Squad Cup',
    type: 'tournament',
    mode: 'Squad',
    entryFee: 40,
    maxParticipants: 48,
    prizePool: 1500,
    dailySlots: ['16:00', '20:00'],
    recurrence: 'daily',
    status: 'published',
    roomRevealMinutesBeforeStart: 15,
    createdAt: new Date().toISOString(),
  },
]

export function ContentView() {
  const [activeTab, setActiveTab] = useState<'roster' | 'create'>('roster')

  // Preserved Daily Schedules
  const [schedules, setSchedules] = useState<DailyScheduleItem[]>(() => {
    try {
      const stored = localStorage.getItem('pw_daily_schedules')
      if (stored) return JSON.parse(stored) as DailyScheduleItem[]
    } catch {
      // ignore
    }
    return DEFAULT_SCHEDULES
  })

  function saveSchedules(list: DailyScheduleItem[]) {
    setSchedules(list)
    try {
      localStorage.setItem('pw_daily_schedules', JSON.stringify(list))
    } catch {
      // ignore
    }
  }

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

  function handleAddSlot() {
    if (!newSlotTime) return
    if (!dailySlots.includes(newSlotTime)) {
      const updated作成 = [...dailySlots, newSlotTime].sort()
      setDailySlots(updated作成)
    }
  }

  function handleRemoveSlot(slot: string) {
    setDailySlots(dailySlots.filter((s) => s !== slot))
  }

  function applyPreset的的(presetType: 'bgmi_prime' | 'ff_squad' | 'ludo_hourly' | 'omb_duel') {
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

  function handleToggleScheduleStatus(id: string) {
    const updated: DailyScheduleItem[] = schedules.map((item) => {
      if (item.id === id) {
        const nextStatus: 'published' | 'draft' = item.status === 'published' ? 'draft' : 'published'
        return { ...item, status: nextStatus }
      }
      return item
    })
    saveSchedules(updated)
    setActionSuccess('Schedule status updated.')
  }

  function handleDeleteSchedule(id: string) {
    const updated = schedules.filter((s) => s.id !== id)
    saveSchedules(updated)
    setActionSuccess('Schedule removed.')
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
      let createdId = `sch_${Date.now()}`
      try {
        const res = await api<{ id?: string }>('/admin/competition/schedules', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (res && res.id) createdId = res.id
      } catch {
        // preserve locally
      }

      const newSchedule: DailyScheduleItem = {
        id: createdId,
        game: effectiveGame,
        title: cleanTitle,
        type: competitionType,
        mode,
        entryFee: Number(entryFee) || 0,
        prizePool: Number(prizePool) || 0,
        maxParticipants: Number(maxSlots) || (mode === '1v1' ? 2 : 100),
        dailySlots,
        recurrence,
        roomRevealMinutesBeforeStart: Number(revealTimeMinutes) || 15,
        status: 'published',
        createdAt: new Date().toISOString(),
      }

      const updated = [newSchedule, ...schedules]
      saveSchedules(updated)
      setActionSuccess(`Schedule "${cleanTitle}" created.`)
      setActiveTab('roster')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create schedule.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content-container">
      <div className="view-header">
        <div>
          <h2>Daily Schedules</h2>
          <p>Recurring daily matches and tournaments</p>
        </div>
        <div className="header-actions">
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
                  onClick={() => handleToggleScheduleStatus(schedule.id)}
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
              onClick={() => applyPreset的的('bgmi_prime')}
            >
              BGMI Prime
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset的的('ff_squad')}
            >
              Free Fire
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset的的('ludo_hourly')}
            >
              Ludo 1v1
            </button>
            <button
              type="button"
              className="preset-chip"
              onClick={() => applyPreset的的('omb_duel')}
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
                {loading ? 'Creating...' : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
