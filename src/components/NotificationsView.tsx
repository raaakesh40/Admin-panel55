import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { NotificationBroadcast } from '../types'
import { api } from '../services/api'
import { Send, Sparkles, CheckCircle2, AlertCircle, Clock, RefreshCw, Bell } from 'lucide-react'

function normalizeNotification(raw: unknown): NotificationBroadcast {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rawAudience = String(d.targetAudience || d.audience || d.target || 'all')
  const targetAudience: 'all' | 'active_players' | 'hosts' | 'specific_user' =
    rawAudience === 'active_players' || rawAudience === 'hosts' || rawAudience === 'specific_user'
      ? rawAudience
      : 'all'

  return {
    id: String(d.id || d._id || ''),
    title: String(d.title || 'Notification'),
    message: String(d.message || d.body || ''),
    targetAudience,
    targetUserId: d.targetUserId || d.userId ? String(d.targetUserId || d.userId) : undefined,
    type: String(d.type || 'announcement'),
    priority: String(d.priority || 'normal'),
    sentAt: String(d.sentAt || d.createdAt || d.created_at || new Date().toISOString()),
    deliveredCount: typeof d.deliveredCount === 'number' ? d.deliveredCount : typeof d.recipients === 'number' ? d.recipients : undefined,
  }
}

function extractNotificationsArray(data: unknown): NotificationBroadcast[] {
  if (!data) return []
  if (Array.isArray(data)) return data.map(normalizeNotification).filter((n) => Boolean(n.id))
  if (typeof data === 'object') {
    const rec = data as Record<string, unknown>
    if (Array.isArray(rec.notifications)) return rec.notifications.map(normalizeNotification).filter((n) => Boolean(n.id))
    if (Array.isArray(rec.data)) return rec.data.map(normalizeNotification).filter((n) => Boolean(n.id))
    if (Array.isArray(rec.broadcasts)) return rec.broadcasts.map(normalizeNotification).filter((n) => Boolean(n.id))
  }
  return []
}

export function NotificationsView() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetAudience, setTargetAudience] = useState<'all' | 'active_players' | 'hosts' | 'specific_user'>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [notificationType, setNotificationType] = useState<'announcement' | 'match_alert' | 'bonus' | 'maintenance'>('announcement')
  const [priority, setPriority] = useState<'high' | 'normal'>('high')

  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const [history, setHistory] = useState<NotificationBroadcast[]>([])

  async function fetchHistoryFromDB() {
    setHistoryLoading(true)
    try {
      let list: NotificationBroadcast[] = []
      try {
        const data = await api<unknown>('/admin/notifications')
        list = extractNotificationsArray(data)
      } catch {
        try {
          const altData = await api<unknown>('/notifications/history')
          list = extractNotificationsArray(altData)
        } catch {
          const opsData = await api<unknown>('/operations/notifications')
          list = extractNotificationsArray(opsData)
        }
      }
      setHistory(list)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      setHistoryLoading(true)
      try {
        let list: NotificationBroadcast[] = []
        try {
          const data = await api<unknown>('/admin/notifications')
          list = extractNotificationsArray(data)
        } catch {
          try {
            const altData = await api<unknown>('/notifications/history')
            list = extractNotificationsArray(altData)
          } catch {
            const opsData = await api<unknown>('/operations/notifications')
            list = extractNotificationsArray(opsData)
          }
        }
        if (!ignore) {
          setHistory(list)
        }
      } catch {
        if (!ignore) {
          setHistory([])
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false)
        }
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  function applyTemplate(template: 'tournament' | 'maintenance' | 'bonus') {
    if (template === 'tournament') {
      setTitle('Tournament Live!')
      setMessage('BGMI & Free Fire matches starting now. Join before slots close!')
      setNotificationType('match_alert')
      setPriority('high')
    } else if (template === 'maintenance') {
      setTitle('Maintenance Notice')
      setMessage('Brief server maintenance at 03:00 AM. Wallets and matches remain safe.')
      setNotificationType('maintenance')
      setPriority('high')
    } else if (template === 'bonus') {
      setTitle('Deposit Bonus')
      setMessage('Add 500 or more Play Coins today and get 100 Bonus Coins instantly!')
      setNotificationType('bonus')
      setPriority('normal')
    }
  }

  async function handleSendBroadcast(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    const cleanTitle = title.trim()
    const cleanMsg = message.trim()

    const target = targetAudience === 'active_players' ? 'active' : targetAudience === 'hosts' ? 'hosts' : targetAudience === 'specific_user' ? 'users' : 'all'

    const payload: Record<string, unknown> = {
      title: cleanTitle,
      body: cleanMsg,
      message: cleanMsg,
      target,
      targetAudience,
      type: notificationType,
      priority,
      data: {
        type: notificationType,
        priority,
      },
    }

    if (targetAudience === 'specific_user') {
      if (!targetUserId.trim()) {
        setErrorMessage('User ID is required.')
        setLoading(false)
        return
      }
      payload.userId = targetUserId.trim()
      payload.targetUserId = targetUserId.trim()
    }

    try {
      const res = await api<{ recipients?: number; count?: number }>('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const recipientCount = res?.recipients ?? res?.count
      setActionSuccess(
        `Notification successfully broadcast${
          typeof recipientCount === 'number' ? ` to ${recipientCount} recipients` : ''
        }.`
      )
      setTitle('')
      setMessage('')
      await fetchHistoryFromDB()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send broadcast.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="notifications-container">
      <div className="view-header">
        <div>
          <h2>Notifications</h2>
          <p>Send instant announcements and match alerts to users</p>
        </div>
        <button
          className="secondary small-btn"
          onClick={fetchHistoryFromDB}
          disabled={historyLoading}
          title="Refresh history"
        >
          <RefreshCw size={14} className={historyLoading ? 'spinning' : ''} />
        </button>
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

      {/* Presets */}
      <div className="presets-bar">
        <span className="presets-title">
          <Sparkles size={14} color="#aa3bff" /> Quick Templates:
        </span>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyTemplate('tournament')}
        >
          Tournament
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyTemplate('maintenance')}
        >
          Maintenance
        </button>
        <button
          type="button"
          className="preset-chip"
          onClick={() => applyTemplate('bonus')}
        >
          Bonus
        </button>
      </div>

      <div className="broadcast-layout">
        <form className="admin-form-card" onSubmit={handleSendBroadcast}>
          <div className="form-grid">
            <label>
              Audience
              <select
                value={targetAudience}
                onChange={(e) =>
                  setTargetAudience(
                    e.target.value as 'all' | 'active_players' | 'hosts' | 'specific_user'
                  )
                }
              >
                <option value="all">All Players</option>
                <option value="active_players">Active Players</option>
                <option value="hosts">Hosts Only</option>
                <option value="specific_user">Single User</option>
              </select>
            </label>

            <label>
              Type
              <select
                value={notificationType}
                onChange={(e) =>
                  setNotificationType(
                    e.target.value as 'announcement' | 'match_alert' | 'bonus' | 'maintenance'
                  )
                }
              >
                <option value="announcement">Announcement</option>
                <option value="match_alert">Match Alert</option>
                <option value="bonus">Reward / Bonus</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>

            {targetAudience === 'specific_user' && (
              <label>
                User ID
                <input
                  required
                  type="text"
                  placeholder="Target User ID"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </label>
            )}

            <label>
              Title
              <input
                required
                type="text"
                placeholder="Notification Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>

          <label>
            Message
            <textarea
              required
              rows={3}
              placeholder="Notification body..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          <div className="form-actions-row">
            <button type="submit" className="primary" disabled={loading}>
              <Send size={14} />
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </form>

        {/* History List */}
        <div className="broadcast-history-card">
          <h4>Broadcast History ({history.length})</h4>
          {historyLoading ? (
            <div className="loading-inline">
              <RefreshCw size={16} className="spinning" color="#aa3bff" />
              <span>Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-history-box">
              <Bell size={24} color="#888" />
              <p className="history-empty">No broadcast history found.</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div className="history-item" key={item.id}>
                  <div className="history-item-top">
                    <strong>{item.title}</strong>
                    <span className="badge-tag">{item.type}</span>
                  </div>
                  <p>{item.message}</p>
                  <div className="history-item-meta">
                    <Clock size={12} />
                    <span>
                      {new Date(item.sentAt).toLocaleDateString()} {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span>Target: {item.targetAudience}</span>
                    {typeof item.deliveredCount === 'number' && (
                      <>
                        <span>•</span>
                        <span>Delivered: {item.deliveredCount}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
