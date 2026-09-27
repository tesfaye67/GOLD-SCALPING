// TDR GOLD TREADER - Multi-User Local Storage & State Isolation Engine
import type {
  UserProfile,
  WalletSummary,
  LedgerEntry,
  DepositRecord,
  WithdrawalRecord,
  TradePosition,
  TradeJournalEntry,
  CryptoNetwork,
} from "../types"

const USERS_KEY = "tdr_users_db"
const CURRENT_USER_KEY = "tdr_current_user_id"
const THEME_KEY = "tdr_theme_preference"
const CRYPTO_NETWORKS_KEY = "tdr_crypto_networks"

export const INITIAL_CRYPTO_NETWORKS: CryptoNetwork[] = [
  {
    id: "net_trc20",
    name: "Tether USD (TRC20)",
    symbol: "USDT",
    network: "TRC20",
    depositAddress: "TYDsvH9v3fN4kKz8M2uK9zZp5q6w8nQ1xY",
    minDeposit: 10.00,
    isEnabled: true,
    confirmationsRequired: 19,
  },
  {
    id: "net_erc20",
    name: "Tether USD (ERC20)",
    symbol: "USDT",
    network: "ERC20",
    depositAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    minDeposit: 25.00,
    isEnabled: true,
    confirmationsRequired: 12,
  },
  {
    id: "net_bep20",
    name: "Tether USD (BEP20)",
    symbol: "USDT",
    network: "BEP20",
    depositAddress: "0x3892A24F3169f4C436BE151817478051E84B89c8",
    minDeposit: 10.00,
    isEnabled: true,
    confirmationsRequired: 15,
  },
]

export function getStoredCryptoNetworks(): CryptoNetwork[] {
  try {
    const raw = localStorage.getItem(CRYPTO_NETWORKS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  localStorage.setItem(CRYPTO_NETWORKS_KEY, JSON.stringify(INITIAL_CRYPTO_NETWORKS))
  return INITIAL_CRYPTO_NETWORKS
}

export function saveStoredCryptoNetworks(networks: CryptoNetwork[]) {
  localStorage.setItem(CRYPTO_NETWORKS_KEY, JSON.stringify(networks))
}

// Default Admin user credentials
export const DEFAULT_ADMIN: UserProfile = {
  id: "usr_admin_01",
  email: "admin@tdrgold.com",
  fullName: "TDR Principal Admin",
  password: "Admin@TDR2026!",
  role: "ADMIN",
  status: "ACTIVE",
  twoFactorEnabled: true,
  createdAt: 1727400000000,
}

// Default Exness Account specified by Operator
export const DEFAULT_EXNESS_ACCOUNT = "10000304760"
export const DEFAULT_EXNESS_SERVER = "Exness-Real10"

/**
 * Initializes and fetches all registered users.
 */
export function getAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      const initial = [DEFAULT_ADMIN]
      localStorage.setItem(USERS_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed: UserProfile[] = JSON.parse(raw)
    // Ensure default admin exists
    if (!parsed.some((u) => u.email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase())) {
      parsed.unshift(DEFAULT_ADMIN)
      localStorage.setItem(USERS_KEY, JSON.stringify(parsed))
    }
    return parsed
  } catch {
    return [DEFAULT_ADMIN]
  }
}

export function saveAllUsers(users: UserProfile[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

/**
 * Gets the current logged-in user session, or null if logged out.
 */
export function getCurrentUser(): UserProfile | null {
  try {
    const currentId = localStorage.getItem(CURRENT_USER_KEY)
    if (!currentId) return null
    const users = getAllUsers()
    return users.find((u) => u.id === currentId) || null
  } catch {
    return null
  }
}

export function setCurrentUserSession(userId: string) {
  localStorage.setItem(CURRENT_USER_KEY, userId)
}

export function logoutCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

/**
 * Signs up a new real user.
 * Rule: Initializes wallet with strictly $0.00 balance!
 */
export function registerRealUser(params: {
  fullName: string
  email: string
  password: string
  accountType?: "DEMO" | "LIVE"
  demoBalance?: number
  demoLeverage?: number
}): UserProfile {
  const users = getAllUsers()
  const cleanEmail = params.email.toLowerCase().trim()

  if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    throw new Error("An account with this email address already exists. Please Sign In.")
  }

  const isDemo = params.accountType !== "LIVE"
  const demoAccountId = isDemo ? `DEMO-${Math.floor(100000 + Math.random() * 900000)}` : undefined

  const newUser: UserProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: cleanEmail,
    fullName: params.fullName.trim(),
    password: params.password,
    role: "USER",
    status: isDemo ? "ACTIVE" : "KYC_REQUIRED", // Live accounts need admin verification
    accountType: isDemo ? "DEMO" : "LIVE",
    demoAccountId,
    demoBalance: params.demoBalance || 10000,
    demoLeverage: params.demoLeverage || 500,
    isVerified: isDemo, // Demo is instantly active without verification
    twoFactorEnabled: false,
    createdAt: Date.now(),
  }

  users.push(newUser)
  saveAllUsers(users)

  // Initialize brand new user with strictly $0.00 wallet balance
  const initialWallet: WalletSummary = {
    walletId: `wal_${newUser.id}`,
    userId: newUser.id,
    currency: "USDT",
    verifiedBalance: 0.00,
    pendingDeposits: 0.00,
    pendingWithdrawals: 0.00,
    tradingAllocation: 0.00,
    availableBalance: 0.00,
  }
  saveUserWallet(newUser.id, initialWallet)

  // Initialize empty ledger, deposits, withdrawals, positions, trades
  saveUserLedger(newUser.id, [])
  saveUserDeposits(newUser.id, [])
  saveUserWithdrawals(newUser.id, [])
  saveUserPositions(newUser.id, [])
  saveUserTrades(newUser.id, [])

  // Auto set session
  setCurrentUserSession(newUser.id)
  return newUser
}

/**
 * Authenticates user with email and password.
 */
export function loginRealUser(email: string, password: string): UserProfile {
  const users = getAllUsers()
  const cleanEmail = email.toLowerCase().trim()
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail)

  if (!user) {
    throw new Error("Account not found. Please check your email or Sign Up.")
  }

  // Password verification
  if (user.password && user.password !== password) {
    throw new Error("Invalid password. Please try again.")
  }

  setCurrentUserSession(user.id)
  return user
}

// ─── User-Scoped Data Isolation ─────────────────────────────────────────────

export function getUserWallet(userId: string): WalletSummary {
  try {
    const raw = localStorage.getItem(`tdr_wallet_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}

  // If Admin, grant initial seed test balance, else 0 balance for standard users
  const isDefaultAdmin = userId === DEFAULT_ADMIN.id
  const defaultWallet: WalletSummary = {
    walletId: `wal_${userId}`,
    userId,
    currency: "USDT",
    verifiedBalance: isDefaultAdmin ? 500.00 : 0.00,
    pendingDeposits: 0.00,
    pendingWithdrawals: 0.00,
    tradingAllocation: isDefaultAdmin ? 500.00 : 0.00,
    availableBalance: isDefaultAdmin ? 500.00 : 0.00,
  }
  saveUserWallet(userId, defaultWallet)
  return defaultWallet
}

export function saveUserWallet(userId: string, wallet: WalletSummary) {
  localStorage.setItem(`tdr_wallet_${userId}`, JSON.stringify(wallet))
}

export function getUserLedger(userId: string): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(`tdr_ledger_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}

  // If default admin, add initial seed credit record
  if (userId === DEFAULT_ADMIN.id) {
    const seed: LedgerEntry[] = [
      {
        id: "tx_init_admin_001",
        userId,
        walletId: `wal_${userId}`,
        amount: 500.00,
        currency: "USDT",
        type: "DEPOSIT",
        status: "VERIFIED",
        reference: "SEED-INIT-001",
        approvedBy: "SYSTEM",
        notes: "Initial Verified USDT Allocation",
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
      },
    ]
    saveUserLedger(userId, seed)
    return seed
  }

  return []
}

export function saveUserLedger(userId: string, entries: LedgerEntry[]) {
  localStorage.setItem(`tdr_ledger_${userId}`, JSON.stringify(entries))
}

export function getUserDeposits(userId: string): DepositRecord[] {
  try {
    const raw = localStorage.getItem(`tdr_deposits_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveUserDeposits(userId: string, deposits: DepositRecord[]) {
  localStorage.setItem(`tdr_deposits_${userId}`, JSON.stringify(deposits))
}

/**
 * Aggregates all pending deposits across all users for Admin approval review.
 */
export function getAllPendingDepositsAcrossUsers(): DepositRecord[] {
  const users = getAllUsers()
  const all: DepositRecord[] = []
  for (const u of users) {
    const deps = getUserDeposits(u.id)
    all.push(...deps.filter((d) => d.status === "PENDING_VERIFICATION"))
  }
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export function getUserWithdrawals(userId: string): WithdrawalRecord[] {
  try {
    const raw = localStorage.getItem(`tdr_withdrawals_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveUserWithdrawals(userId: string, withdrawals: WithdrawalRecord[]) {
  localStorage.setItem(`tdr_withdrawals_${userId}`, JSON.stringify(withdrawals))
}

/**
 * Aggregates all pending withdrawals across all users for Admin payout processing.
 */
export function getAllPendingWithdrawalsAcrossUsers(): WithdrawalRecord[] {
  const users = getAllUsers()
  const all: WithdrawalRecord[] = []
  for (const u of users) {
    const wdrs = getUserWithdrawals(u.id)
    all.push(...wdrs.filter((w) => w.status === "PENDING" || w.status === "UNDER_REVIEW"))
  }
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export function getUserPositions(userId: string): TradePosition[] {
  try {
    const raw = localStorage.getItem(`tdr_positions_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveUserPositions(userId: string, positions: TradePosition[]) {
  localStorage.setItem(`tdr_positions_${userId}`, JSON.stringify(positions))
}

export function getUserTrades(userId: string): TradeJournalEntry[] {
  try {
    const raw = localStorage.getItem(`tdr_trades_${userId}`)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveUserTrades(userId: string, trades: TradeJournalEntry[]) {
  localStorage.setItem(`tdr_trades_${userId}`, JSON.stringify(trades))
}

/**
 * Admin assigns an Exness MT5 account to a specific user.
 */
export function assignExnessAccountToUser(
  userId: string,
  accountNumber: string,
  server = DEFAULT_EXNESS_SERVER
): UserProfile {
  const users = getAllUsers()
  const index = users.findIndex((u) => u.id === userId)
  if (index === -1) throw new Error("User not found.")

  users[index].assignedExnessAccount = accountNumber
  users[index].assignedExnessServer = server
  saveAllUsers(users)

  // Update current user in session if it's the active user
  const current = getCurrentUser()
  if (current && current.id === userId) {
    setCurrentUserSession(userId)
  }

  return users[index]
}

// ─── Theme Management (Dark & Light Mode) ───────────────────────────────────

export function getStoredTheme(): "dark" | "light" {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === "light" || t === "dark") return t
  } catch {}
  return "dark"
}

export function saveStoredTheme(theme: "dark" | "light") {
  localStorage.setItem(THEME_KEY, theme)
  if (theme === "light") {
    document.documentElement.classList.remove("dark")
    document.documentElement.classList.add("light")
  } else {
    document.documentElement.classList.remove("light")
    document.documentElement.classList.add("dark")
  }
}
