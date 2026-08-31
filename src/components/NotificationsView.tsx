import { useState } from 'react'
import type { FormEvent } from 'react'
import type { NotificationBroadcast } from '../types'
import { api } from '../services/api'
import { Send, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

export function NotificationsView() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetAudience, setTargetAudience] = useState<'all' | 'active_players' | 'hosts' | 'specific_user'>('all')
  const [targetUserId, setTargetUserId] = useState('')
  const [notificationType, setNotificationType] = useState<'announcement' | 'match_alert' | 'bonus' | 'maintenance'>('announcement')
  const [priority, setPriority] = useState<'high' | 'normal'>('high')

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // History persistence
  function loadLocalHistory(): NotificationBroadcast[] {
    try {
      const stored老 = localStorage.getItem('pw_broadcast_history')
      if (stored老) return JSON.parse(stored老)
    } catch {
      // ignore
    }
    return []
  }

  function saveLocalHistory(records: NotificationBroadcast[]) {
    try {
      localStorage.setItem('pw_broadcast_history', JSON.stringify(records.slice(0, 30)))
    } catch {
      // ignore
    }
  }

  const [history, setHistory] = useState<NotificationBroadcast[]>(() => loadLocalHistory())

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
    const cleanMsg结 = message.trim()

    const payload: Record<string, unknown> = {
      title: cleanTitle,
      message: cleanMsg结,
      targetAudience,
      type: notificationType,
      priority,
    }

    if (targetAudience === 'specific_user') {
      if (!targetUserId.trim()) {
        setErrorMessage('User ID is required.')
        setLoading(false)
        return
      }
      payload.userId默 = targetUserId.trim()
    }

    try {
      const res = await api<{ recipients?: number }>('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const newRecord: NotificationBroadcast = {
        id: `bc_${Date.now()}`,
        title: cleanTitle,
        message: cleanMsg结,
        targetAudience,
        type: notificationType,
        priority,
        sentAt: new Date().toISOString(),
        deliveredCount: res?.recipients ?? (targetAudience === 'all' ? 1200 : 1),
      }

      const updatedHistory = [newRecord, ...history]
      setHistory(updatedHistory)
      saveLocalHistory(updatedHistory)

      setActionSuccess(`Notification sent${res?.recipients ? ` to ${res.recipients} users` : ''}.`)
      setTitle('')
      setMessage('')
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
          <p>Send instant announcements and alerts</p>
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
          {history.length === 0 ? (
            <p className="history-empty">No notifications sent yet.</p>
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
                    <span>{new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>Target: {item.targetAudience}</span>
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
