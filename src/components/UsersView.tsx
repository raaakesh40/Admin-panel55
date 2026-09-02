import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import type { UserResult } from '../types'
import { api } from '../services/api'
import {
  Search,
  Coins,
  ShieldAlert,
  UserCheck,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  CreditCard,
} from 'lucide-react'

interface PayoutAccountItem {
  id: string
  type?: string
  upiId?: string
  accountNumber?: string
  ifsc?: string
  bankName?: string
  holderName?: string
  status?: string
  isPrimary?: boolean
  createdAt?: string
}

export function UsersView() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UserResult | null>(null)
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  // Payout accounts
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccountItem[]>([])
  const [payoutLoading, setPayoutLoading] = useState(false)

  // Action states
  const [statusLoading, setStatusLoading] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustWalletType, setAdjustWalletType] = useState<'play_coins' | 'winning_coins'>('play_coins')
  const [adjustAction, setAdjustAction] = useState<'add' | 'deduct'>('add')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  // Password reset modal
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const fetchPayoutAccounts = useCallback(async (userId: string) => {
    if (!userId) {
      setPayoutAccounts([])
      return
    }
    setPayoutLoading(true)
    try {
      let data: unknown = null
      try {
        data = await api<unknown>(`/operations/users/${encodeURIComponent(userId)}/payout-accounts`)
      } catch {
        data = await api<unknown>(`/admin/users/${encodeURIComponent(userId)}/payout-accounts`).catch(() => null)
      }

      let list: PayoutAccountItem[] = []
      if (Array.isArray(data)) {
        list = data as PayoutAccountItem[]
      } else if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>
        if (Array.isArray(obj.accounts)) list = obj.accounts as PayoutAccountItem[]
        else if (Array.isArray(obj.data)) list = obj.data as PayoutAccountItem[]
        else if (Array.isArray(obj.payoutAccounts)) list = obj.payoutAccounts as PayoutAccountItem[]
      }
      setPayoutAccounts(list)
    } catch {
      setPayoutAccounts([])
    } finally {
      setPayoutLoading(false)
    }
  }, [])

  function normalizeUserToResult(userObj: Record<string, unknown>): UserResult {
    return {
      user: {
        id: String(userObj.id || userObj._id || userObj.userId || ''),
        username: String(userObj.username || userObj.userName || userObj.name || 'player'),
        name: String(userObj.name || userObj.username || 'Player'),
        mobileNumber: String(userObj.mobileNumber || userObj.mobile || userObj.phone || ''),
        email: userObj.email ? String(userObj.email) : undefined,
        accountStatus: (userObj.accountStatus || userObj.status || 'active') as 'active' | 'suspended' | 'banned',
        role: String(userObj.role || 'user'),
        createdAt: String(userObj.createdAt || userObj.created_at || new Date().toISOString()),
      },
      wallets: [
        {
          walletType: 'play_coins',
          balance: Number(userObj.playCoins ?? userObj.play_coins ?? userObj.playBalance ?? 0),
          available: Number(userObj.playCoins ?? userObj.play_coins ?? userObj.playBalance ?? 0),
        },
        {
          walletType: 'winning_coins',
          balance: Number(userObj.winningCoins ?? userObj.winning_coins ?? userObj.winningBalance ?? 0),
          available: Number(userObj.winningCoins ?? userObj.winning_coins ?? userObj.winningBalance ?? 0),
        },
      ],
      totals: {
        deposited: Number(userObj.totalDeposited ?? userObj.deposited ?? 0),
        withdrawn: Number(userObj.totalWithdrawn ?? userObj.withdrawn ?? 0),
      },
      activity: {
        ombsJoined: Number(userObj.ombsJoined ?? 0),
        ombsWon: Number(userObj.ombsWon ?? 0),
        tournamentsJoined: Number(userObj.tournamentsJoined ?? 0),
        tournamentsWon: Number(userObj.tournamentsWon ?? 0),
      },
      current: {
        omb: null,
        tournament: null,
      },
    }
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setErrorMessage('')
    setActionSuccess('')
    setResult(null)
    setSearchResults([])

    try {
      const clean = query.trim()
      const isPhone = /^[0-9+]{7,15}$/.test(clean)
      const param = isPhone ? `mobileNumber=${encodeURIComponent(clean)}` : `q=${encodeURIComponent(clean)}`
      
      const data = await api<unknown>(`/operations/users/search?${param}`)
      
      let rawUsers: Record<string, unknown>[] = []
      if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        if (Array.isArray(d.users)) {
          rawUsers = d.users as Record<string, unknown>[]
        } else if (Array.isArray(d.data)) {
          rawUsers = d.data as Record<string, unknown>[]
        } else if (Array.isArray(data)) {
          rawUsers = data as Record<string, unknown>[]
        } else if (d.user && typeof d.user === 'object') {
          setResult(d as unknown as UserResult)
          return
        } else if (d.id || d.username || d.mobileNumber) {
          rawUsers = [d]
        }
      }

      if (rawUsers.length === 0) {
        setErrorMessage(`No user found for "${clean}".`)
        return
      }

      const normalizedList = rawUsers.map(normalizeUserToResult)
      setSearchResults(normalizedList)
      setResult(normalizedList[0])
      if (normalizedList[0]?.user?.id) {
        fetchPayoutAccounts(normalizedList[0].user.id)
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'User not found.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(newStatus: 'active' | 'suspended' | 'banned') {
    if (!result) return
    setStatusLoading(true)
    setActionSuccess('')
    setErrorMessage('')

    const apiStatus = newStatus === 'active' ? 'active' : 'suspended'

    try {
      try {
        await api(`/admin/users/${encodeURIComponent(result.user.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: apiStatus }),
        })
      } catch {
        await api(`/operations/users/${encodeURIComponent(result.user.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ accountStatus: apiStatus }),
        })
      }

      setResult({
        ...result,
        user: { ...result.user, accountStatus: newStatus },
      })
      setActionSuccess(`User status changed to ${newStatus.toUpperCase()} on server.`)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Status update failed.')
    } finally {
      setStatusLoading(false)
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    if (!result || !resetPasswordInput.trim()) return
    setResetLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    try {
      try {
        await api(`/operations/users/${encodeURIComponent(result.user.id)}/password-reset`, {
          method: 'POST',
          body: JSON.stringify({ password: resetPasswordInput.trim() }),
        })
      } catch {
        await api(`/admin/users/${encodeURIComponent(result.user.id)}/password-reset`, {
          method: 'POST',
          body: JSON.stringify({ password: resetPasswordInput.trim() }),
        })
      }

      setActionSuccess(`Password reset successfully for ${result.user.name || result.user.username}.`)
      setShowResetModal(false)
      setResetPasswordInput('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Password reset failed.')
    } finally {
      setResetLoading(false)
    }
  }

  async function handleWalletAdjustment(e: FormEvent) {
    e.preventDefault()
    if (!result || !adjustAmount || Number(adjustAmount) <= 0) return
    setAdjustLoading(true)
    setErrorMessage('')
    setActionSuccess('')

    const numericAmount = Math.round(Number(adjustAmount))
    const signedAmount = adjustAction === 'add' ? numericAmount : -numericAmount
    const backendWalletType = adjustWalletType === 'play_coins' ? 'playCoins' : 'winningCoins'

    try {
      await api(`/admin/users/${encodeURIComponent(result.user.id)}/wallet-adjust`, {
        method: 'POST',
        body: JSON.stringify({
          walletType: backendWalletType,
          amount: signedAmount,
          reason: adjustReason.trim() || 'Admin adjustment',
        }),
      })

      const updatedWallets = result.wallets.map((w) => {
        if (w.walletType === adjustWalletType) {
          const newBal = Math.max(0, w.balance + signedAmount)
          return { ...w, balance: newBal, available: newBal }
        }
        return w
      })

      setResult({
        ...result,
        wallets: updatedWallets,
      })

      setActionSuccess(
        `${adjustAction === 'add' ? 'Added' : 'Deducted'} ₹${numericAmount} ${
          adjustWalletType === 'play_coins' ? 'Play Coins' : 'Winning Coins'
        } on server.`
      )
      setShowAdjustModal(false)
      setAdjustAmount('')
      setAdjustReason('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Adjustment failed.')
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <div className="users-container">
      <div className="view-header">
        <div>
          <h2>Players</h2>
          <p>Search player by mobile number or ID</p>
        </div>
        {result && (
          <button className="secondary small-btn" onClick={() => setResult(null)}>
            Clear
          </button>
        )}
      </div>

      <form className="search-form-card" onSubmit={handleSearch}>
        <div className="search-input-group">
          <Search size={16} className="search-icon" />
          <input
            required
            type="text"
            placeholder="Search mobile number or user ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

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

      {result && (
        <div className="user-profile-view">
          <div className="profile-header-card">
            <div className="profile-identity">
              <div className="user-avatar-large">
                {result.user.name ? result.user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <div className="user-meta">
                <h3>{result.user.name || 'Player'}</h3>
                <p className="user-sub">
                  <span>{result.user.mobileNumber || 'No mobile'}</span>
                  <span>•</span>
                  <span>{result.user.id.slice(0, 8)}...</span>
                  <span>•</span>
                  <span className="badge-tag">{result.user.role}</span>
                </p>
              </div>
            </div>

            <div className="profile-actions">
              <span className={`status-pill ${(result.user.accountStatus || 'active').toLowerCase()}`}>
                {(result.user.accountStatus || 'active').toUpperCase()}
              </span>
              <div className="action-buttons-row">
                <button
                  className="secondary small-btn"
                  onClick={() => setShowAdjustModal(true)}
                >
                  <Coins size={14} /> Adjust Balance
                </button>
                <button
                  className="secondary small-btn"
                  onClick={() => {
                    setResetPasswordInput('')
                    setShowResetModal(true)
                  }}
                >
                  <KeyRound size={14} /> Reset Password
                </button>
                {(result.user.accountStatus || 'active').toLowerCase() === 'active' ? (
                  <button
                    className="danger small-btn"
                    onClick={() => handleUpdateStatus('suspended')}
                    disabled={statusLoading}
                  >
                    <ShieldAlert size={14} /> Suspend
                  </button>
                ) : (
                  <button
                    className="success small-btn"
                    onClick={() => handleUpdateStatus('active')}
                    disabled={statusLoading}
                  >
                    <UserCheck size={14} /> Activate
                  </button>
                )}
              </div>
            </div>
          </div>

          {searchResults.length > 1 && (
            <div className="search-multi-results" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Matching Users ({searchResults.length}):</span>
              {searchResults.map((sr) => (
                <button
                  key={sr.user.id}
                  type="button"
                  className={`small-btn ${sr.user.id === result.user.id ? 'primary' : 'secondary'}`}
                  onClick={() => {
                    setResult(sr)
                    fetchPayoutAccounts(sr.user.id)
                  }}
                >
                  {sr.user.name} ({sr.user.mobileNumber || sr.user.username})
                </button>
              ))}
            </div>
          )}

          <div className="user-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Play Coins</div>
              <div className="stat-value coin-play">
                {(result.wallets || []).find((w) => w.walletType === 'play_coins')?.balance ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Winning Coins</div>
              <div className="stat-value coin-win">
                {(result.wallets || []).find((w) => w.walletType === 'winning_coins')?.balance ?? 0}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Deposits</div>
              <div className="stat-value text-green">
                <ArrowDownLeft size={16} /> ₹{(result.totals?.deposited ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Withdrawals</div>
              <div className="stat-value text-purple">
                <ArrowUpRight size={16} /> ₹{(result.totals?.withdrawn ?? 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="activity-breakdown-card">
            <h4>Match Stats</h4>
            <div className="activity-grid">
              <div className="act-box">
                <span>OMBs Joined</span>
                <strong>{result.activity?.ombsJoined ?? 0}</strong>
              </div>
              <div className="act-box">
                <span>OMBs Won</span>
                <strong className="text-green">{result.activity?.ombsWon ?? 0}</strong>
              </div>
              <div className="act-box">
                <span>Tournaments Joined</span>
                <strong>{result.activity?.tournamentsJoined ?? 0}</strong>
              </div>
              <div className="act-box">
                <span>Tournaments Won</span>
                <strong className="text-green">{result.activity?.tournamentsWon ?? 0}</strong>
              </div>
            </div>
          </div>

          {/* Payout Accounts Section */}
          <div className="activity-breakdown-card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <CreditCard size={16} /> Payout Accounts
              </h4>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {payoutLoading ? 'Loading...' : `${payoutAccounts.length} Connected`}
              </span>
            </div>
            {payoutAccounts.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {payoutLoading ? 'Fetching payout details...' : 'No withdrawal/payout accounts registered for this player.'}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {payoutAccounts.map((acc, idx) => (
                  <div
                    key={acc.id || idx}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-card, #1a1a24)',
                      border: '1px solid var(--border-color, #2d2d3d)',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="badge-tag" style={{ textTransform: 'uppercase' }}>
                        {acc.type || (acc.upiId ? 'UPI' : 'Bank')}
                      </span>
                      {acc.status && (
                        <span className={`status-pill ${acc.status.toLowerCase()}`}>
                          {acc.status}
                        </span>
                      )}
                    </div>
                    {acc.upiId && <div><strong>UPI:</strong> {acc.upiId}</div>}
                    {acc.accountNumber && <div><strong>A/C:</strong> {acc.accountNumber}</div>}
                    {acc.ifsc && <div><strong>IFSC:</strong> {acc.ifsc}</div>}
                    {acc.holderName && <div><strong>Name:</strong> {acc.holderName}</div>}
                    {acc.bankName && <div><strong>Bank:</strong> {acc.bankName}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && result && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button className="close-btn" onClick={() => setShowResetModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-form">
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Set a new password on the live server for{' '}
                <strong>{result.user.name || result.user.username}</strong> ({result.user.mobileNumber || result.user.id}):
              </p>
              <label>
                New Password
                <input
                  required
                  type="password"
                  placeholder="Enter new password"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
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
                  {resetLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Adjust Balance</h3>
              <button className="close-btn" onClick={() => setShowAdjustModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleWalletAdjustment} className="modal-form">
              <label>
                Wallet
                <select
                  value={adjustWalletType}
                  onChange={(e) =>
                    setAdjustWalletType(e.target.value as 'play_coins' | 'winning_coins')
                  }
                >
                  <option value="play_coins">Play Coins</option>
                  <option value="winning_coins">Winning Coins</option>
                </select>
              </label>

              <label>
                Action
                <div className="toggle-group">
                  <button
                    type="button"
                    className={`toggle-btn ${adjustAction === 'add' ? 'active-green' : ''}`}
                    onClick={() => setAdjustAction('add')}
                  >
                    + Credit
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${adjustAction === 'deduct' ? 'active-red' : ''}`}
                    onClick={() => setAdjustAction('deduct')}
                  >
                    - Debit
                  </button>
                </div>
              </label>

              <label>
                Amount (₹)
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="100"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </label>

              <label>
                Reason
                <input
                  type="text"
                  placeholder="e.g. Compensation or bonus"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={adjustLoading}>
                  {adjustLoading ? 'Saving...' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
