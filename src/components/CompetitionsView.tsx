import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { CompetitionItem } from '../types'
import { api } from '../services/api'
import { Search, Key, Users, Trophy, AlertCircle, CheckCircle2 } from 'lucide-react'

function normalizeCompetition(data: unknown): CompetitionItem {
  if (!data || typeof data !== 'object') {
    return {
      id: String(Math.random()),
      code: 'MATCH',
      type: 'tournament',
      game: 'Custom Game',
      title: 'Match',
      mode: 'Solo',
      entryFee: 0,
      prizePool: 0,
      status: 'upcoming',
      maxSlots: 100,
      joinedSlots: 0,
      scheduleTime: 'Scheduled',
      roomId: '',
      roomPassword: '',
      hostName: 'Platform Host',
    }
  }

  const d = data as Record<string, unknown>
  return {
    id: String(d.id || d._id || Math.random()),
    code: String(d.code || d.matchCode || d.match_code || 'MATCH'),
    type: String(d.type || 'tournament').toLowerCase().includes('omb') ? 'omb' : 'tournament',
    game: String(d.game || d.gameTitle || d.game_title || 'Custom Game'),
    title: String(d.title || d.name || 'Match'),
    mode: (d.mode as 'Solo' | 'Duo' | 'Squad' | '1v1') || 'Solo',
    entryFee: Number(d.entryFee ?? d.entry_fee ?? d.fee ?? 0) || 0,
    prizePool: Number(d.prizePool ?? d.prize_pool ?? d.prize ?? 0) || 0,
    status: (d.status as 'upcoming' | 'open' | 'live' | 'completed' | 'cancelled') || 'upcoming',
    maxSlots: Number(d.maxSlots ?? d.max_slots ?? d.slots ?? 100) || 100,
    joinedSlots: Number(d.joinedSlots ?? d.joined_slots ?? d.participants ?? 0) || 0,
    scheduleTime: String(d.scheduleTime || d.schedule_time || d.scheduledAt || 'Scheduled'),
    roomId: String(d.roomId || d.room_id || ''),
    roomPassword: String(d.roomPassword || d.room_password || ''),
    hostName: String(d.hostName || d.host_name || d.host || 'Platform Host'),
  }
}

function extractCompArray(data: unknown): CompetitionItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data.map(normalizeCompetition)
  if (typeof data === 'object') {
    const r = data as Record<string, unknown>
    if (Array.isArray(r.competitions)) return r.competitions.map(normalizeCompetition)
    if (Array.isArray(r.data)) return r.data.map(normalizeCompetition)
    if (Array.isArray(r.matches)) return r.matches.map(normalizeCompetition)
  }
  return []
}

export function CompetitionsView() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<CompetitionItem | null>(null)
  const [rawResult, setRawResult] = useState<Record<string, unknown> | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Filter state for competition categories
  const [filterType, setFilterType] = useState<'all' | 'omb' | 'tournament'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all')

  // Genuine database competitions list
  const [competitionsList, setCompetitionsList] = useState<CompetitionItem[]>([])
  const [listLoading, setListLoading] = useState(false)

  async function fetchCompetitionsList() {
    setListLoading(true)
    try {
      let comps: CompetitionItem[] = []
      try {
        const data = await api<unknown>('/operations/competitions')
        comps = extractCompArray(data)
      } catch {
        const fbData = await api<unknown>('/admin/competitions')
        comps = extractCompArray(fbData)
      }
      setCompetitionsList(comps)
    } catch {
      setCompetitionsList([])
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        let comps: CompetitionItem[] = []
        try {
          const data = await api<unknown>('/operations/competitions')
          comps = extractCompArray(data)
        } catch {
          const fbData = await api<unknown>('/admin/competitions')
          comps = extractCompArray(fbData)
        }
        if (!ignore) {
          setCompetitionsList(comps)
        }
      } catch {
        if (!ignore) {
          setCompetitionsList([])
        }
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  // Room modal state
  const [activeRoomMatch, setActiveRoomMatch] = useState<CompetitionItem | null>(null)
  const [roomInputId, setRoomInputId] = useState('')
  const [roomInputPass, setRoomInputPass] = useState('')
  const [roomLoading, setRoomLoading] = useState(false)

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    setErrorMessage('')
    setActionSuccess('')
    setSearchResult(null)
    setRawResult(null)
    setLoading(true)

    try {
      const clean = identifier.trim()
      const data = await api<Record<string, unknown>>(
        `/operations/competitions/search?identifier=${encodeURIComponent(clean)}`
      )
      setRawResult(data)

      // Normalize result if standard competition shape
      if (data && typeof data === 'object') {
        const item: CompetitionItem = {
          id: String(data.id || clean),
          code: String(data.code || data.matchCode || clean),
          type: (data.type as 'omb' | 'tournament') || 'tournament',
          game: String(data.game || data.gameTitle || 'Custom Game'),
          title: String(data.title || data.name || `Match ${clean}`),
          mode: (data.mode as 'Solo' | 'Duo' | 'Squad' | '1v1') || 'Solo',
          entryFee: Number(data.entryFee || data.fee || 0),
          prizePool: Number(data.prizePool || data.prize || 0),
          status: (data.status as 'upcoming' | 'open' | 'live' | 'completed' | 'cancelled') || 'upcoming',
          maxSlots: Number(data.maxSlots || data.slots || 100),
          joinedSlots: Number(data.joinedSlots || data.participants || 0),
          scheduleTime: String(data.scheduleTime || data.scheduledAt || 'Scheduled'),
          roomId: String(data.roomId || ''),
          roomPassword: String(data.roomPassword || ''),
          hostName: String(data.hostName || 'Platform Host'),
        }
        setSearchResult(item)
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Competition record not found in database.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveRoomCredentials(e: FormEvent) {
    e.preventDefault()
    if (!activeRoomMatch) return
    setRoomLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/competitions/${activeRoomMatch.id}/room`, {
        method: 'POST',
        body: JSON.stringify({
          roomId: roomInputId,
          roomPassword: roomInputPass,
        }),
      })

      setActionSuccess(`Room credentials published to database for match ${activeRoomMatch.code}`)
      setActiveRoomMatch(null)
      await fetchCompetitionsList()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish room credentials on server.')
    } finally {
      setRoomLoading(false)
    }
  }

  function openRoomModal(match: CompetitionItem) {
    setActiveRoomMatch(match)
    setRoomInputId(match.roomId || '')
    setRoomInputPass(match.roomPassword || '')
  }

  const filteredMatches = competitionsList.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    return true
  })

  return (
    <div className="competitions-container">
      <div className="page-intro with-action">
        <div>
          <span className="eyebrow">MATCHES & TOURNAMENTS</span>
          <h2>Competition Operations</h2>
          <p>Search match records, publish room credentials (ID/Password), and track participant slots in real-time.</p>
        </div>
      </div>

      <form className="search-form-card" onSubmit={handleSearch}>
        <div className="search-input-group">
          <Search size={18} className="search-icon" />
          <input
            required
            type="text"
            placeholder="Search by Match ID, Tournament Code (e.g. BGMI-SOLO-99), or record ID..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Lookup Record'}
        </button>
      </form>

      {errorMessage && (
        <div className="alert-card error">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="alert-card success">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {searchResult && (
        <div className="search-result-block">
          <div className="result-header">
            <h3>Record Found: {searchResult.code}</h3>
            <button className="secondary small-btn" onClick={() => setSearchResult(null)}>
              ✕ Close Detail
            </button>
          </div>

          <div className="match-card highlighted">
            <div className="match-top">
              <div>
                <span className="badge-tag">{searchResult.game}</span>
                <h4>{searchResult.title}</h4>
                <small className="match-code">Code: {searchResult.code} • Mode: {searchResult.mode}</small>
              </div>
              <span className={`status-pill ${searchResult.status}`}>
                {searchResult.status.toUpperCase()}
              </span>
            </div>

            <div className="match-meta-grid">
              <div className="meta-box">
                <span>Entry Fee</span>
                <strong>{searchResult.entryFee} Play Coins</strong>
              </div>
              <div className="meta-box">
                <span>Prize Pool</span>
                <strong className="text-green">₹{searchResult.prizePool.toLocaleString()}</strong>
              </div>
              <div className="meta-box">
                <span>Slots Filled</span>
                <strong>
                  {searchResult.joinedSlots} / {searchResult.maxSlots}
                </strong>
              </div>
              <div className="meta-box">
                <span>Schedule</span>
                <strong>{searchResult.scheduleTime}</strong>
              </div>
            </div>

            <div className="room-info-strip">
              <div className="room-details">
                <Key size={16} color="#aa3bff" />
                <span>
                  Room ID: <b>{searchResult.roomId || 'Not set yet'}</b> | Password:{' '}
                  <b>{searchResult.roomPassword || 'None'}</b>
                </span>
              </div>
              <button
                className="secondary small-btn"
                onClick={() => openRoomModal(searchResult)}
              >
                Update Room ID / Pass
              </button>
            </div>
          </div>

          {rawResult && (
            <details className="raw-json-details">
              <summary>View Complete Database Payload (JSON)</summary>
              <pre className="record-json">{JSON.stringify(rawResult, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="section-divider">
        <div>
          <span className="eyebrow">ACTIVE COMPETITION FEED</span>
          <h3>Live & Upcoming Matches</h3>
        </div>
        <div className="filters-row">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'omb' | 'tournament')}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="tournament">Tournaments</option>
            <option value="omb">OMB (1v1 Matches)</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as 'all' | 'upcoming' | 'live' | 'completed')
            }
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {filteredMatches.length === 0 && !listLoading ? (
        <div className="state-card">
          <div className="state-icon">
            <Trophy size={36} color="#ffa800" />
          </div>
          <h3>No Match Records in Database</h3>
          <p className="state-desc">
            No live or upcoming competitions are currently stored in your database. You can schedule and publish matches from the Match Creation tab.
          </p>
        </div>
      ) : (
        <div className="matches-grid">
          {filteredMatches.map((match) => (
            <article className="match-card" key={match.id}>
              <div className="match-top">
                <div>
                  <span className="badge-tag">{match.game}</span>
                  <h4>{match.title}</h4>
                  <small className="match-code">
                    Code: <b>{match.code}</b> • Mode: {match.mode}
                  </small>
                </div>
                <span className={`status-pill ${match.status}`}>
                  {match.status.toUpperCase()}
                </span>
              </div>

              <div className="match-meta-grid">
                <div className="meta-box">
                  <span>Fee</span>
                  <strong>{match.entryFee} Coins</strong>
                </div>
                <div className="meta-box">
                  <span>Prize</span>
                  <strong className="text-green">₹{match.prizePool}</strong>
                </div>
                <div className="meta-box">
                  <span>Slots</span>
                  <strong>
                    {match.joinedSlots}/{match.maxSlots}
                  </strong>
                </div>
                <div className="meta-box">
                  <span>Time</span>
                  <strong>{match.scheduleTime}</strong>
                </div>
              </div>

              <div className="match-footer">
                <div className="host-info">
                  <Users size={14} />
                  <span>Host: {match.hostName}</span>
                </div>
                <button
                  className="secondary small-btn"
                  onClick={() => openRoomModal(match)}
                >
                  <Key size={12} /> {match.roomId ? 'Edit Room' : 'Set Room'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Room Modal */}
      {activeRoomMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Publish Room Credentials</h3>
              <button className="close-btn" onClick={() => setActiveRoomMatch(null)}>
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Set custom Room ID and Password for match: <b>{activeRoomMatch.code}</b>. This will be automatically revealed to registered participants.
            </p>
            <form onSubmit={handleSaveRoomCredentials} className="modal-form">
              <label>
                Room ID / Custom Room Code
                <input
                  required
                  type="text"
                  placeholder="e.g. 7482910"
                  value={roomInputId}
                  onChange={(e) => setRoomInputId(e.target.value)}
                />
              </label>

              <label>
                Room Password
                <input
                  type="text"
                  placeholder="e.g. 1234 or leave empty"
                  value={roomInputPass}
                  onChange={(e) => setRoomInputPass(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveRoomMatch(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={roomLoading}>
                  {roomLoading ? 'Publishing...' : 'Publish to Players'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
