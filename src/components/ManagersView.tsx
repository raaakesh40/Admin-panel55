import { useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import type { Manager } from '../types'
import { api } from '../services/api'
import {
  UserCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Key,
  Edit2,
  Power,
  Phone,
  Shield,
  Eye,
  EyeOff,
  UserX,
} from 'lucide-react'

function normalizeManager(raw: unknown): Manager | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const user = (obj.user && typeof obj.user === 'object' ? obj.user : {}) as Record<string, unknown>

  const id = String(obj.id || obj._id || obj.userId || user.id || user._id || '')
  if (!id) return null

  const name = String(obj.name || user.name || obj.username || user.username || 'Manager')
  const username = String(obj.username || user.username || obj.name || 'manager')
  const mobileNumber = String(
    obj.mobileNumber || obj.mobile_number || obj.mobile || user.mobileNumber || user.mobile || ''
  )
  const role = String(obj.role || user.role || 'manager')
  const rawStatus = String(obj.accountStatus || obj.status || user.accountStatus || user.status || 'active').toLowerCase()
  const accountStatus = rawStatus === 'suspended' || rawStatus === 'disabled' || rawStatus === 'banned' ? 'suspended' : 'active'
  const createdAt = obj.createdAt || user.createdAt ? String(obj.createdAt || user.createdAt) : undefined

  return {
    id,
    name,
    username,
    mobileNumber,
    role,
    accountStatus,
    createdAt,
  }
}

export function ManagersView() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')

  // Add Manager Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addMobileNumber, setAddMobileNumber] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addConfirmPassword, setAddConfirmPassword] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addModalError, setAddModalError] = useState('')

  // Edit Manager Modal
  const [activeEditManager, setActiveEditManager] = useState<Manager | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editMobileNumber, setEditMobileNumber] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editModalError, setEditModalError] = useState('')

  // Reset Password Modal
  const [activePasswordManager, setActivePasswordManager] = useState<Manager | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordModalError, setPasswordModalError] = useState('')

  // Status Toggle Modal (Enable / Disable)
  const [activeStatusManager, setActiveStatusManager] = useState<Manager | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const fetchManagers = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      let data: unknown = null
      try {
        data = await api<unknown>('/admin/managers')
      } catch {
        data = await api<unknown>('/operations/admin/managers').catch(() => null)
      }

      let rawList: unknown[] = []
      if (Array.isArray(data)) {
        rawList = data
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        if (Array.isArray(obj.managers)) {
          rawList = obj.managers
        } else if (Array.isArray(obj.data)) {
          rawList = obj.data
        } else if (Array.isArray(obj.users)) {
          rawList = obj.users
        }
      }

      const parsed = rawList
        .map(normalizeManager)
        .filter((m): m is Manager => m !== null)

      setManagers(parsed)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch managers list.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchManagers()
  }, [fetchManagers])

  // ADD MANAGER
  async function handleAddManager(e: FormEvent) {
    e.preventDefault()
    setAddModalError('')

    const name = addName.trim()
    const username = addUsername.trim()
    const mobileNumber = addMobileNumber.trim()
    const password = addPassword.trim()
    const confirmPass = addConfirmPassword.trim()

    if (!name || !username || !mobileNumber || !password) {
      setAddModalError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setAddModalError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPass) {
      setAddModalError('Passwords do not match.')
      return
    }

    setAddLoading(true)
    try {
      const payload = {
        name,
        username,
        mobileNumber,
        password,
        role: 'manager',
      }

      try {
        await api('/admin/managers', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } catch (err) {
        // Fallback endpoint if needed
        await api('/operations/admin/managers', {
          method: 'POST',
          body: JSON.stringify(payload),
        }).catch(() => {
          throw err
        })
      }

      setActionSuccess(`Manager "${name}" (@${username}) created successfully on server.`)
      setShowAddModal(false)
      setAddName('')
      setAddUsername('')
      setAddMobileNumber('')
      setAddPassword('')
      setAddConfirmPassword('')
      await fetchManagers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create manager.'
      if (msg.includes('409') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
        setAddModalError('Username or mobile number is already in use by another user.')
      } else {
        setAddModalError(msg)
      }
    } finally {
      setAddLoading(false)
    }
  }

  // EDIT MANAGER
  function openEditModal(mgr: Manager) {
    setActiveEditManager(mgr)
    setEditName(mgr.name)
    setEditUsername(mgr.username)
    setEditMobileNumber(mgr.mobileNumber)
    setEditModalError('')
  }

  async function handleEditManager(e: FormEvent) {
    e.preventDefault()
    if (!activeEditManager) return
    setEditModalError('')

    const name = editName.trim()
    const username = editUsername.trim()
    const mobileNumber = editMobileNumber.trim()

    if (!name || !username || !mobileNumber) {
      setEditModalError('Name, Username, and Mobile Number are required.')
      return
    }

    setEditLoading(true)
    try {
      const payload = {
        name,
        username,
        mobileNumber,
      }

      try {
        await api(`/admin/managers/${encodeURIComponent(activeEditManager.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      } catch (err) {
        // Fallback
        await api(`/operations/admin/managers/${encodeURIComponent(activeEditManager.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }).catch(() => {
          throw err
        })
      }

      setActionSuccess(`Manager "${name}" updated successfully.`)
      setActiveEditManager(null)
      await fetchManagers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update manager.'
      if (msg.includes('409') || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('already')) {
        setEditModalError('Username or mobile number already in use by another account.')
      } else {
        setEditModalError(msg)
      }
    } finally {
      setEditLoading(false)
    }
  }

  // RESET PASSWORD
  function openPasswordModal(mgr: Manager) {
    setActivePasswordManager(mgr)
    setNewPassword('')
    setConfirmNewPassword('')
    setPasswordModalError('')
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!activePasswordManager) return
    setPasswordModalError('')

    const pass = newPassword.trim()
    const confirm = confirmNewPassword.trim()

    if (!pass) {
      setPasswordModalError('New password cannot be empty.')
      return
    }

    if (pass.length < 6) {
      setPasswordModalError('Password must be at least 6 characters.')
      return
    }

    if (pass !== confirm) {
      setPasswordModalError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      try {
        await api(`/admin/managers/${encodeURIComponent(activePasswordManager.id)}/password-reset`, {
          method: 'POST',
          body: JSON.stringify({ password: pass }),
        })
      } catch {
        // Fallback endpoints
        try {
          await api(`/operations/users/${encodeURIComponent(activePasswordManager.id)}/password-reset`, {
            method: 'POST',
            body: JSON.stringify({ password: pass }),
          })
        } catch {
          await api(`/admin/users/${encodeURIComponent(activePasswordManager.id)}/password-reset`, {
            method: 'POST',
            body: JSON.stringify({ password: pass }),
          })
        }
      }

      setActionSuccess(`Password reset successfully for "${activePasswordManager.name}".`)
      setActivePasswordManager(null)
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      setPasswordModalError(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  // TOGGLE STATUS (ENABLE / DISABLE)
  function openStatusModal(mgr: Manager) {
    setActiveStatusManager(mgr)
  }

  async function handleToggleStatus() {
    if (!activeStatusManager) return
    setStatusLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    const targetStatus = activeStatusManager.accountStatus === 'active' ? 'suspended' : 'active'

    try {
      try {
        await api(`/admin/managers/${encodeURIComponent(activeStatusManager.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus, accountStatus: targetStatus }),
        })
      } catch {
        try {
          await api(`/admin/users/${encodeURIComponent(activeStatusManager.id)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: targetStatus }),
          })
        } catch {
          await api(`/operations/users/${encodeURIComponent(activeStatusManager.id)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ accountStatus: targetStatus }),
          })
        }
      }

      setActionSuccess(
        `Manager "${activeStatusManager.name}" has been ${
          targetStatus === 'active' ? 'activated' : 'disabled / suspended'
        } on server.`
      )
      setActiveStatusManager(null)
      await fetchManagers()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update manager status.')
    } finally {
      setStatusLoading(false)
    }
  }

  // Filtered List
  const filteredManagers = managers.filter((mgr) => {
    if (statusFilter !== 'all' && mgr.accountStatus !== statusFilter) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = mgr.name.toLowerCase().includes(q)
      const matchUsername = mgr.username.toLowerCase().includes(q)
      const matchPhone = mgr.mobileNumber.toLowerCase().includes(q)
      if (!matchName && !matchUsername && !matchPhone) return false
    }
    return true
  })

  const totalCount = managers.length
  const activeCount = managers.filter((m) => m.accountStatus === 'active').length
  const suspendedCount = managers.filter((m) => m.accountStatus === 'suspended').length

  return (
    <div className="hosts-container">
      {/* Header */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Manager Management</h2>
          <p>Create and manage operations managers with access to the Manager Panel.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`secondary ${loading ? 'spinning' : ''}`}
            onClick={fetchManagers}
            disabled={loading}
            title="Refresh List"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setAddModalError('')
              setShowAddModal(true)
            }}
          >
            <Plus size={16} /> Add Manager
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="alert-box success" style={{ marginTop: '12px' }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
          <button
            type="button"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setActionSuccess('')}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box error" style={{ marginTop: '12px' }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button
            type="button"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setErrorMessage('')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-row" style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Managers</div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-sub">Operations Staff</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Managers</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{activeCount}</div>
          <div className="stat-sub">Ready to sign in</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suspended / Disabled</div>
          <div className="stat-value" style={{ color: suspendedCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            {suspendedCount}
          </div>
          <div className="stat-sub">Access blocked</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="hosts-controls" style={{ marginTop: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search manager by name, username, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-group" style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`small-btn ${statusFilter === 'all' ? 'primary' : 'secondary'}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`small-btn ${statusFilter === 'active' ? 'primary' : 'secondary'}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`small-btn ${statusFilter === 'suspended' ? 'primary' : 'secondary'}`}
            onClick={() => setStatusFilter('suspended')}
          >
            Suspended ({suspendedCount})
          </button>
        </div>
      </div>

      {/* Managers List */}
      <div style={{ marginTop: '18px' }}>
        {loading && managers.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
            <p>Loading managers from live server...</p>
          </div>
        ) : filteredManagers.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            <UserX size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px' }}>
              {searchQuery ? 'No managers match your query' : 'No Managers Registered Yet'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px' }}>
              {searchQuery
                ? 'Try a different search term or clear the filter.'
                : 'Managers can oversee competitions, assign hosts, and handle disputes from the Manager Panel.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setAddModalError('')
                  setShowAddModal(true)
                }}
              >
                <Plus size={16} /> Add First Manager
              </button>
            )}
          </div>
        ) : (
          <div className="hosts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {filteredManagers.map((mgr) => (
              <div
                key={mgr.id}
                className="host-card"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                    >
                      {mgr.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600 }}>
                        {mgr.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        @{mgr.username}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge-tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)', fontWeight: 600 }}>
                      MANAGER
                    </span>
                    <span className={`status-pill ${mgr.accountStatus === 'active' ? 'active' : 'suspended'}`}>
                      {mgr.accountStatus === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-muted)', borderRadius: '6px', padding: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                    <Phone size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{mgr.mobileNumber || 'No mobile specified'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Shield size={12} />
                    <span>Role: <strong>manager</strong> &bull; Portal: <strong>/manager</strong></span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={() => openEditModal(mgr)}
                    title="Edit manager details"
                  >
                    <Edit2 size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    className="secondary small-btn"
                    onClick={() => openPasswordModal(mgr)}
                    title="Reset manager password"
                  >
                    <Key size={13} /> Password
                  </button>

                  {mgr.accountStatus === 'active' ? (
                    <button
                      type="button"
                      className="danger small-btn"
                      onClick={() => openStatusModal(mgr)}
                      title="Disable / suspend manager access"
                    >
                      <Power size={13} /> Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="success small-btn"
                      onClick={() => openStatusModal(mgr)}
                      title="Re-activate manager account"
                    >
                      <Power size={13} /> Enable
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD MANAGER */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} /> Add New Manager
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManager} className="modal-form">
              {addModalError && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{addModalError}</span>
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                The manager will be created with <strong>role: manager</strong> and will be able to log in to the Manager Panel (<code>/manager</code>) using their credentials.
              </p>

              <label>
                Full Name
                <div className="password-input-wrapper">
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </div>
              </label>

              <label>
                Username
                <div className="password-input-wrapper">
                  <input
                    required
                    type="text"
                    placeholder="e.g. manager_rahul"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    autoCapitalize="none"
                  />
                </div>
              </label>

              <label>
                Mobile Number
                <div className="password-input-wrapper">
                  <input
                    required
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={addMobileNumber}
                    onChange={(e) => setAddMobileNumber(e.target.value)}
                  />
                </div>
              </label>

              <label>
                Password
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="Enter strong password (min 6 chars)"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowAddPassword((prev) => !prev)}
                    title={showAddPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                Confirm Password
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="Re-enter password to confirm"
                    value={addConfirmPassword}
                    onChange={(e) => setAddConfirmPassword(e.target.value)}
                  />
                </div>
              </label>

              {/* Status and Role indicator */}
              <div style={{ background: 'var(--surface-muted)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Role:</span>{' '}
                  <strong style={{ color: '#3b82f6' }}>manager</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Initial Status:</span>{' '}
                  <span className="status-pill active">Active</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={addLoading}>
                  {addLoading ? 'Creating Manager on Server...' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MANAGER */}
      {/* ========================================================================= */}
      {activeEditManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} /> Edit Manager ({activeEditManager.username})
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveEditManager(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditManager} className="modal-form">
              {editModalError && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{editModalError}</span>
                </div>
              )}

              <label>
                Full Name
                <input
                  required
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </label>

              <label>
                Username
                <input
                  required
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  autoCapitalize="none"
                />
              </label>

              <label>
                Mobile Number
                <input
                  required
                  type="tel"
                  value={editMobileNumber}
                  onChange={(e) => setEditMobileNumber(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveEditManager(null)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD */}
      {/* ========================================================================= */}
      {activePasswordManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={16} /> Reset Password
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActivePasswordManager(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="modal-form">
              {passwordModalError && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{passwordModalError}</span>
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Set a new password for manager <strong>{activePasswordManager.name}</strong> (@{activePasswordManager.username}):
              </p>

              <label>
                New Password
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                Confirm New Password
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActivePasswordManager(null)}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Resetting Password...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOGGLE STATUS (ENABLE / DISABLE) */}
      {/* ========================================================================= */}
      {activeStatusManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>
                {activeStatusManager.accountStatus === 'active' ? 'Disable Manager Access' : 'Enable Manager Access'}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveStatusManager(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '8px 0' }}>
              <div className={`alert-box ${activeStatusManager.accountStatus === 'active' ? 'error' : 'success'}`} style={{ marginBottom: '14px' }}>
                <AlertCircle size={18} />
                <span>
                  Are you sure you want to{' '}
                  <strong>{activeStatusManager.accountStatus === 'active' ? 'disable' : 're-enable'}</strong>{' '}
                  manager &quot;{activeStatusManager.name}&quot; (@{activeStatusManager.username})?
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {activeStatusManager.accountStatus === 'active'
                  ? 'Disabling this manager sets their account status to suspended and prevents them from logging into the Manager Panel.'
                  : 'Enabling this manager sets their status to active and restores their Manager Panel login permissions.'}
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveStatusManager(null)}
                  disabled={statusLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={activeStatusManager.accountStatus === 'active' ? 'danger' : 'primary'}
                  onClick={handleToggleStatus}
                  disabled={statusLoading}
                >
                  {statusLoading
                    ? 'Updating Status...'
                    : activeStatusManager.accountStatus === 'active'
                    ? 'Confirm Disable Manager'
                    : 'Confirm Enable Manager'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
