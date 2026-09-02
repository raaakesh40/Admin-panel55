import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Host } from '../types'
import { api } from '../services/api'
import {
  Shield,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Key,
  CreditCard,
  Edit2,
  Trash2,
  Power,
} from 'lucide-react'

const DELETED_HOSTS_KEY = 'pagewoga_deleted_host_ids'

function getDeletedHostIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_HOSTS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function addDeletedHostId(id: string) {
  try {
    const current = getDeletedHostIds()
    if (!current.includes(id)) {
      const updated = [...current, id]
      localStorage.setItem(DELETED_HOSTS_KEY, JSON.stringify(updated))
    }
  } catch {
    // ignore
  }
}

function removeDeletedHostId(id: string) {
  try {
    const current = getDeletedHostIds()
    const updated = current.filter((x) => x !== id)
    localStorage.setItem(DELETED_HOSTS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function HostsView() {
  const [allFetchedHosts, setAllFetchedHosts] = useState<Host[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>(getDeletedHostIds)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'omb' | 'tournament'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'deleted'>('all')
  const [actionSuccess, setActionSuccess] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createMobile, setCreateMobile] = useState('')
  const [createUpiId, setCreateUpiId] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<'omb' | 'tournament'>('omb')
  const [createLoading, setCreateLoading] = useState(false)

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editHostId, setEditHostId] = useState('')
  const [editName, setEditName] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editUpiId, setEditUpiId] = useState('')
  const [editRole, setEditRole] = useState<'omb' | 'tournament'>('omb')
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active')
  const [editLoading, setEditLoading] = useState(false)

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [activePayHost, setActivePayHost] = useState<Host | null>(null)
  const [payLoading, setPayLoading] = useState(false)

  // Password Reset Modal
  const [showResetModal, setShowResetModal] = useState(false)
  const [activeResetHost, setActiveResetHost] = useState<Host | null>(null)
  const [resetPassInput, setResetPassInput] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [activeDeleteHost, setActiveDeleteHost] = useState<Host | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Fetch Hosts: GET /api/hosts
  async function fetchHosts() {
    setLoading(true)
    setErrorMessage('')
    try {
      const params = new URLSearchParams()
      params.append('includeDisabled', 'true')
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }
      const data = await api<unknown>(`/hosts?${params.toString()}`)
      let list: Host[] = []
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        if (Array.isArray(obj.hosts)) {
          list = obj.hosts as Host[]
        } else if (Array.isArray(data)) {
          list = data as Host[]
        }
      }

      setAllFetchedHosts(list)
      setDeletedIds(getDeletedHostIds())
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch hosts list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('includeDisabled', 'true')
        if (roleFilter !== 'all') {
          params.append('role', roleFilter)
        }
        const data = await api<unknown>(`/hosts?${params.toString()}`).catch(() => null)
        if (isMounted && data && typeof data === 'object') {
          const obj = data as Record<string, unknown>
          let list: Host[] = []
          if (Array.isArray(obj.hosts)) {
            list = obj.hosts as Host[]
          } else if (Array.isArray(data)) {
            list = data as Host[]
          }
          setAllFetchedHosts(list)
          setDeletedIds(getDeletedHostIds())
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [roleFilter])

  // 1) Create Host
  async function handleCreateHost(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    const name = createName.trim()
    const mobileNumber = createMobile.trim()
    const upiId = createUpiId.trim()
    const password = createPassword

    if (!name || !mobileNumber || !upiId || !password) {
      setErrorMessage('Please fill in all required host fields.')
      setCreateLoading(false)
      return
    }

    try {
      await api('/admin/hosts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          mobileNumber,
          upiId,
          password,
          role: createRole,
        }),
      })

      setActionSuccess(`Host "${name}" registered successfully.`)
      setShowCreateModal(false)
      setCreateName('')
      setCreateMobile('')
      setCreateUpiId('')
      setCreatePassword('')
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to register host.')
    } finally {
      setCreateLoading(false)
    }
  }

  // 2) Update Host
  async function handleUpdateHost(e: FormEvent) {
    e.preventDefault()
    if (!editHostId) return
    setEditLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${editHostId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          mobileNumber: editMobile.trim(),
          upiId: editUpiId.trim(),
          role: editRole,
          status: editStatus,
        }),
      })

      setActionSuccess(`Host details updated successfully.`)
      setShowEditModal(false)
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update host.')
    } finally {
      setEditLoading(false)
    }
  }

  // 3) Toggle Host Status (Disable / Enable)
  async function handleToggleStatus(host: Host) {
    const isCurrentlyActive = (host.status || 'active').toLowerCase() === 'active'
    const newStatus = isCurrentlyActive ? 'suspended' : 'active'
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${host.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setActionSuccess(`Host "${host.name}" status updated to ${newStatus.toUpperCase()}.`)
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle status.')
    }
  }

  // 4) Mark Host Paid
  async function handleSettlePayment(e: FormEvent) {
    e.preventDefault()
    if (!activePayHost) return
    setPayLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${activePayHost.id}/pay`, {
        method: 'POST',
      })
      setActionSuccess(`Host payout marked as settled successfully.`)
      setShowPayModal(false)
      setActivePayHost(null)
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record payout.')
    } finally {
      setPayLoading(false)
    }
  }

  // 5) Reset Password
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!activeResetHost || !resetPassInput) return
    setResetLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${activeResetHost.id}/password-reset`, {
        method: 'POST',
        body: JSON.stringify({ password: resetPassInput }),
      })
      setActionSuccess(`Password reset successfully for ${activeResetHost.name}.`)
      setShowResetModal(false)
      setActiveResetHost(null)
      setResetPassInput('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password.')
    } finally {
      setResetLoading(false)
    }
  }

  // 6) Delete / Deactivate Host
  function promptDeleteHost(h: Host) {
    setActiveDeleteHost(h)
    setShowDeleteModal(true)
  }

  async function handleDeleteHost() {
    if (!activeDeleteHost) return
    const targetId = activeDeleteHost.id
    const targetName = activeDeleteHost.name
    setDeleteLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      // Execute backend endpoint: DELETE /api/admin/hosts/:id
      const res = await api<{ success?: boolean; message?: string; id?: string }>(
        `/admin/hosts/${encodeURIComponent(targetId)}`,
        {
          method: 'DELETE',
        }
      )

      // Record ID in deleted/trash store
      addDeletedHostId(targetId)
      setDeletedIds(getDeletedHostIds())

      // Purge from active frontend list immediately
      setAllFetchedHosts((prev) => prev.filter((h) => h.id !== targetId))

      const successMsg =
        res?.message || `Host "${targetName}" deleted and deactivated successfully.`
      setActionSuccess(successMsg)
      setShowDeleteModal(false)
      setActiveDeleteHost(null)

      // Refresh list to sync state with backend
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete host.'
      setErrorMessage(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 7) Restore Host from Deleted (Trash)
  async function handleRestoreHost(host: Host) {
    setLoading(true)
    setErrorMessage('')
    setActionSuccess('')
    try {
      removeDeletedHostId(host.id)
      setDeletedIds(getDeletedHostIds())

      await api(`/admin/hosts/${encodeURIComponent(host.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }).catch(() => {
        // status patch fallback
      })

      setActionSuccess(`Host "${host.name}" restored to Active status successfully.`)
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to restore host.')
    } finally {
      setLoading(false)
    }
  }

  // Filter hosts based on search and status/deleted tab
  const filteredHosts = allFetchedHosts.filter((h) => {
    if (!h || !h.id) return false
    const isDeleted = deletedIds.includes(h.id) || (h.status || '').toLowerCase() === 'deleted'
    const isActive = (h.status || 'active').toLowerCase() === 'active'

    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      h.name?.toLowerCase().includes(q) ||
      h.mobileNumber?.toLowerCase().includes(q) ||
      h.upiId?.toLowerCase().includes(q) ||
      h.id?.toLowerCase().includes(q)

    if (!matchesQuery) return false

    if (statusFilter === 'deleted') {
      return isDeleted
    }

    // For all, active, disabled: ignore deleted hosts completely
    if (isDeleted) return false

    if (statusFilter === 'active') {
      return isActive
    }

    if (statusFilter === 'disabled') {
      return !isActive
    }

    return true
  })

  return (
    <div className="hosts-container">
      <div className="view-header">
        <div>
          <h2>Hosts Management</h2>
          <p>Manage room host accounts, match assignments, settlements, and credentials</p>
        </div>
        <div className="header-actions">
          <button className="primary small-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Add Host
          </button>
        </div>
      </div>

      <div className="filters-bar-card">
        <div className="search-input-group">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search host by name, phone, UPI or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'omb' | 'tournament')}
          >
            <option value="all">All Roles</option>
            <option value="omb">OMB Hosts</option>
            <option value="tournament">Tournament Hosts</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'disabled' | 'deleted')}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
            <option value="deleted">Deleted Hosts (Trash)</option>
          </select>

          <button
            className="secondary small-btn icon-only"
            onClick={fetchHosts}
            disabled={loading}
            title="Refresh hosts list"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
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
          <p>Loading verified host accounts...</p>
        </div>
      ) : filteredHosts.length === 0 ? (
        <div className="state-card">
          <div className="state-icon">
            <Shield size={32} color="#aa3bff" />
          </div>
          <h3>{statusFilter === 'deleted' ? 'No Deleted Hosts' : 'No Hosts Found'}</h3>
          <p className="state-desc">
            {statusFilter === 'deleted'
              ? 'No host accounts are currently in the deleted trash.'
              : 'No hosts matched your query. Click below to add a new verified room host.'}
          </p>
          {statusFilter !== 'deleted' && (
            <button className="primary small-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} /> Add First Host
            </button>
          )}
        </div>
      ) : (
        <div className="hosts-grid">
          {filteredHosts.map((h) => {
            const isHostDeleted =
              deletedIds.includes(h.id) || (h.status || '').toLowerCase() === 'deleted'
            const isActive = (h.status || 'active').toLowerCase() === 'active'
            return (
              <article key={h.id} className="host-card">
                <div className="host-card-top">
                  <div className="host-identity">
                    <div className="host-avatar">
                      {h.name ? h.name.slice(0, 1).toUpperCase() : 'H'}
                    </div>
                    <div>
                      <h4>{h.name}</h4>
                      <p className="host-sub">
                        <span>{h.mobileNumber || 'No phone'}</span>
                        <span>•</span>
                        <span className="mono-code">{h.upiId || 'No UPI'}</span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`status-pill ${
                      isHostDeleted ? 'suspended' : isActive ? 'active' : 'suspended'
                    }`}
                    style={isHostDeleted ? { borderColor: 'var(--coral-color)', color: 'var(--coral-color)' } : {}}
                  >
                    {isHostDeleted ? 'DELETED' : isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                <div className="host-role-row">
                  <span className="badge-tag">{(h.role || 'omb').toUpperCase()} HOST</span>
                  <small className="mono-code muted">ID: {h.id.slice(0, 8)}...</small>
                </div>

                <div className="host-metrics-grid">
                  <div className="hm-box">
                    <span>Unpaid Commission</span>
                    <strong className="text-purple">₹{h.unpaidCommission ?? 0}</strong>
                  </div>
                  <div className="hm-box">
                    <span>Matches Hosted</span>
                    <strong>{h.totalMatchesHosted ?? 0}</strong>
                  </div>
                </div>

                <div className="host-card-actions">
                  {isHostDeleted ? (
                    <button
                      className="success small-btn"
                      onClick={() => handleRestoreHost(h)}
                      title="Restore host account back to Active"
                    >
                      <CheckCircle2 size={13} /> Restore Host
                    </button>
                  ) : (
                    <>
                      <button
                        className="secondary small-btn"
                        onClick={() => {
                          setEditHostId(h.id)
                          setEditName(h.name || '')
                          setEditMobile(h.mobileNumber || '')
                          setEditUpiId(h.upiId || '')
                          setEditRole((h.role === 'tournament' ? 'tournament' : 'omb'))
                          setEditStatus(isActive ? 'active' : 'disabled')
                          setShowEditModal(true)
                        }}
                        title="Edit host details"
                      >
                        <Edit2 size={13} /> Edit
                      </button>

                      <button
                        className="secondary small-btn"
                        onClick={() => {
                          setActiveResetHost(h)
                          setShowResetModal(true)
                        }}
                        title="Reset host password"
                      >
                        <Key size={13} /> Password
                      </button>

                      <button
                        className="success small-btn"
                        onClick={() => {
                          setActivePayHost(h)
                          setShowPayModal(true)
                        }}
                        title="Settle unpaid commission"
                      >
                        <CreditCard size={13} /> Settle
                      </button>

                      <button
                        className={`${isActive ? 'warning' : 'success'} small-btn`}
                        onClick={() => handleToggleStatus(h)}
                        title={isActive ? 'Disable / Suspend host account' : 'Enable host account'}
                      >
                        {isActive ? (
                          <>
                            <Power size={13} /> Disable
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Enable
                          </>
                        )}
                      </button>

                      <button
                        className="danger small-btn"
                        onClick={() => promptDeleteHost(h)}
                        title="Delete host account permanently"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* CREATE HOST MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Host</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateHost} className="modal-form">
              <label>
                Full Name *
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </label>

              <label>
                Mobile Number *
                <input
                  required
                  type="text"
                  placeholder="9876543210"
                  value={createMobile}
                  onChange={(e) => setCreateMobile(e.target.value)}
                />
              </label>

              <label>
                UPI ID *
                <input
                  required
                  type="text"
                  placeholder="name@okaxis / 9876543210@paytm"
                  value={createUpiId}
                  onChange={(e) => setCreateUpiId(e.target.value)}
                />
              </label>

              <label>
                Password *
                <input
                  required
                  type="password"
                  placeholder="Set initial host password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                />
              </label>

              <label>
                Role *
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'omb' | 'tournament')}
                >
                  <option value="omb">OMB Host (1v1 Custom Rooms)</option>
                  <option value="tournament">Tournament Host (Tournaments)</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={createLoading}>
                  {createLoading ? 'Registering...' : 'Create Host'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOST MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Host Details</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateHost} className="modal-form">
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
                Mobile Number
                <input
                  required
                  type="text"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                />
              </label>

              <label>
                UPI ID
                <input
                  required
                  type="text"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                />
              </label>

              <label>
                Role
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'omb' | 'tournament')}
                >
                  <option value="omb">OMB</option>
                  <option value="tournament">Tournament</option>
                </select>
              </label>

              <label>
                Status
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'disabled')}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>

              <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="danger small-btn"
                  onClick={() => {
                    const h = allFetchedHosts.find((item) => item.id === editHostId)
                    if (h) {
                      setShowEditModal(false)
                      promptDeleteHost(h)
                    }
                  }}
                  title="Delete this host permanently"
                >
                  <Trash2 size={13} /> Delete Host
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY MODAL */}
      {showPayModal && activePayHost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Settle Payout</h3>
              <button className="close-btn" onClick={() => setShowPayModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSettlePayment} className="modal-form">
              <p>
                Confirm settling host payout balance for this billing period:
              </p>
              <div className="info-summary-box">
                <div>
                  <strong>Host:</strong> {activePayHost.name}
                </div>
                <div>
                  <strong>UPI:</strong> {activePayHost.upiId || 'N/A'}
                </div>
                <div>
                  <strong>Unpaid Balance:</strong> ₹{activePayHost.unpaidCommission ?? 0}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowPayModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={payLoading}>
                  {payLoading ? 'Processing...' : 'Confirm Mark Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {showResetModal && activeResetHost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Host Password</h3>
              <button className="close-btn" onClick={() => setShowResetModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-form">
              <p>
                Set a new secure password for <strong>{activeResetHost.name}</strong>:
              </p>
              <label>
                New Password *
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
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE HOST CONFIRMATION MODAL */}
      {showDeleteModal && activeDeleteHost && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Trash2 size={20} color="var(--coral-color)" />
                <h3 style={{ color: 'var(--coral-color)' }}>Delete Host: {activeDeleteHost.name}?</h3>
              </div>
              <button
                className="close-btn"
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                ✕
              </button>
            </div>

            <div className="modal-confirm-body">
              <p>
                Are you sure you want to permanently delete host <strong>{activeDeleteHost.name}</strong> ({activeDeleteHost.mobileNumber || 'No phone'})?
              </p>
              <div className="alert-box error" style={{ margin: '12px 0 16px' }}>
                <AlertCircle size={15} />
                <span>
                  Their login credentials and permissions will be permanently revoked.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary small-btn"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger small-btn"
                onClick={handleDeleteHost}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Host'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
