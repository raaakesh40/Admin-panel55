export type SessionUser = {
  name: string
  role: string
  username?: string
}

export type DashboardTotals = {
  users: number
  hosts: number
  playCoins: number
  winningCoins: number
  cancelledOmbs: number
  cancelledTournaments: number
}

export type DashboardLeader = {
  userId: string
  userName?: string
  total: number
}

export type DashboardData = {
  totals: DashboardTotals
  topDeposits: DashboardLeader[]
  topWithdrawals: DashboardLeader[]
  recentActivities?: {
    id: string
    type: string
    title: string
    time: string
    amount?: number
  }[]
}

export type Wallet = {
  walletType: 'play_coins' | 'winning_coins' | string
  balance: number
  available: number
  held?: number
}

export type UserRole = 'user' | 'admin' | 'manager' | 'support' | 'omb_host' | 'tournament_host' | string

export type UserProfile = {
  id: string
  name: string
  username?: string
  mobileNumber: string | null
  accountStatus: 'active' | 'suspended' | 'banned' | string
  role: UserRole
  createdAt: string
  email?: string
}

export type Manager = {
  id: string
  name: string
  username: string
  mobileNumber?: string | null
  role: 'manager' | string
  accountStatus: 'active' | 'deactivated' | 'suspended' | 'disabled' | string
  createdAt?: string
}

export type UserResult = {
  user: UserProfile
  wallets: Wallet[]
  totals: {
    deposited: number
    withdrawn: number
  }
  activity: {
    ombsJoined: number
    ombsWon: number
    tournamentsJoined: number
    tournamentsWon: number
  }
  current: {
    omb: { code: string; id: string; title?: string } | null
    tournament: { code: string; id: string; title?: string } | null
  }
}

export type Host = {
  id: string
  name: string
  username?: string
  mobileNumber?: string
  upiId?: string
  assignedGame?: string
  role?: 'omb' | 'tournament' | string
  status: 'active' | 'disabled' | 'suspended'
  totalMatchesHosted?: number
  unpaidCommission?: number
  commissionRate?: number
  totalEarned?: number
  assignedTournaments?: string[]
  lastActive?: string
  createdAt?: string
}

export type Game = {
  id: string
  name: string
  logoUrl?: string | null
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type PrizeTier = {
  position: number
  amount: number
}

export type GameMode = {
  id: string
  gameId: string
  name: string
  logoUrl?: string | null
  type: 'omb' | 'tournament'
  entryFee: number
  maxParticipants: number
  teamSize: number
  prizes: PrizeTier[]
  tournamentMetric?: string | null
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CompetitionSchedule = {
  id: string
  modeId: string
  status: 'draft' | 'published' | 'closed'
  startsAt?: string | null
  entryClosesAt?: string | null
  durationMinutes?: number | null
  roomRevealMinutesBeforeStart?: number | null
  resultDeadlineMinutes: number
  managerAlertAfterMinutes: number
  guideVideoUrl?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  // Display helpers (populated via mode lookup in UI)
  mode?: GameMode
  game?: Game
}

export type CompetitionItem = {
  id: string
  code: string
  type: 'omb' | 'tournament'
  game: string
  title: string
  mode: 'Solo' | 'Duo' | 'Squad' | '1v1' | string
  entryFee: number
  prizePool: number
  status: 'upcoming' | 'open' | 'live' | 'completed' | 'cancelled'
  maxSlots: number
  joinedSlots: number
  scheduleTime: string
  roomId?: string
  roomPassword?: string
  hostId?: string
  hostName?: string
  notes?: string
}

export type NotificationBroadcast = {
  id: string
  title: string
  message: string
  targetAudience: 'all' | 'active_players' | 'hosts' | 'specific_user'
  targetUserId?: string
  userId?: string
  type: string
  priority: string
  deepLink?: string
  sentAt: string
  sentBy?: string
  status?: 'delivered' | 'pending' | 'failed'
  deliveredCount?: number
}

export type DailyScheduleItem = CompetitionSchedule

