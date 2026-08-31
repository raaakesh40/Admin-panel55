import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Host } from '../types'
import { api } from '../services/api'
import { UserPlus, IndianRupee, Key, ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Trash2, Shield } from 'lucide-react'

function normalizeHost(raw: unknown): Host | null {
  if (!raw || typeof raw !== 'object') return null

  const r = raw as Record<string, unknown>
  const id = String(r.id || r._id || r.userId || r.hostId || '')
  if (!id) return null

  const username = String(r.username || r.name || 'host')
  const name = String(r.name || r.username || 'Host')
  const mobileNumber = r.mobileNumber || r.mobile_number || r.phone ? String(r.mobileNumber || r.mobile_number || r.phone) : ''
  const upiId = r.upiId || r.upi_id ? String(r.upiId || r.upi_id) : ''
  const assignedGame = String(r.assignedGame || r.assigned_game || r.game || 'BGMI')
  const rawRole = String(r.role || 'tournament').toLowerCase()
  const role = rawRole.includes('omb') ? 'omb' : 'tournament'
  const rawStatus = String(r.status || 'active').toLowerCase()
  const status = rawStatus === 'suspended' || rawStatus === 'inactive' ? 'suspended' : 'active'

  const totalMatchesHosted = Number(r.totalMatchesHosted ?? r.total_matches_hosted ?? r.matchesCount ?? 0) || 0
  const unpaidCommission = Number(r.unpaidCommission ?? r.unpaid_commission ?? r.unpaidBalance ?? r.balance ?? 0) || 0
  const totalEarned = Number(r.totalEarned ?? r.total_earned ?? r.earned ?? 0) || 0
  const commissionRate = Number(r.commissionRate ?? r.commission_rate ?? r.commission ?? 10) || 10
  const assignedTournaments = Array.isArray(r.assignedTournaments) ? (r.assignedTournaments as string[]) : []
  const createdAt = String(r.createdAt || r.created_at || new Date().toISOString())

  return {
    id,
    name,
    username,
    mobileNumber,
    upiId,
    assignedGame,
    role,
    status,
    totalMatchesHosted,
    unpaidCommission,
    totalEarned,
    commissionRate,
    assignedTournaments,
    createdAt,
  }
}

function extractHostArray(data: unknown): Host[] {
  if (!data) return []
  if (Array.isArray(data)) {
    return data.map(normalizeHost).filter((h): h is Host => h !== null)
  }
  if (typeof data === 'object') {
    const rec = data as Record<string, unknown>
    if (Array.isArray(rec.hosts)) {
      return rec.hosts.map(normalizeHost).filter((h): h is Host => h !== null)
    }
    if (Array.isArray(rec.data)) {
      return rec.data.map(normalizeHost).filter((h): h is Host => h !== null)
    }
    if (Array.isArray(rec.users)) {
      return rec.users.map(normalizeHost).filter((h): h is Host => h !== null)
    }
  }
  return []
}

export function HostsView() {
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Add Host Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newHostName, setNewHostName] = useState('')
  const [newHostUsername, setNewHostUsername] = useState('')
  const [newHostMobile, setNewHostMobile] = useState('')
  const [newHostUpiId, setNewHostUpiId] = useState('')
  const [newHostPassword, setNewHostPassword] = useState('')
  const [newHostGame, setNewHostGame] = useState('BGMI')
  const [newHostRole, setNewHostRole] = useState<'tournament' | 'omb'>('tournament')
  const [newHostCommission, setNewHostCommission] = useState('10')
  const [addLoading, setAddLoading] = useState(false)

  // Pay Host Modal
  const [activePayHost, setActivePayHost] = useState<Host | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('UPI')
  const [payRef, setPayRef] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  // Reset Password Modal
  const [activeResetHost, setActiveResetHost] = useState<Host | null>(null)
  const [resetPassInput, setResetPassInput] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Delete Host Modal
  const [hostToDelete, setHostToDelete] = useState<Host | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function fetchHostsList() {
    setLoading(true)
    setErrorMessage('')
    try {
      let hostList: Host[] = []
      try {
        const data = await api<unknown>('/hosts')
        hostList = extractHostArray(data)
      } catch {
        const fallbackData = await api<unknown>('/admin/hosts')
        hostList = extractHostArray(fallbackData)
      }

      setHosts(hostList)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not query database for hosts.'
      setErrorMessage(msg)
      setHosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      try {
        let hostList: Host[] = []
        try {
          const data = await api<unknown>('/hosts')
          hostList = extractHostArray(data)
        } catch {
          const fallbackData = await api<unknown>('/admin/hosts')
          hostList = extractHostArray(fallbackData)
        }

        if (!ignore) {
          setHosts(hostList)
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Could not fetch hosts from database.'
          setErrorMessage(msg)
          setHosts([])
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  async function handleCreateHost(e: FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api('/admin/hosts', {
        method: 'POST',
        body: JSON.stringify({
          name: newHostName.trim(),
          username: newHostUsername.trim(),
          mobileNumber: newHostMobile.trim(),
          upiId: newHostUpiId.trim(),
          password: newHostPassword,
          assignedGame: newHostGame,
          role: newHostRole,
          commissionRate: Number(newHostCommission) || 10,
        }),
      })

      setActionSuccess(`Host "${newHostName}" created in database.`)
      setShowAddModal(false)
      setNewHostName('')
      setNewHostUsername('')
      setNewHostMobile('')
      setNewHostUpiId('')
      setNewHostPassword('')
      await fetchHostsList()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database error: Failed to create host.')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleToggleStatus(host: Host) {
    const nextStatus = host.status === 'active' ? 'suspended' : 'active'
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${host.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })

      setHosts((prev) =>
        prev.map((h) => (h.id === host.id ? { ...h, status: nextStatus } : h))
      )
      setActionSuccess(`Host ${host.name} marked ${nextStatus} in database.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update host status in database.')
    }
  }

  async function handleSettlePayment(e: FormEvent) {
    e.preventDefault()
    if (!activePayHost || !payAmount || Number(payAmount) <= 0) return
    setPayLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      const amt = Number(payAmount)
      await api(`/admin/hosts/${activePayHost.id}/payout`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          method: payMethod,
          referenceId: payRef.trim(),
        }),
      })

      setHosts((prev) =>
        prev.map((h) =>
          h.id === activePayHost.id
            ? {
                ...h,
                unpaidCommission: Math.max(0, h.unpaidCommission - amt),
                totalEarned: h.totalEarned + amt,
              }
            : h
        )
      )

      setActionSuccess(`Settlement of ₹${amt} with ${activePayHost.name} recorded in database.`)
      setActivePayHost(null)
      setPayAmount('')
      setPayRef('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database error: Settlement failed.')
    } finally {
      setPayLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!activeResetHost || !resetPassInput) return
    setResetLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${activeResetHost.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: resetPassInput }),
      })

      setActionSuccess(`Password reset in database for ${activeResetHost.name}.`)
      setActiveResetHost(null)
      setResetPassInput('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database error: Password reset failed.')
    } finally {
      setResetLoading(false)
    }
  }

  async function handleDeleteHost() {
    if (!hostToDelete) return
    setDeleteLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${hostToDelete.id}`, {
        method: 'DELETE',
      })

      setHosts((prev) => prev.filter((h) => h.id !== hostToDelete.id))
      setActionSuccess(`Host "${hostToDelete.name}" deleted from database.`)
      setHostToDelete(null)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Database error: Delete failed.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="hosts-container">
      <div className="view-header">
        <div>
          <h2>Hosts</h2>
          <p>Organizers and settlements from database</p>
        </div>
        <div className="header-actions">
          <button
            className="secondary small-btn"
            onClick={fetchHostsList}
            disabled={loading}
            title="Refresh hosts from database"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
          <button className="primary small-btn" onClick={() => setShowAddModal(true)}>
            <UserPlus size={14} /> Add Host
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

      {loading ? (
        <div className="loading-card">
          <RefreshCw size={24} className="spinning" color="#aa3bff" />
          <p>Querying database hosts...</p>
        </div>
      ) : hosts.length === 0 ? (
        <div className="state-card">
          <div className="state-icon">
            <Shield size={32} color="#3699ff" />
          </div>
          <h3>No Hosts in Database</h3>
          <p className="state-desc">
            There are currently no host accounts in the database. Click "Add Host" to register an organizer.
          </p>
        </div>
      ) : (
        <div className="hosts-grid">
          {hosts.map((host) => (
            <article className="host-card" key={host.id}>
              <div className="host-card-top">
                <div className="host-profile-brief">
                  <div className="host-avatar">{host.name.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <h4>{host.name}</h4>
                    <span className="host-user">@{host.username} • {host.assignedGame}</span>
                  </div>
                </div>
                <span className={`status-pill ${host.status}`}>
                  {host.status.toUpperCase()}
                </span>
              </div>

              <div className="host-details-box">
                <div className="detail-line">
                  <span>Mobile:</span>
                  <strong>{host.mobileNumber || 'None'}</strong>
                </div>
                <div className="detail-line">
                  <span>UPI ID:</span>
                  <strong className="text-blue">{host.upiId || 'Not set'}</strong>
                </div>
              </div>

              <div className="host-finance-row">
                <div className="finance-box">
                  <span>Unpaid</span>
                  <strong className="text-green">₹{host.unpaidCommission.toLocaleString()}</strong>
                </div>
                <div className="finance-box">
                  <span>Earned</span>
                  <strong>₹{host.totalEarned.toLocaleString()}</strong>
                </div>
                <div className="finance-box">
                  <span>Hosted</span>
                  <strong>{host.totalMatchesHosted}</strong>
                </div>
              </div>

              <div className="host-actions-bar">
                <button
                  className="primary small-btn"
                  onClick={() => {
                    setActivePayHost(host)
                    setPayAmount(String(host.unpaidCommission || ''))
                  }}
                >
                  <IndianRupee size={12} /> Pay
                </button>
                <button
                  className="secondary small-btn"
                  onClick={() => handleToggleStatus(host)}
                >
                  {host.status === 'active' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                  {host.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
                <button
                  className="secondary small-btn"
                  onClick={() => setActiveResetHost(host)}
                >
                  <Key size={12} /> Reset
                </button>
                <button
                  className="danger small-btn icon-only"
                  onClick={() => setHostToDelete(host)}
                  title="Delete Host"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Add Host Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Host</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHost} className="modal-form">
              <div className="form-grid">
                <label>
                  Full Name
                  <input
                    required
                    type="text"
                    placeholder="Host Name"
                    value={newHostName}
                    onChange={(e) => setNewHostName(e.target.value)}
                  />
                </label>

                <label>
                  Username
                  <input
                    required
                    type="text"
                    placeholder="username"
                    value={newHostUsername}
                    onChange={(e) => setNewHostUsername(e.target.value)}
                  />
                </label>

                <label>
                  Mobile Number
                  <input
                    required
                    type="tel"
                    placeholder="9876543210"
                    value={newHostMobile}
                    onChange={(e) => setNewHostMobile(e.target.value)}
                  />
                </label>

                <label>
                  UPI ID
                  <input
                    type="text"
                    placeholder="name@upi"
                    value={newHostUpiId}
                    onChange={(e) => setNewHostUpiId(e.target.value)}
                  />
                </label>

                <label>
                  Password
                  <input
                    required
                    type="password"
                    placeholder="Password"
                    value={newHostPassword}
                    onChange={(e) => setNewHostPassword(e.target.value)}
                  />
                </label>

                <label>
                  Game
                  <select
                    value={newHostGame}
                    onChange={(e) => setNewHostGame(e.target.value)}
                  >
                    <option value="BGMI">BGMI</option>
                    <option value="Free Fire MAX">Free Fire MAX</option>
                    <option value="Call of Duty: Mobile">Call of Duty: Mobile</option>
                    <option value="Ludo King">Ludo King</option>
                  </select>
                </label>

                <label>
                  Role
                  <select
                    value={newHostRole}
                    onChange={(e) => setNewHostRole(e.target.value as 'tournament' | 'omb')}
                  >
                    <option value="tournament">Tournament</option>
                    <option value="omb">OMB (1v1)</option>
                  </select>
                </label>

                <label>
                  Commission (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={newHostCommission}
                    onChange={(e) => setNewHostCommission(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={addLoading}>
                  {addLoading ? 'Saving to Database...' : 'Add Host'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {activePayHost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Pay Host: {activePayHost.name}</h3>
              <button className="close-btn" onClick={() => setActivePayHost(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSettlePayment} className="modal-form">
              <label>
                Amount (₹)
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="500"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </label>

              <label>
                Method
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </label>

              <label>
                Reference / UTR
                <input
                  type="text"
                  placeholder="Transaction UTR"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActivePayHost(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={payLoading}>
                  {payLoading ? 'Recording Payout...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {activeResetHost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password ({activeResetHost.name})</h3>
              <button className="close-btn" onClick={() => setActiveResetHost(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-form">
              <label>
                New Password
                <input
                  required
                  type="password"
                  placeholder="Enter new password"
                  value={resetPassInput}
                  onChange={(e) => setResetPassInput(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveResetHost(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={resetLoading}>
                  {resetLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Host Modal */}
      {hostToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Host</h3>
              <button className="close-btn" onClick={() => setHostToDelete(null)}>
                ✕
              </button>
            </div>
            <p className="modal-desc">
              Are you sure you want to delete host <b>{hostToDelete.name}</b> (@{hostToDelete.username})?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setHostToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={handleDeleteHost}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Host'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
