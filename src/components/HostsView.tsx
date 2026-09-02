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
  User,
  Phone,
  Hash,
} from 'lucide-react'

function normalizeHost(raw: unknown): Host | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const obj = raw as Record<string, unknown>
  const user = (obj.user && typeof obj.user === 'object' ? obj.user : {}) as Record<string, unknown>
  const userNested = (obj.User && typeof obj.User === 'object' ? obj.User : {}) as Record<string, unknown>
  const hostObj = (obj.host && typeof obj.host === 'object' ? obj.host : {}) as Record<string, unknown>
  const profile = (obj.profile && typeof obj.profile === 'object' ? obj.profile : {}) as Record<string, unknown>
  const account = (obj.account && typeof obj.account === 'object' ? obj.account : {}) as Record<string, unknown>

  // Check if permanently or soft-deleted on server
  const isDeleted = Boolean(
    obj.isDeleted ||
    obj.is_deleted ||
    obj.deleted ||
    obj.deletedAt ||
    obj.deleted_at ||
    user.isDeleted ||
    user.is_deleted ||
    user.deleted ||
    user.deletedAt ||
    user.deleted_at ||
    obj.status === 'deleted' ||
    user.status === 'deleted' ||
    obj.accountStatus === 'deleted' ||
    user.accountStatus === 'deleted' ||
    obj.status === 'removed' ||
    user.status === 'removed'
  )

  if (isDeleted) {
    return null
  }

  const id = String(
    obj.id ||
    obj._id ||
    obj.hostId ||
    obj.userId ||
    user.id ||
    userNested.id ||
    hostObj.id ||
    ''
  )

  if (!id) {
    return null
  }
  
  // Extract Full Name
  const name = String(
    obj.name ||
    user.name ||
    userNested.name ||
    hostObj.name ||
    profile.name ||
    account.name ||
    obj.fullName ||
    user.fullName ||
    'Host'
  ).trim()

  // Extract Live Username directly from Server API response
  const rawUsername =
    obj.username ||
    user.username ||
    userNested.username ||
    hostObj.username ||
    profile.username ||
    account.username ||
    obj.userName ||
    user.userName ||
    obj.user_name ||
    user.user_name ||
    obj.host_username ||
    obj.hostUsername ||
    user.handle ||
    obj.handle ||
    profile.handle ||
    obj.slug ||
    (typeof user.email === 'string' && user.email.includes('@') ? user.email.split('@')[0] : '') ||
    (typeof obj.email === 'string' && obj.email.includes('@') ? obj.email.split('@')[0] : '')

  const username = rawUsername ? String(rawUsername).trim().replace(/^@/, '') : undefined

  // Extract Mobile / Phone
  const mobileNumber = String(
    obj.mobileNumber ||
    obj.mobile_number ||
    obj.phone ||
    obj.mobile ||
    user.mobileNumber ||
    user.mobile_number ||
    user.phone ||
    userNested.mobileNumber ||
    userNested.phone ||
    account.mobileNumber ||
    account.phone ||
    ''
  ).trim() || undefined

  // Extract UPI
  const upiId = String(
    obj.upiId ||
    obj.upi_id ||
    obj.upi ||
    user.upiId ||
    user.upi_id ||
    userNested.upiId ||
    account.upiId ||
    ''
  ).trim() || undefined

  // Extract Role
  const rawRole = String(obj.role || user.role || userNested.role || 'omb').toLowerCase()
  const role: 'omb' | 'tournament' = rawRole.includes('tourn') ? 'tournament' : 'omb'

  // Extract Status
  const rawStatus = String(obj.status || user.status || user.accountStatus || obj.accountStatus || 'active').toLowerCase()
  const status: 'active' | 'disabled' | 'suspended' =
    rawStatus === 'disabled' || rawStatus === 'inactive' || rawStatus === 'suspended'
      ? 'disabled'
      : rawStatus === 'banned'
      ? 'suspended'
      : 'active'

  const totalMatchesHosted = Number(
    obj.totalMatchesHosted ?? obj.total_matches ?? obj.matchesHosted ?? obj.matches_hosted ?? 0
  )
  const unpaidCommission = Number(
    obj.unpaidCommission ?? obj.unpaid_commission ?? obj.commission ?? obj.unpaid ?? 0
  )

  return {
    id,
    name,
    username,
    mobileNumber,
    upiId,
    role,
    status,
    totalMatchesHosted,
    unpaidCommission,
    createdAt: obj.createdAt ? String(obj.createdAt) : undefined,
  }
}

export function HostsView() {
  const [allFetchedHosts, setAllFetchedHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'omb' | 'tournament'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all')
  const [actionSuccess, setActionSuccess] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [modalErrorMessage, setModalErrorMessage] = useState('')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createUsername, setCreateUsername] = useState('')
  const [createMobile, setCreateMobile] = useState('')
  const [createUpiId, setCreateUpiId] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<'omb' | 'tournament'>('omb')
  const [createLoading, setCreateLoading] = useState(false)

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editHostId, setEditHostId] = useState('')
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
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

  // Fetch Hosts directly from Server: GET /api/hosts or /api/admin/hosts
  async function fetchHosts() {
    setLoading(true)
    setErrorMessage('')
    try {
      const params = new URLSearchParams()
      if (statusFilter === 'disabled') {
        params.append('includeDisabled', 'true')
        params.append('status', 'disabled')
      } else if (statusFilter === 'active') {
        params.append('status', 'active')
      }
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }
      
      let data: unknown = null
      try {
        data = await api<unknown>(`/hosts?${params.toString()}`)
      } catch {
        data = await api<unknown>(`/admin/hosts?${params.toString()}`).catch(() => null)
      }

      let rawList: unknown[] = []
      if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        if (Array.isArray(obj.hosts)) {
          rawList = obj.hosts
        } else if (Array.isArray(obj.data)) {
          rawList = obj.data
        } else if (Array.isArray(data)) {
          rawList = data
        }
      }

      const list: Host[] = rawList
        .map(normalizeHost)
        .filter((h): h is Host => h !== null && Boolean(h.id))
      setAllFetchedHosts(list)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch hosts list from server.')
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
        if (statusFilter === 'disabled') {
          params.append('includeDisabled', 'true')
          params.append('status', 'disabled')
        } else if (statusFilter === 'active') {
          params.append('status', 'active')
        }
        if (roleFilter !== 'all') {
          params.append('role', roleFilter)
        }
        
        let data: unknown = null
        try {
          data = await api<unknown>(`/hosts?${params.toString()}`)
        } catch {
          data = await api<unknown>(`/admin/hosts?${params.toString()}`).catch(() => null)
        }

        if (isMounted && data && typeof data === 'object') {
          const obj = data as Record<string, unknown>
          let rawList: unknown[] = []
          if (Array.isArray(obj.hosts)) {
            rawList = obj.hosts
          } else if (Array.isArray(obj.data)) {
            rawList = obj.data
          } else if (Array.isArray(data)) {
            rawList = data
          }
          const list: Host[] = rawList
            .map(normalizeHost)
            .filter((h): h is Host => h !== null && Boolean(h.id))
          setAllFetchedHosts(list)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [roleFilter, statusFilter])

  // Helper to build normalized payload covering all possible backend ORM & naming conventions
  function buildHostPayload(params: {
    name: string
    username?: string
    mobileNumber: string
    upiId: string
    role?: 'omb' | 'tournament' | string
    status?: 'active' | 'disabled' | string
    password?: string
  }) {
    const rawUser = params.username ? params.username.trim().replace(/^@/, '') : ''
    const cleanUsername = rawUser ? rawUser.toLowerCase().replace(/[^a-z0-9_]/g, '') : undefined
    const cleanName = params.name.trim()
    const cleanMobile = params.mobileNumber.trim()
    const cleanUpi = params.upiId.trim()
    const isAct = params.status === 'active'

    const payload: Record<string, unknown> = {
      name: cleanName,
      fullName: cleanName,
      mobileNumber: cleanMobile,
      phone: cleanMobile,
      mobile: cleanMobile,
      upiId: cleanUpi,
      upi_id: cleanUpi,
      role: params.role || 'omb',
      status: params.status || 'active',
      isActive: isAct,
      accountStatus: isAct ? 'active' : 'suspended',
      user: {
        name: cleanName,
        mobileNumber: cleanMobile,
        phone: cleanMobile,
        upiId: cleanUpi,
        role: params.role || 'omb',
        status: params.status || 'active',
      },
    }

    if (cleanUsername) {
      payload.username = cleanUsername
      payload.userName = cleanUsername
      payload.user_name = cleanUsername
      payload.handle = cleanUsername
      payload.hostUsername = cleanUsername
      if (typeof payload.user === 'object' && payload.user !== null) {
        const u = payload.user as Record<string, unknown>
        u.username = cleanUsername
        u.userName = cleanUsername
      }
    }

    if (params.password) {
      payload.password = params.password
    }

    return payload
  }

  // 1) Create Host
  async function handleCreateHost(e: FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setErrorMessage('')
    setModalErrorMessage('')
    setActionSuccess('')

    const name = createName.trim()
    const mobileNumber = createMobile.trim()
    const upiId = createUpiId.trim()
    const password = createPassword

    if (!name || !mobileNumber || !upiId || !password) {
      setModalErrorMessage('Please fill in all required host fields.')
      setCreateLoading(false)
      return
    }

    const payload = buildHostPayload({
      name,
      username: createUsername,
      mobileNumber,
      upiId,
      password,
      role: createRole,
      status: 'active',
    })

    try {
      let created = false
      let lastErr: unknown = null

      const endpoints = [
        { path: '/admin/hosts', method: 'POST' },
        { path: '/hosts', method: 'POST' },
        { path: '/admin/users', method: 'POST' },
      ]

      for (const ep of endpoints) {
        try {
          await api(ep.path, {
            method: ep.method,
            body: JSON.stringify(payload),
          })
          created = true
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (!created && lastErr) {
        throw lastErr
      }

      setActionSuccess(`Host "${name}" registered on server successfully.`)
      setShowCreateModal(false)
      setCreateName('')
      setCreateUsername('')
      setCreateMobile('')
      setCreateUpiId('')
      setCreatePassword('')
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register host.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
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
    setModalErrorMessage('')
    setActionSuccess('')

    const payload = buildHostPayload({
      name: editName,
      username: editUsername,
      mobileNumber: editMobile,
      upiId: editUpiId,
      role: editRole,
      status: editStatus,
    })

    try {
      let updated = false
      let lastErr: unknown = null

      const updateAttempts = [
        { path: `/admin/hosts/${encodeURIComponent(editHostId)}`, method: 'PATCH' },
        { path: `/admin/hosts/${encodeURIComponent(editHostId)}`, method: 'PUT' },
        { path: `/hosts/${encodeURIComponent(editHostId)}`, method: 'PATCH' },
        { path: `/hosts/${encodeURIComponent(editHostId)}`, method: 'PUT' },
        { path: `/admin/hosts/${encodeURIComponent(editHostId)}`, method: 'POST' },
        { path: `/admin/hosts/${encodeURIComponent(editHostId)}/update`, method: 'POST' },
        { path: `/admin/users/${encodeURIComponent(editHostId)}`, method: 'PATCH' },
        { path: `/admin/users/${encodeURIComponent(editHostId)}`, method: 'PUT' },
      ]

      for (const attempt of updateAttempts) {
        try {
          await api(attempt.path, {
            method: attempt.method,
            body: JSON.stringify(payload),
          })
          updated = true
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (!updated && lastErr) {
        throw lastErr
      }

      setActionSuccess(`Host details updated successfully on server.`)
      setShowEditModal(false)
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update host.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
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
      const attempts = [
        { path: `/admin/hosts/${encodeURIComponent(host.id)}/status`, method: 'PATCH', body: { status: newStatus, isActive: !isCurrentlyActive } },
        { path: `/admin/hosts/${encodeURIComponent(host.id)}`, method: 'PATCH', body: { status: newStatus, isActive: !isCurrentlyActive } },
        { path: `/hosts/${encodeURIComponent(host.id)}/status`, method: 'PATCH', body: { status: newStatus } },
        { path: `/admin/users/${encodeURIComponent(host.id)}/status`, method: 'PATCH', body: { status: newStatus, accountStatus: newStatus } },
      ]

      let done = false
      let lastErr: unknown = null
      for (const att of attempts) {
        try {
          await api(att.path, {
            method: att.method,
            body: JSON.stringify(att.body),
          })
          done = true
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (!done && lastErr) {
        throw lastErr
      }

      setActionSuccess(`Host "${host.name}" status updated to ${newStatus.toUpperCase()} on server.`)
      await fetchHosts()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle status on server.')
    }
  }

  // 4) Mark Host Paid
  async function handleSettlePayment(e: FormEvent) {
    e.preventDefault()
    if (!activePayHost) return
    setPayLoading(true)
    setErrorMessage('')
    setModalErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${activePayHost.id}/pay`, {
        method: 'POST',
      })
      setActionSuccess(`Host payout marked as settled on server.`)
      setShowPayModal(false)
      setActivePayHost(null)
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record payout on server.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
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
    setModalErrorMessage('')
    setActionSuccess('')

    try {
      const attempts = [
        { path: `/admin/hosts/${encodeURIComponent(activeResetHost.id)}/password-reset`, method: 'POST' },
        { path: `/admin/hosts/${encodeURIComponent(activeResetHost.id)}/reset-password`, method: 'POST' },
        { path: `/admin/users/${encodeURIComponent(activeResetHost.id)}/password-reset`, method: 'POST' },
        { path: `/admin/hosts/${encodeURIComponent(activeResetHost.id)}/password`, method: 'PATCH' },
      ]

      let done = false
      let lastErr: unknown = null
      for (const att of attempts) {
        try {
          await api(att.path, {
            method: att.method,
            body: JSON.stringify({ password: resetPassInput }),
          })
          done = true
          break
        } catch (err) {
          lastErr = err
        }
      }

      if (!done && lastErr) {
        throw lastErr
      }

      setActionSuccess(`Password reset successfully for ${activeResetHost.name} on server.`)
      setShowResetModal(false)
      setActiveResetHost(null)
      setResetPassInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password on server.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
    } finally {
      setResetLoading(false)
    }
  }

  // 6) Delete / Deactivate Host
  function promptDeleteHost(h: Host) {
    setActiveDeleteHost(h)
    setModalErrorMessage('')
    setShowDeleteModal(true)
  }

  // Permanent Delete: DELETE /api/admin/hosts/:id?permanent=true
  // Permanent delete only succeeds if host has no competitions, participants, transactions, deposits, or active assignments.
  // If history exists, backend returns 409 Conflict.
  async function handlePermanentDeleteHost() {
    if (!activeDeleteHost) return
    const targetId = activeDeleteHost.id
    const targetName = activeDeleteHost.name
    setDeleteLoading(true)
    setErrorMessage('')
    setModalErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${encodeURIComponent(targetId)}?permanent=true`, {
        method: 'DELETE',
      })

      setActionSuccess(`Host "${targetName}" was permanently deleted from server.`)
      setShowDeleteModal(false)
      setActiveDeleteHost(null)

      // Refresh live server state
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to permanently delete host on server.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Disable Host: DELETE /api/admin/hosts/:id
  // Changes host status to disabled on server without permanent removal.
  async function handleDisableHost() {
    if (!activeDeleteHost) return
    const targetId = activeDeleteHost.id
    const targetName = activeDeleteHost.name
    setDeleteLoading(true)
    setErrorMessage('')
    setModalErrorMessage('')
    setActionSuccess('')

    try {
      await api(`/admin/hosts/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      })

      setActionSuccess(`Host "${targetName}" has been disabled (status: disabled) on server.`)
      setShowDeleteModal(false)
      setActiveDeleteHost(null)

      // Refresh live server state
      await fetchHosts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disable host on server.'
      setErrorMessage(msg)
      setModalErrorMessage(msg)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filter live hosts based on search and status
  const filteredHosts = allFetchedHosts.filter((h) => {
    if (!h || !h.id) return false
    const isActive = (h.status || 'active').toLowerCase() === 'active'

    const q = searchQuery.toLowerCase().trim()
    const matchesQuery =
      !q ||
      h.name?.toLowerCase().includes(q) ||
      h.username?.toLowerCase().includes(q) ||
      h.mobileNumber?.toLowerCase().includes(q) ||
      h.upiId?.toLowerCase().includes(q) ||
      h.id?.toLowerCase().includes(q)

    if (!matchesQuery) return false

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
          <p>Manage live room host accounts, match assignments, settlements, and credentials directly on the server</p>
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
            placeholder="Search host by name, username, phone, UPI or ID..."
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
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          <button
            className="secondary small-btn icon-only"
            onClick={fetchHosts}
            disabled={loading}
            title="Refresh hosts list from live server"
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
          <p>Loading live host accounts from server...</p>
        </div>
      ) : filteredHosts.length === 0 ? (
        <div className="state-card">
          <div className="state-icon">
            <Shield size={32} color="#aa3bff" />
          </div>
          <h3>No Hosts Found</h3>
          <p className="state-desc">
            No live hosts matched your query. Click below to add a new verified room host.
          </p>
          <button className="primary small-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Add First Host
          </button>
        </div>
      ) : (
        <div className="hosts-grid">
          {filteredHosts.map((h) => {
            const isActive = (h.status || 'active').toLowerCase() === 'active'
            return (
              <article key={h.id} className="host-card">
                <div className="host-card-top">
                  <div className="host-identity">
                    <div className="host-avatar">
                      {h.name ? h.name.slice(0, 1).toUpperCase() : 'H'}
                    </div>
                    <div className="host-title-details">
                      <div className="host-name-row">
                        <h4>{h.name}</h4>
                        {h.username ? (
                          <span className="host-handle-badge" title={`Server Host Username: @${h.username}`}>
                            @{h.username}
                          </span>
                        ) : (
                          <span className="host-handle-badge muted" title="No username assigned on server" style={{ opacity: 0.6 }}>
                            @—
                          </span>
                        )}
                      </div>
                      <p className="host-sub">
                        <span className="mono-code text-purple">
                          {h.username ? `@${h.username}` : 'No username'}
                        </span>
                        <span>•</span>
                        <span>{h.mobileNumber || 'No phone'}</span>
                        <span>•</span>
                        <span className="mono-code">{h.upiId || 'No UPI'}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`status-pill ${isActive ? 'active' : 'suspended'}`}>
                    {isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                {/* Host Info Details Box with Username, Mobile, UPI & ID */}
                <div className="host-details-box">
                  <div className="detail-line">
                    <span>
                      <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                      Username:
                    </span>
                    <strong className="mono-code text-purple">
                      {h.username ? `@${h.username}` : '—'}
                    </strong>
                  </div>
                  <div className="detail-line">
                    <span>
                      <Phone size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                      Mobile Number:
                    </span>
                    <strong className="mono-code">{h.mobileNumber || '—'}</strong>
                  </div>
                  <div className="detail-line">
                    <span>
                      <CreditCard size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                      UPI ID:
                    </span>
                    <strong className="mono-code">{h.upiId || '—'}</strong>
                  </div>
                  <div className="detail-line">
                    <span>
                      <Hash size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                      Host ID:
                    </span>
                    <span className="mono-code muted" title={h.id}>
                      {h.id.slice(0, 10)}...
                    </span>
                  </div>
                </div>

                <div className="host-role-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="badge-tag">{(h.role || 'omb').toUpperCase()} HOST</span>
                    {h.username && (
                      <span className="host-id-chip" title="Server Username">
                        User: <strong>@{h.username}</strong>
                      </span>
                    )}
                  </div>
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
                  <button
                    className="secondary small-btn"
                    onClick={() => {
                      setEditHostId(h.id)
                      setEditName(h.name || '')
                      setEditUsername(h.username || '')
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
                    title="Reset host password on server"
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
                    title="Delete host account permanently from server"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
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
              {modalErrorMessage && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{modalErrorMessage}</span>
                </div>
              )}
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
                Username (Host Handle)
                <input
                  type="text"
                  placeholder="e.g. rahul_host"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
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
              {modalErrorMessage && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{modalErrorMessage}</span>
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
                Username (Host Handle)
                <input
                  type="text"
                  placeholder="e.g. rahul_host"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
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
                  title="Delete this host permanently from server"
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
                Confirm settling host payout balance for this billing period directly on server:
              </p>
              <div className="info-summary-box">
                <div>
                  <strong>Host:</strong> {activePayHost.name}{' '}
                  {activePayHost.username && (
                    <span className="mono-code text-purple">(@{activePayHost.username})</span>
                  )}
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

      {/* RESET PASSWORD MODAL */}
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
              {modalErrorMessage && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{modalErrorMessage}</span>
                </div>
              )}
              <p>
                Set a new access password on server for{' '}
                <strong>
                  {activeResetHost.name}
                  {activeResetHost.username ? ` (@${activeResetHost.username})` : ''}
                </strong>
                :
              </p>
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
                  onClick={() => {
                    setShowResetModal(false)
                    setActiveResetHost(null)
                    setResetPassInput('')
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={resetLoading}>
                  {resetLoading ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && activeDeleteHost && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Host Account</h3>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-form">
              {modalErrorMessage && (
                <div className="alert-box error" style={{ marginBottom: '12px' }}>
                  <AlertCircle size={16} />
                  <span>{modalErrorMessage}</span>
                </div>
              )}
              <div className="alert-box error">
                <AlertCircle size={18} />
                <span>
                  Are you sure you want to delete or disable host{' '}
                  <strong>
                    &quot;{activeDeleteHost.name}&quot;
                    {activeDeleteHost.username ? ` (@${activeDeleteHost.username})` : ''}
                  </strong>{' '}
                  on the server?
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <strong>Permanent Delete:</strong> Removes the host record if they have no financial or competition history. If history exists, the server requires disabling.
                <br />
                <strong>Disable Host:</strong> Safely sets status to disabled, revoking access while preserving past match records.
              </p>

              <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setActiveDeleteHost(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="secondary"
                  style={{ color: 'var(--warning, #e67e22)', borderColor: 'rgba(230, 126, 34, 0.4)' }}
                  onClick={handleDisableHost}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Processing...' : 'Disable Host (Safe)'}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={handlePermanentDeleteHost}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting on Server...' : 'Permanent Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

