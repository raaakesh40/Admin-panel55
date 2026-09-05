import { useState, useEffect } from 'react'
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
  Trash2,
  Shield,
  Eye,
  EyeOff,
  UserX,
  Phone,
  AtSign,
  Lock,
  User,
} from 'lucide-react'

export function ManagersView() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeEditManager, setActiveEditManager] = useState<Manager | null>(null)
  const [activePasswordManager, setActivePasswordManager] = useState<Manager | null>(null)
  const [activeStatusManager, setActiveStatusManager] = useState<Manager | null>(null)
  const [activeDeleteManager, setActiveDeleteManager] = useState<Manager | null>(null)

  // Add Manager Form Fields
  const [addName, setAddName] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addMobileNumber, setAddMobileNumber] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addConfirmPassword, setAddConfirmPassword] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addModalError, setAddModalError] = useState('')

  // Edit Manager Form Fields
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editMobileNumber, setEditMobileNumber] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editModalError, setEditModalError] = useState('')

  // Password Reset Fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordModalError, setPasswordModalError] = useState('')

  // Status & Delete Actions State
  const [statusLoading, setStatusLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteModalError, setDeleteModalError] = useState('')
  const [permanentDeleteConfirmed, setPermanentDeleteConfirmed] = useState(false)

  // Trigger to reload manager list
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // FETCH MANAGERS LIST (GET /api/admin/managers)
  useEffect(() => {
    let ignore = false

    async function loadManagers() {
      setLoading(true)
      setErrorMessage('')
      try {
        type ManagersResponse = {
          managers?: Manager[]
          data?: Manager[]
        }
        const res = await api<ManagersResponse | Manager[]>('/admin/managers')
        let list: Manager[] = []

        if (Array.isArray(res)) {
          list = res
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.managers)) {
            list = res.managers
          } else if (Array.isArray(res.data)) {
            list = res.data
          }
        }

        if (!ignore) {
          setManagers(list)
        }
      } catch (err) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch managers list.'
          setErrorMessage(msg)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadManagers()

    return () => {
      ignore = true
    }
  }, [refreshTrigger])

  // ADD MANAGER (POST /api/admin/managers)
  async function handleAddManager(e: FormEvent) {
    e.preventDefault()
    setAddModalError('')
    setActionSuccess('')

    const name = addName.trim()
    const username = addUsername.trim().toLowerCase()
    const mobileNumber = addMobileNumber.trim()
    const password = addPassword

    if (!name) {
      setAddModalError('Full Name is required.')
      return
    }
    if (!username) {
      setAddModalError('Username is required.')
      return
    }
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      setAddModalError('Username must be at least 3 characters (letters, numbers, _, ., - allowed).')
      return
    }
    if (mobileNumber && !/^[+0-9]{10,15}$/.test(mobileNumber)) {
      setAddModalError('Please enter a valid mobile number (10-15 digits, optional +).')
      return
    }
    if (!password || password.length < 8 || password.length > 256) {
      setAddModalError('Password must be between 8 and 256 characters.')
      return
    }
    if (password !== addConfirmPassword) {
      setAddModalError('Passwords do not match.')
      return
    }

    setAddLoading(true)
    try {
      const payload: { name: string; username: string; password: string; mobileNumber?: string } = {
        name,
        username,
        password,
      }
      if (mobileNumber) {
        payload.mobileNumber = mobileNumber
      }

      await api('/admin/managers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setActionSuccess(`Manager "${name}" (@${username}) created successfully with role: manager.`)
      setShowAddModal(false)
      setAddName('')
      setAddUsername('')
      setAddMobileNumber('')
      setAddPassword('')
      setAddConfirmPassword('')
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create manager.'
      if (msg.includes('USERNAME_EXISTS') || msg.toLowerCase().includes('username is already')) {
        setAddModalError('This username is already in use (USERNAME_EXISTS).')
      } else if (msg.includes('MOBILE_EXISTS') || msg.toLowerCase().includes('mobile number is already')) {
        setAddModalError('This mobile number is already in use (MOBILE_EXISTS).')
      } else if (
        msg.includes('409') ||
        msg.toLowerCase().includes('conflict') ||
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('duplicate')
      ) {
        setAddModalError('Username or mobile number is already registered (409 Conflict). Please use unique credentials.')
      } else {
        setAddModalError(msg)
      }
    } finally {
      setAddLoading(false)
    }
  }

  // EDIT MANAGER (PATCH /api/admin/managers/:id)
  async function handleEditManager(e: FormEvent) {
    e.preventDefault()
    if (!activeEditManager) return
    setEditModalError('')
    setActionSuccess('')

    const name = editName.trim()
    const username = editUsername.trim().toLowerCase()
    const mobileNumber = editMobileNumber.trim()

    if (!name) {
      setEditModalError('Full Name is required.')
      return
    }
    if (!username) {
      setEditModalError('Username is required.')
      return
    }
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
      setEditModalError('Username must be at least 3 characters (letters, numbers, _, ., - allowed).')
      return
    }
    if (mobileNumber && !/^[+0-9]{10,15}$/.test(mobileNumber)) {
      setEditModalError('Please enter a valid mobile number (10-15 digits, optional +).')
      return
    }

    setEditLoading(true)
    try {
      const payload: { name: string; username: string; mobileNumber?: string } = {
        name,
        username,
      }
      if (mobileNumber) {
        payload.mobileNumber = mobileNumber
      }

      await api(`/admin/managers/${encodeURIComponent(activeEditManager.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      setActionSuccess(`Manager "${name}" updated successfully.`)
      setActiveEditManager(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update manager.'
      if (msg.includes('USERNAME_EXISTS') || msg.toLowerCase().includes('username is already')) {
        setEditModalError('This username is already in use (USERNAME_EXISTS).')
      } else if (msg.includes('MOBILE_EXISTS') || msg.toLowerCase().includes('mobile number is already')) {
        setEditModalError('This mobile number is already in use (MOBILE_EXISTS).')
      } else if (
        msg.includes('409') ||
        msg.toLowerCase().includes('conflict') ||
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('duplicate')
      ) {
        setEditModalError('Username or mobile number is already in use by another account (409 Conflict).')
      } else {
        setEditModalError(msg)
      }
    } finally {
      setEditLoading(false)
    }
  }

  // DISABLE / ENABLE MANAGER (DELETE /api/admin/managers/:id or PATCH /api/admin/managers/:id)
  async function handleToggleStatus() {
    if (!activeStatusManager) return
    setStatusLoading(true)
    setActionSuccess('')

    const isCurrentlyActive = (activeStatusManager.accountStatus || 'active').toLowerCase() === 'active'

    try {
      if (isCurrentlyActive) {
        // Deactivate via DELETE /api/admin/managers/:id
        await api(`/admin/managers/${encodeURIComponent(activeStatusManager.id)}`, {
          method: 'DELETE',
        })
        setActionSuccess(`Manager "${activeStatusManager.name}" (@${activeStatusManager.username}) deactivated successfully.`)
      } else {
        // Reactivate via PATCH /api/admin/managers/:id with accountStatus: 'active'
        await api(`/admin/managers/${encodeURIComponent(activeStatusManager.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ accountStatus: 'active' }),
        })
        setActionSuccess(`Manager "${activeStatusManager.name}" (@${activeStatusManager.username}) reactivated successfully.`)
      }

      setActiveStatusManager(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update manager status.'
      setErrorMessage(msg)
    } finally {
      setStatusLoading(false)
    }
  }

  // RESET PASSWORD (POST /api/admin/managers/:id/password-reset)
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!activePasswordManager) return
    setPasswordModalError('')
    setActionSuccess('')

    if (!newPassword || newPassword.length < 8 || newPassword.length > 256) {
      setPasswordModalError('New password must be between 8 and 256 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordModalError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      await api(`/admin/managers/${encodeURIComponent(activePasswordManager.id)}/password-reset`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      })

      setActionSuccess(`Password reset successfully for manager "${activePasswordManager.name}".`)
      setActivePasswordManager(null)
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.'
      if (msg.includes('MANAGER_NOT_FOUND')) {
        setPasswordModalError('Manager was not found (MANAGER_NOT_FOUND).')
      } else {
        setPasswordModalError(msg)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  // SOFT DEACTIVATE MANAGER (DELETE /api/admin/managers/:id)
  async function handleSoftDeactivate() {
    if (!activeDeleteManager) return
    setDeleteLoading(true)
    setDeleteModalError('')
    setActionSuccess('')

    try {
      await api(`/admin/managers/${encodeURIComponent(activeDeleteManager.id)}`, {
        method: 'DELETE',
      })

      setActionSuccess(`Manager "${activeDeleteManager.name}" deactivated successfully.`)
      setActiveDeleteManager(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate manager.'
      setDeleteModalError(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // PERMANENT DELETE (DELETE /api/admin/managers/:id?permanent=true)
  async function handlePermanentDelete() {
    if (!activeDeleteManager) return
    setDeleteLoading(true)
    setDeleteModalError('')
    setActionSuccess('')

    try {
      await api(`/admin/managers/${encodeURIComponent(activeDeleteManager.id)}?permanent=true`, {
        method: 'DELETE',
      })

      setActionSuccess(`Manager "${activeDeleteManager.name}" was permanently deleted from the database.`)
      setActiveDeleteManager(null)
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to permanently delete manager.'
      if (
        msg.includes('MANAGER_HAS_HISTORY') ||
        msg.includes('409') ||
        msg.toLowerCase().includes('financial') ||
        msg.toLowerCase().includes('history') ||
        msg.toLowerCase().includes('wallet') ||
        msg.toLowerCase().includes('deposit') ||
        msg.toLowerCase().includes('withdrawal')
      ) {
        setDeleteModalError(
          'This manager has account or financial records and can only be deactivated (MANAGER_HAS_HISTORY).'
        )
      } else if (msg.includes('MANAGER_NOT_FOUND')) {
        setDeleteModalError('Manager was not found (MANAGER_NOT_FOUND).')
      } else {
        setDeleteModalError(msg)
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filtered List
  const filteredManagers = managers.filter((m) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      (m.mobileNumber && m.mobileNumber.includes(q)) ||
      m.id.toLowerCase().includes(q)

    const status = (m.accountStatus || 'active').toLowerCase()
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && status === 'active') ||
      (statusFilter === 'deactivated' && (status === 'deactivated' || status === 'suspended' || status === 'disabled' || status === 'banned'))

    return matchesQuery && matchesStatus
  })

  const totalCount = managers.length
  const activeCount = managers.filter((m) => (m.accountStatus || 'active').toLowerCase() === 'active').length
  const deactivatedCount = totalCount - activeCount

  return (
    <div className="managers-container">
      {/* View Header & Breadcrumb */}
      <div className="view-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>User Management</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Managers</span>
          </div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <UserCheck size={24} style={{ color: 'var(--primary)' }} />
            Manager Management
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage staff with Manager Panel (<code>/manager</code>) access. Backend automatically sets <code>role=manager</code> and <code>accountStatus=active</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`secondary ${loading ? 'spinning' : ''}`}
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            disabled={loading}
            title="Refresh List"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setAddModalError('')
              setAddName('')
              setAddUsername('')
              setAddMobileNumber('')
              setAddPassword('')
              setAddConfirmPassword('')
              setShowAddModal(true)
            }}
          >
            <Plus size={16} />
            <span>Add Manager</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="alert-box success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert-box error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card stat-card">
          <span className="stat-label">Total Managers</span>
          <b className="stat-value">{totalCount}</b>
          <span className="stat-desc">role = manager</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Active Managers</span>
          <b className="stat-value" style={{ color: '#10b981' }}>{activeCount}</b>
          <span className="stat-desc">Can access /manager</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Deactivated</span>
          <b className="stat-value" style={{ color: '#ef4444' }}>{deactivatedCount}</b>
          <span className="stat-desc">Login blocked</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="search-bar" style={{ flex: '1', minWidth: '240px', maxWidth: '400px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, username, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '36px' }}
          />
        </div>

        <div className="filter-tabs" style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`secondary small-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`secondary small-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`secondary small-btn ${statusFilter === 'deactivated' ? 'active' : ''}`}
            onClick={() => setStatusFilter('deactivated')}
          >
            Deactivated ({deactivatedCount})
          </button>
        </div>
      </div>

      {/* Managers Table / List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0 }}>Loading managers...</p>
          </div>
        ) : filteredManagers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <UserCheck size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 6px' }}>No Managers Found</h4>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: '13px' }}>
              {searchQuery
                ? `No manager matches "${searchQuery}".`
                : 'No managers currently registered in the system.'}
            </p>
            <button
              type="button"
              className="primary small-btn"
              onClick={() => {
                setAddModalError('')
                setShowAddModal(true)
              }}
            >
              <Plus size={14} /> Add First Manager
            </button>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Manager</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Username</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mobile Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((mgr) => {
                  const isActive = (mgr.accountStatus || 'active').toLowerCase() === 'active'
                  return (
                    <tr
                      key={mgr.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isActive ? 'var(--primary)' : '#6b7280',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            {(mgr.name || mgr.username || 'M').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{mgr.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {mgr.id.slice(0, 12)}...</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ background: 'var(--surface-muted)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                          @{mgr.username}
                        </code>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                          <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{mgr.mobileNumber || '—'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#3b82f6',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          <Shield size={12} />
                          manager
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isActive ? '#10b981' : '#ef4444',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isActive ? '#10b981' : '#ef4444',
                            }}
                          />
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {/* Edit Manager */}
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit Manager"
                            onClick={() => {
                              setEditModalError('')
                              setEditName(mgr.name)
                              setEditUsername(mgr.username)
                              setEditMobileNumber(mgr.mobileNumber || '')
                              setActiveEditManager(mgr)
                            }}
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            className="icon-button"
                            title="Reset Password"
                            onClick={() => {
                              setPasswordModalError('')
                              setNewPassword('')
                              setConfirmNewPassword('')
                              setShowNewPassword(false)
                              setActivePasswordManager(mgr)
                            }}
                          >
                            <Key size={15} />
                          </button>

                          {/* Toggle Status (Deactivate/Reactivate) */}
                          <button
                            type="button"
                            className="icon-button"
                            style={{ color: isActive ? '#f59e0b' : '#10b981' }}
                            title={isActive ? 'Deactivate Manager Access' : 'Reactivate Manager Access'}
                            onClick={() => setActiveStatusManager(mgr)}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>

                          {/* Delete Manager */}
                          <button
                            type="button"
                            className="icon-button"
                            style={{ color: '#ef4444' }}
                            title="Delete / Deactivate Manager"
                            onClick={() => {
                              setDeleteModalError('')
                              setPermanentDeleteConfirmed(false)
                              setActiveDeleteManager(mgr)
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD MANAGER (POST /api/admin/managers) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} /> Add Manager
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAddModal(false)}
                disabled={addLoading}
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

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Create a new manager account. Backend automatically sets <code>role = manager</code> and <code>accountStatus = active</code>.
              </p>

              <label>
                Full Name *
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </label>

              <label>
                Username *
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <AtSign size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    required
                    type="text"
                    placeholder="e.g. rakesh_manager"
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    autoCapitalize="none"
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                  At least 3 characters. Letters, numbers, underscores (_), dots (.), hyphens (-) allowed.
                </small>
              </label>

              <label>
                Mobile Number (Optional)
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    placeholder="e.g. +919876543210 (Optional)"
                    maxLength={16}
                    value={addMobileNumber}
                    onChange={(e) => setAddMobileNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </label>

              <label>
                Password *
                <div className="password-input-wrapper">
                  <Lock size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', zIndex: 1 }} />
                  <input
                    required
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="8 - 256 characters"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    style={{ paddingLeft: '32px' }}
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
                <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                  Must be between 8 and 256 characters.
                </small>
              </label>

              <label>
                Confirm Password *
                <div className="password-input-wrapper">
                  <Lock size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', zIndex: 1 }} />
                  <input
                    required
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={addConfirmPassword}
                    onChange={(e) => setAddConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </label>

              <div style={{ background: 'var(--surface-muted)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Assigned Role: </span>
                <strong style={{ color: '#3b82f6' }}>manager</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '12px' }}>Initial Status: </span>
                <strong style={{ color: '#10b981' }}>active</strong>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={addLoading}>
                  {addLoading ? 'Creating Manager...' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT MANAGER (PATCH /api/admin/managers/:id) */}
      {/* ========================================================================= */}
      {activeEditManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} /> Edit Manager
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveEditManager(null)}
                disabled={editLoading}
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

              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Update manager profile for <strong>@{activeEditManager.username}</strong>:
              </p>

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
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  autoCapitalize="none"
                />
              </label>

              <label>
                Mobile Number (Optional)
                <input
                  type="tel"
                  maxLength={16}
                  placeholder="e.g. +919876543210 (Optional)"
                  value={editMobileNumber}
                  onChange={(e) => setEditMobileNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                />
              </label>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
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
      {/* MODAL 3: DEACTIVATE / REACTIVATE MANAGER (DELETE or PATCH /api/admin/managers/:id) */}
      {/* ========================================================================= */}
      {activeStatusManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeStatusManager.accountStatus === 'active' ? (
                  <>
                    <UserX size={18} style={{ color: '#ef4444' }} />
                    Deactivate Manager Access
                  </>
                ) : (
                  <>
                    <UserCheck size={18} style={{ color: '#10b981' }} />
                    Reactivate Manager Access
                  </>
                )}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveStatusManager(null)}
                disabled={statusLoading}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '8px 0' }}>
              <div
                className={`alert-box ${activeStatusManager.accountStatus === 'active' ? 'error' : 'success'}`}
                style={{ marginBottom: '14px' }}
              >
                <AlertCircle size={18} />
                <span>
                  Are you sure you want to{' '}
                  <strong>{activeStatusManager.accountStatus === 'active' ? 'deactivate' : 'reactivate'}</strong>{' '}
                  manager &quot;{activeStatusManager.name}&quot; (@{activeStatusManager.username})?
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {activeStatusManager.accountStatus === 'active'
                  ? 'Deactivating this manager sets accountStatus to "deactivated" via DELETE /api/admin/managers/:id. Their history is preserved, but they will be immediately blocked from logging in.'
                  : 'Reactivating this manager sets accountStatus to "active" via PATCH /api/admin/managers/:id. Manager Panel access will be restored immediately.'}
              </p>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
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
                  onClick={() => void handleToggleStatus()}
                  disabled={statusLoading}
                >
                  {statusLoading
                    ? 'Updating Status...'
                    : activeStatusManager.accountStatus === 'active'
                    ? 'Confirm Deactivate'
                    : 'Confirm Reactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE MANAGER (SOFT DEACTIVATE OR PERMANENT DELETE) */}
      {/* ========================================================================= */}
      {activeDeleteManager && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <Trash2 size={18} /> Delete Manager ({activeDeleteManager.username})
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setActiveDeleteManager(null)}
                disabled={deleteLoading}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '6px 0' }}>
              {deleteModalError && (
                <div className="alert-box error" style={{ marginBottom: '14px' }}>
                  <AlertCircle size={18} />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Choose the deletion action for manager <strong>{activeDeleteManager.name}</strong> (@{activeDeleteManager.username}):
              </p>

              {/* Option 1: Deactivate (Normal Delete) */}
              <div
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px' }}>Option A: Deactivate Manager (Safe)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DELETE /api/admin/managers/:id</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Deactivates this manager and blocks login, while safely preserving audit trails, match records, and competition history.
                </p>
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => void handleSoftDeactivate()}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Processing...' : 'Deactivate Manager'}
                </button>
              </div>

              {/* Option 2: Permanent Delete (Hard Delete) */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px', color: '#ef4444' }}>Option B: Permanent Delete</strong>
                  <span style={{ fontSize: '11px', color: '#ef4444' }}>?permanent=true</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Permanently purges manager from database. <strong>Only history-free accounts</strong> can be permanently deleted. If records exist, a 409 Conflict will be returned and deactivation is enforced.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', margin: '0 0 12px' }}>
                  <input
                    type="checkbox"
                    checked={permanentDeleteConfirmed}
                    onChange={(e) => setPermanentDeleteConfirmed(e.target.checked)}
                  />
                  <span>I understand this action permanently deletes this manager.</span>
                </label>

                <button
                  type="button"
                  className="danger small-btn"
                  onClick={() => void handlePermanentDelete()}
                  disabled={deleteLoading || !permanentDeleteConfirmed}
                >
                  {deleteLoading ? 'Deleting...' : 'Permanent Delete Manager'}
                </button>
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setActiveDeleteManager(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESET PASSWORD (POST /api/admin/managers/:id/password-reset) */}
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
                disabled={passwordLoading}
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

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Set a new password for manager <strong>{activePasswordManager.name}</strong> (@{activePasswordManager.username}):
              </p>

              <label>
                New Password
                <div className="password-input-wrapper">
                  <input
                    required
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (8 - 256 chars)"
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

              <div className="modal-actions" style={{ marginTop: '16px' }}>
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
    </div>
  )
}
