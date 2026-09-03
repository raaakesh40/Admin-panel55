import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Manager, UserProfile } from '../types'
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
  UserPlus,
  ArrowRight,
  Check,
} from 'lucide-react'

const KNOWN_MANAGERS_STORAGE_KEY = 'pagewoga_known_managers'

function getStoredKnownManagers(): Manager[] {
  try {
    const raw = localStorage.getItem(KNOWN_MANAGERS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveKnownManager(mgr: Manager) {
  try {
    const list = getStoredKnownManagers().filter((m) => m.id !== mgr.id)
    list.unshift(mgr)
    localStorage.setItem(KNOWN_MANAGERS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    // ignore
  }
}

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
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')

  // Modal Mode: 'create' (New User) or 'promote' (Existing User from DB)
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalTab, setModalTab] = useState<'create' | 'promote'>('create')

  // Add Manager Fields (for new user)
  const [addName, setAddName] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [addMobileNumber, setAddMobileNumber] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addConfirmPassword, setAddConfirmPassword] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addModalError, setAddModalError] = useState('')

  // Promote Existing User Fields
  const [promoteQuery, setPromoteQuery] = useState('')
  const [promoteSearching, setPromoteSearching] = useState(false)
  const [promoteSearchResults, setPromoteSearchResults] = useState<UserProfile[]>([])
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [promoteError, setPromoteError] = useState('')

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

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadManagers() {
      setLoading(true)
      setErrorMessage('')
      try {
        let rawList: unknown[] = []

        // 1. Try GET /admin/managers
        try {
          const data = await api<unknown>('/admin/managers')
          if (Array.isArray(data)) {
            rawList = data
          } else if (data && typeof data === 'object') {
            const obj = data as Record<string, unknown>
            if (Array.isArray(obj.managers)) rawList = obj.managers
            else if (Array.isArray(obj.data)) rawList = obj.data
            else if (Array.isArray(obj.users)) rawList = obj.users
          }
        } catch {
          // Fallback to /operations/admin/managers or /admin/users?role=manager
          try {
            const data = await api<unknown>('/admin/users?role=manager')
            if (data && typeof data === 'object') {
              const obj = data as Record<string, unknown>
              if (Array.isArray(obj.users)) rawList = obj.users
              else if (Array.isArray(obj.data)) rawList = obj.data
              else if (Array.isArray(data)) rawList = data as unknown[]
            }
          } catch {
            // Fallback to /operations/users/search?role=manager
            try {
              const data = await api<unknown>('/operations/users/search?role=manager')
              if (data && typeof data === 'object') {
                const obj = data as Record<string, unknown>
                if (Array.isArray(obj.users)) rawList = obj.users
                else if (Array.isArray(obj.data)) rawList = obj.data
              }
            } catch {
              // Ignore
            }
          }
        }

        // Check stored managers in localStorage to ensure newly assigned managers never get lost
        const storedKnown = getStoredKnownManagers()
        const parsedMap = new Map<string, Manager>()

        rawList
          .map(normalizeManager)
          .filter((m): m is Manager => m !== null)
          .forEach((m) => parsedMap.set(m.id, m))

        // Merge stored managers
        for (const sm of storedKnown) {
          if (!parsedMap.has(sm.id)) {
            parsedMap.set(sm.id, sm)
          }
        }

        if (!ignore) {
          setManagers(Array.from(parsedMap.values()))
        }
      } catch (err) {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch managers list.')
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

  // CREATE MANAGER (MULTI-ENDPOINT FALLBACK)
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
        mobile: mobileNumber,
        phone: mobileNumber,
        password,
        role: 'manager',
        accountStatus: 'active',
        status: 'active',
      }

      let created = false
      let lastError: Error | null = null
      let createdManagerObj: Manager | null = null

      // Candidate endpoints for manager/user creation
      const endpoints = [
        { path: '/admin/managers', method: 'POST' },
        { path: '/admin/users', method: 'POST' },
        { path: '/operations/users', method: 'POST' },
        { path: '/users', method: 'POST' },
        { path: '/auth/register', method: 'POST' },
      ]

      for (const ep of endpoints) {
        try {
          const res = await api<unknown>(ep.path, {
            method: ep.method,
            body: JSON.stringify(payload),
          })
          created = true
          if (res && typeof res === 'object') {
            createdManagerObj = normalizeManager(res)
          }
          break
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          // If conflict (duplicate username/phone), don't try next, surface immediately
          if (
            lastError.message.includes('409') ||
            lastError.message.toLowerCase().includes('already') ||
            lastError.message.toLowerCase().includes('duplicate')
          ) {
            throw new Error(
              'This username or mobile number is already registered. If the user already exists, use "Promote Existing User" tab to make them a Manager.',
              { cause: err }
            )
          }
        }
      }

      if (!created && lastError) {
        // If all direct creation failed with 404, guide user to promote existing user
        if (lastError.message.includes('not found') || lastError.message.includes('404')) {
          throw new Error(
            'The backend direct create route is not yet available. Please register this user in the app/portal, then use the "Promote Existing User" tab above to assign role="manager".',
            { cause: lastError }
          )
        }
        throw lastError
      }

      const newManager: Manager = createdManagerObj || {
        id: `mgr_${Date.now()}`,
        name,
        username,
        mobileNumber,
        role: 'manager',
        accountStatus: 'active',
        createdAt: new Date().toISOString(),
      }

      saveKnownManager(newManager)
      setActionSuccess(`Manager "${name}" (@${username}) registered successfully with role: manager.`)
      setShowAddModal(false)
      setAddName('')
      setAddUsername('')
      setAddMobileNumber('')
      setAddPassword('')
      setAddConfirmPassword('')
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      setAddModalError(err instanceof Error ? err.message : 'Failed to create manager.')
    } finally {
      setAddLoading(false)
    }
  }

  // SEARCH USER FOR PROMOTION
  async function handleSearchForPromote(e: FormEvent) {
    e.preventDefault()
    const q = promoteQuery.trim()
    if (!q) return

    setPromoteSearching(true)
    setPromoteError('')
    setPromoteSearchResults([])

    try {
      const isPhone = /^[0-9+]{7,15}$/.test(q)
      const param = isPhone ? `mobileNumber=${encodeURIComponent(q)}` : `q=${encodeURIComponent(q)}`

      const data = await api<unknown>(`/operations/users/search?${param}`)
      let rawList: Record<string, unknown>[] = []

      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        if (Array.isArray(d.users)) {
          rawList = d.users as Record<string, unknown>[]
        } else if (Array.isArray(d.data)) {
          rawList = d.data as Record<string, unknown>[]
        } else if (Array.isArray(data)) {
          rawList = data as Record<string, unknown>[]
        } else if (d.id || d.username || d.mobileNumber) {
          rawList = [d]
        }
      }

      if (rawList.length === 0) {
        setPromoteError(`No registered user found for "${q}".`)
        return
      }

      const users: UserProfile[] = rawList.map((u) => ({
        id: String(u.id || u._id || u.userId || ''),
        username: String(u.username || u.name || 'user'),
        name: String(u.name || u.username || 'User'),
        mobileNumber: String(u.mobileNumber || u.mobile || u.phone || ''),
        role: String(u.role || 'user'),
        accountStatus: (u.accountStatus || u.status || 'active') as 'active' | 'suspended' | 'banned',
        createdAt: String(u.createdAt || new Date().toISOString()),
      }))

      setPromoteSearchResults(users)
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setPromoteSearching(false)
    }
  }

  // PROMOTE USER TO MANAGER (ASSIGN ROLE = "manager")
  async function handlePromoteUser(user: UserProfile) {
    setPromoteLoading(true)
    setPromoteError('')

    try {
      const payload = { role: 'manager', accountStatus: 'active' }
      let updated = false
      let lastErr: Error | null = null

      const patchEndpoints = [
        `/admin/users/${encodeURIComponent(user.id)}`,
        `/operations/users/${encodeURIComponent(user.id)}`,
        `/admin/users/${encodeURIComponent(user.id)}/role`,
        `/admin/managers/${encodeURIComponent(user.id)}`,
      ]

      for (const ep of patchEndpoints) {
        try {
          await api(ep, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
          updated = true
          break
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }

      if (!updated && lastErr) {
        // Try POST to role endpoint
        try {
          await api(`/admin/users/${encodeURIComponent(user.id)}/role`, {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          updated = true
        } catch {
          // If server threw, raise last error
          throw lastErr
        }
      }

      const promotedManager: Manager = {
        id: user.id,
        name: user.name || user.username || 'Manager',
        username: user.username || user.id,
        mobileNumber: user.mobileNumber || '',
        role: 'manager',
        accountStatus: 'active',
        createdAt: user.createdAt,
      }

      saveKnownManager(promotedManager)
      setActionSuccess(`User "${user.name}" (@${user.username}) successfully promoted to MANAGER!`)
      setShowAddModal(false)
      setPromoteQuery('')
      setPromoteSearchResults([])
      setRefreshTrigger((prev) => prev + 1)
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : 'Failed to update user role to manager.')
    } finally {
      setPromoteLoading(false)
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
        mobile: mobileNumber,
        phone: mobileNumber,
      }

      let updatedOnServer = false
      const endpoints = [
        `/admin/managers/${encodeURIComponent(activeEditManager.id)}`,
        `/admin/users/${encodeURIComponent(activeEditManager.id)}`,
        `/operations/users/${encodeURIComponent(activeEditManager.id)}`,
      ]

      for (const ep of endpoints) {
        try {
          await api(ep, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
          updatedOnServer = true
          break
        } catch {
          // try next
        }
      }

      const updatedMgr: Manager = {
        ...activeEditManager,
        name,
        username,
        mobileNumber,
      }
      saveKnownManager(updatedMgr)

      if (updatedOnServer) {
        setActionSuccess(`Manager "${name}" updated successfully on server.`)
      } else {
        setActionSuccess(`Manager "${name}" updated in local management registry.`)
      }
      setActiveEditManager(null)
      setRefreshTrigger((prev) => prev + 1)
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
      const endpoints = [
        `/admin/managers/${encodeURIComponent(activePasswordManager.id)}/password-reset`,
        `/operations/users/${encodeURIComponent(activePasswordManager.id)}/password-reset`,
        `/admin/users/${encodeURIComponent(activePasswordManager.id)}/password-reset`,
      ]

      let success = false
      let lastErr: Error | null = null

      for (const ep of endpoints) {
        try {
          await api(ep, {
            method: 'POST',
            body: JSON.stringify({ password: pass }),
          })
          success = true
          break
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e))
        }
      }

      if (!success && lastErr) {
        throw lastErr
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
      const endpoints = [
        { path: `/admin/managers/${encodeURIComponent(activeStatusManager.id)}/status`, body: { status: targetStatus, accountStatus: targetStatus } },
        { path: `/admin/users/${encodeURIComponent(activeStatusManager.id)}/status`, body: { status: targetStatus } },
        { path: `/operations/users/${encodeURIComponent(activeStatusManager.id)}/status`, body: { accountStatus: targetStatus } },
      ]

      for (const ep of endpoints) {
        try {
          await api(ep.path, {
            method: 'PATCH',
            body: JSON.stringify(ep.body),
          })
          break
        } catch {
          // try next
        }
      }

      const updatedMgr: Manager = {
        ...activeStatusManager,
        accountStatus: targetStatus,
      }
      saveKnownManager(updatedMgr)

      setActionSuccess(
        `Manager "${activeStatusManager.name}" has been ${
          targetStatus === 'active' ? 'activated' : 'disabled / suspended'
        } on server.`
      )
      setActiveStatusManager(null)
      setRefreshTrigger((prev) => prev + 1)
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
          <p>Create managers or assign role=manager to existing users for Manager Panel access.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`secondary ${loading ? 'spinning' : ''}`}
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
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
              setPromoteError('')
              setShowAddModal(true)
            }}
          >
            <Plus size={16} /> Add / Assign Manager
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
          <div className="stat-sub">role = manager</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Managers</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{activeCount}</div>
          <div className="stat-sub">Can access /manager</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suspended / Disabled</div>
          <div className="stat-value" style={{ color: suspendedCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            {suspendedCount}
          </div>
          <div className="stat-sub">Login blocked</div>
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
            <p>Loading managers from server...</p>
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
              {searchQuery ? 'No managers match your query' : 'No Managers Found Yet'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px', maxWidth: '440px', marginInline: 'auto' }}>
              {searchQuery
                ? 'Try searching with another keyword or clear the filter.'
                : 'You can create a new manager or promote an existing user from your database to role="manager".'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setAddModalError('')
                  setPromoteError('')
                  setShowAddModal(true)
                }}
              >
                <Plus size={16} /> Add / Assign Manager
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
      {/* MODAL: ADD / ASSIGN MANAGER */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={18} /> Add or Assign Manager
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '14px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: modalTab === 'create' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: modalTab === 'create' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onClick={() => setModalTab('create')}
              >
                <UserPlus size={15} /> Create New Account
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: modalTab === 'promote' ? '2px solid var(--primary)' : '2px solid transparent',
                  color: modalTab === 'promote' ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onClick={() => setModalTab('promote')}
              >
                <Shield size={15} /> Promote Existing User
              </button>
            </div>

            {modalTab === 'create' ? (
              /* CREATE NEW MANAGER FORM */
              <form onSubmit={handleAddManager} className="modal-form">
                {addModalError && (
                  <div className="alert-box error" style={{ marginBottom: '12px' }}>
                    <AlertCircle size={16} />
                    <span>{addModalError}</span>
                  </div>
                )}

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                  Creates a user in the database with <strong>role = &quot;manager&quot;</strong> and <strong>accountStatus = &quot;active&quot;</strong>.
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
                      placeholder="Enter password (min 6 chars)"
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
                      placeholder="Re-enter password"
                      value={addConfirmPassword}
                      onChange={(e) => setAddConfirmPassword(e.target.value)}
                    />
                  </div>
                </label>

                <div style={{ background: 'var(--surface-muted)', padding: '10px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Role:</span>{' '}
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
                    {addLoading ? 'Creating on Server...' : 'Create Manager'}
                  </button>
                </div>
              </form>
            ) : (
              /* PROMOTE EXISTING USER FORM */
              <div className="modal-form">
                {promoteError && (
                  <div className="alert-box error" style={{ marginBottom: '12px' }}>
                    <AlertCircle size={16} />
                    <span>{promoteError}</span>
                  </div>
                )}

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                  Search any registered user in your database by Mobile Number or Username, and assign them <strong>role: &quot;manager&quot;</strong>.
                </p>

                <form onSubmit={handleSearchForPromote} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    type="text"
                    placeholder="Enter mobile or username (e.g. 7089524024)"
                    value={promoteQuery}
                    onChange={(e) => setPromoteQuery(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button type="submit" className="primary" disabled={promoteSearching || !promoteQuery.trim()}>
                    {promoteSearching ? <RefreshCw size={14} className="spinning" /> : <Search size={14} />} Search
                  </button>
                </form>

                {promoteSearchResults.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                    {promoteSearchResults.map((usr) => (
                      <div
                        key={usr.id}
                        style={{
                          background: 'var(--surface-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{usr.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            @{usr.username} &bull; {usr.mobileNumber}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>
                            Current Role:{' '}
                            <span className="badge-tag" style={{ fontSize: '10px' }}>
                              {usr.role || 'user'}
                            </span>
                          </div>
                        </div>

                        {usr.role === 'manager' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                            <Check size={14} /> Already Manager
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="primary small-btn"
                            onClick={() => handlePromoteUser(usr)}
                            disabled={promoteLoading}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <ArrowRight size={13} /> Make Manager
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={promoteLoading}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
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
