import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  LayoutDashboard,
  Users,
  Trophy,
  Shield,
  Gamepad2,
  Bell,
  RefreshCw,
  LogOut,
  Swords,
} from 'lucide-react'
import type { DashboardData, SessionUser } from './types'
import { api } from './services/api'
import { OverviewView } from './components/OverviewView'
import { UsersView } from './components/UsersView'
import { CompetitionsView } from './components/CompetitionsView'
import { HostsView } from './components/HostsView'
import { ContentView } from './components/ContentView'
import { GamesView } from './components/GamesView'
import { OmbView } from './components/OmbView'
import { TournamentsView } from './components/TournamentsView'
import { NotificationsView } from './components/NotificationsView'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'

export function App() {
  const [session, setSession] = useState<SessionUser | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('admin_session_user')
      const token =
        localStorage.getItem('pagewoga_token') ||
        localStorage.getItem('sessionToken') ||
        localStorage.getItem('token') ||
        localStorage.getItem('admin_token')
      if (savedUser && token) {
        try {
          return JSON.parse(savedUser)
        } catch {
          return null
        }
      }
    }
    return null
  })
  const [login, setLogin] = useState({ username: 'admin_niha', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [page, setPage] = useState<
    'Overview' | 'Games' | 'Ombs' | 'Tournaments' | 'Competitions' | 'Users' | 'Hosts' | 'Content' | 'Notifications'
  >('Overview')
  const [history, setHistory] = useState<string[]>(['Overview'])
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | undefined>(undefined)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  function navigateTo(newPage: typeof page, gameId?: string) {
    if (gameId !== undefined) {
      setSelectedGameFilter(gameId)
    }
    if (newPage === page && gameId === undefined) return
    setHistory((prev) => [...prev, newPage])
    setPage(newPage)
  }

  function goBack() {
    if (history.length > 1) {
      const newHist = history.slice(0, -1)
      setHistory(newHist)
      setPage(newHist[newHist.length - 1] as typeof page)
    } else if (page !== 'Overview') {
      setPage('Overview')
      setHistory(['Overview'])
    }
  }

  // Check existing session in background
  useEffect(() => {
    type MeResponse = {
      user?: { role?: string; name?: string; username?: string }
      role?: string
      name?: string
      username?: string
    }
    const token =
      localStorage.getItem('pagewoga_token') ||
      localStorage.getItem('sessionToken') ||
      localStorage.getItem('token') ||
      localStorage.getItem('admin_token')
    if (!token) {
      return
    }

    let ignore = false
    api<MeResponse>('/users/me')
      .then((res) => {
        if (ignore) return
        const userObj = res.user || res
        const role = userObj.role
        const name = userObj.name || userObj.username || 'Admin'
        const username = userObj.username
        if (role && ['admin', 'manager', 'support'].includes(role.toLowerCase())) {
          const userState = { name, role, username }
          setSession(userState)
          localStorage.setItem('admin_session_user', JSON.stringify(userState))
        }
      })
      .catch(() => {
        // Do not aggressively wipe tokens on transient failures
      })

    return () => {
      ignore = true
    }
  }, [])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      type UserInfo = { role?: string; name?: string; username?: string }
      type LoginResponse = {
        token?: string
        accessToken?: string
        access_token?: string
        jwt?: string
        id_token?: string
        sessionToken?: string
        sessionId?: string
        session_id?: string
        sid?: string
        role?: string
        name?: string
        username?: string
        user?: UserInfo
        session?: {
          token?: string
          id?: string
          sessionId?: string
          sid?: string
        }
        data?: {
          token?: string
          accessToken?: string
          access_token?: string
          jwt?: string
          id_token?: string
          sessionToken?: string
          sessionId?: string
          session_id?: string
          sid?: string
          role?: string
          name?: string
          username?: string
          user?: UserInfo
          session?: {
            token?: string
            id?: string
            sessionId?: string
            sid?: string
          }
        }
      }

      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: login.username.trim(),
          password: login.password,
        }),
      })

      const token =
        res.token ||
        res.accessToken ||
        res.access_token ||
        res.jwt ||
        res.id_token ||
        res.sessionToken ||
        res.sessionId ||
        res.session_id ||
        res.sid ||
        res.session?.token ||
        res.session?.id ||
        res.session?.sessionId ||
        res.session?.sid ||
        res.data?.token ||
        res.data?.accessToken ||
        res.data?.access_token ||
        res.data?.jwt ||
        res.data?.id_token ||
        res.data?.sessionToken ||
        res.data?.sessionId ||
        res.data?.session_id ||
        res.data?.sid ||
        res.data?.session?.token ||
        res.data?.session?.id ||
        res.data?.session?.sessionId ||
        res.data?.session?.sid
      if (token) {
        const clean =
          typeof token === 'string'
            ? token.replace(/^"(.*)"$/, '$1').replace(/^Bearer\s+/i, '').trim()
            : String(token)
        localStorage.setItem('pagewoga_token', clean)
        localStorage.setItem('sessionToken', clean)
        localStorage.setItem('token', clean)
        localStorage.setItem('admin_token', clean)
      }

      const userObj: UserInfo = res.user || res.data?.user || res.data || res
      let role = userObj.role?.toLowerCase()
      let name = userObj.name || userObj.username || login.username.trim()

      if (!role) {
        try {
          const meRes = await api<{
            user?: { role?: string; name?: string }
            role?: string
            name?: string
          }>('/users/me')
          const meObj = meRes.user || meRes
          role = meObj.role?.toLowerCase()
          if (meObj.name) name = meObj.name
        } catch {
          // me call failed
        }
      }

      if (role && ['admin', 'manager', 'support'].includes(role)) {
        const userState = { name: name || 'Administrator', role, username: login.username.trim() }
        setSession(userState)
        localStorage.setItem('admin_session_user', JSON.stringify(userState))
      } else if (role) {
        setLoginError(`Account role is "${role}". Administrator or Staff permissions required.`)
      } else {
        // Fallback: Successful login
        const userState = { name: name || 'Administrator', role: 'admin', username: login.username.trim() }
        setSession(userState)
        localStorage.setItem('admin_session_user', JSON.stringify(userState))
      }
    } catch (requestError) {
      setLoginError(
        requestError instanceof Error ? requestError.message : 'Unable to sign in.'
      )
    } finally {
      setLoginLoading(false)
    }
  }

  async function signOut() {
    localStorage.removeItem('pagewoga_token')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('token')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_session_user')
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
    setSession(null)
  }

  async function fetchDashboard() {
    if (!session) return
    setIsRefreshing(true)
    try {
      const data = await api<DashboardData>('/operations/admin/dashboard')
      setDashboard(data)
      setError('')
    } catch (e) {
      // Try alternate admin dashboard endpoint if available
      try {
        const altData = await api<DashboardData>('/admin/dashboard')
        setDashboard(altData)
        setError('')
      } catch {
        setError(e instanceof Error ? e.message : 'Failed to fetch live dashboard metrics.')
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    if (session && page === 'Overview') {
      api<DashboardData>('/operations/admin/dashboard')
        .then((data) => {
          if (isMounted) {
            setDashboard(data)
            setError('')
          }
        })
        .catch((e) => {
          if (isMounted) {
            // Check fallback endpoint
            api<DashboardData>('/admin/dashboard')
              .then((altData) => {
                if (isMounted) {
                  setDashboard(altData)
                  setError('')
                }
              })
              .catch(() => {
                if (isMounted) {
                  setError(e instanceof Error ? e.message : 'Authentication or network required.')
                }
              })
          }
        })
    }
    return () => {
      isMounted = false
    }
  }, [session, page])

  if (!session) {
    return (
      <main className="login-page">
        <div className="login-art">
          <span className="eyebrow">PAGEWOGA / CONTROL ROOM</span>
          <h1>
            Operations,
            <br />
            <em>with clarity.</em>
          </h1>
          <p>Admin console access for platform operations, live competitions, host settlements, and account audits.</p>
          <div className="login-art-footer">
            <span className="live-dot" />
            <small>Connected to AWS Backend: https://api.pagewoga.online</small>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-form-top">
            <div className="mark">
              P<span>W</span>
            </div>
          </div>
          <h2>Welcome back</h2>
          <p className="muted">Sign in with your Pagewoga administrator account.</p>

          <label>
            Username
            <input
              required
              id="login-username"
              value={login.username}
              onChange={(e) => setLogin({ ...login, username: e.target.value })}
              placeholder="admin_niha"
            />
          </label>

          <label>
            Password
            <div className="password-input-wrapper">
              <input
                id="login-password-input"
                required
                type={showPassword ? 'text' : 'password'}
                value={login.password}
                onChange={(e) => setLogin({ ...login, password: e.target.value })}
                placeholder="Enter admin password"
              />
              <button
                type="button"
                id="toggle-password-visibility"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {loginError && <div className="alert error">{loginError}</div>}

          <button className="primary full" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Authenticating...' : 'Sign in to Admin Console'} <span>→</span>
          </button>
          <small>Production Server: https://api.pagewoga.online</small>
        </form>
      </main>
    )
  }

  const navItems: { id: typeof page; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'Overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'Games', label: 'Game Catalog', icon: <Gamepad2 size={18} /> },
    { id: 'Ombs', label: 'OMB (1v1)', icon: <Swords size={18} />, badge: 'OMB' },
    { id: 'Tournaments', label: 'Tournaments', icon: <Trophy size={18} />, badge: 'TOURN' },
    { id: 'Competitions', label: 'Match Rooms', icon: <Shield size={18} /> },
    { id: 'Users', label: 'Players', icon: <Users size={18} /> },
    { id: 'Hosts', label: 'Hosts', icon: <Shield size={18} /> },
    { id: 'Notifications', label: 'Alerts', icon: <Bell size={18} /> },
  ]

  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          <div className="mark">
            P<span>W</span>
          </div>
          <strong>pagewoga</strong>
        </div>

        <div className="workspace">
          <span>ADMIN</span>
          <b>Dashboard</b>
        </div>

        <nav>
          {navItems.map((item) => (
            <button
              className={page === item.id ? 'active' : ''}
              onClick={() => navigateTo(item.id)}
              key={item.id}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className={`nav-domain-badge ${item.id === 'Ombs' ? 'nav-omb-badge' : 'nav-tourn-badge'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="secure-dot" />
          <span>
            Server: Connected
            <br />
            <small>api.pagewoga.online</small>
          </span>
        </div>
      </aside>

      <section className="main">
        <header>
          <div className="header-left">
            {page !== 'Overview' && (
              <button className="back-button" onClick={goBack} title="Back">
                ← Back
              </button>
            )}
            <div>
              <h1>
                {page === 'Games'
                  ? 'Game Catalog'
                  : page === 'Ombs'
                  ? 'OMB Match Management'
                  : page === 'Tournaments'
                  ? 'Tournament Championships'
                  : page === 'Users'
                  ? 'Players'
                  : page === 'Competitions'
                  ? 'Match Rooms'
                  : page === 'Content'
                  ? 'Competition Content'
                  : page === 'Notifications'
                  ? 'Alerts'
                  : page}
              </h1>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`icon-button refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              aria-label="Refresh Data"
              title="Refresh"
              onClick={fetchDashboard}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => navigateTo('Notifications')}
              title="Alerts"
            >
              <Bell size={16} />
            </button>
            <div className="profile">
              <div className="avatar">{(session.name || session.username || 'A').slice(0, 1).toUpperCase()}</div>
              <span>
                {session.name || session.username || 'Admin'}
                <small>Admin</small>
              </span>
              <button onClick={signOut} aria-label="Log out" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="content">
          <ErrorBoundary fallbackTitle="Unable to load this section">
            {page === 'Overview' && (
              <OverviewView
                dashboard={dashboard}
                error={error}
                retry={fetchDashboard}
                isRefreshing={isRefreshing}
                onSignOut={signOut}
                onNavigateToGames={() => navigateTo('Games')}
                onNavigateToOmb={() => navigateTo('Ombs')}
                onNavigateToTournaments={() => navigateTo('Tournaments')}
              />
            )}
            {page === 'Games' && (
              <GamesView
                onNavigateToOmb={(gameId) => navigateTo('Ombs', gameId)}
                onNavigateToTournament={(gameId) => navigateTo('Tournaments', gameId)}
              />
            )}
            {page === 'Ombs' && <OmbView initialGameId={selectedGameFilter} />}
            {page === 'Tournaments' && (
              <TournamentsView initialGameId={selectedGameFilter} />
            )}
            {page === 'Competitions' && <CompetitionsView />}
            {page === 'Users' && <UsersView />}
            {page === 'Hosts' && <HostsView />}
            {page === 'Content' && <ContentView />}
            {page === 'Notifications' && <NotificationsView />}
          </ErrorBoundary>
        </div>
      </section>
    </div>
  )
}

export default App
