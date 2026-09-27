// TDR GOLD TREADER - Database & In-Memory Store Provider
import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient()

let isPrismaConnected = false

export async function initDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    isPrismaConnected = true
    console.log("✓ [TDR GOLD TREADER] Connected to PostgreSQL via Prisma")
    return true
  } catch (err: any) {
    console.warn("⚠️ [TDR GOLD TREADER] PostgreSQL not detected locally. Operating with in-memory transactional engine.")
    isPrismaConnected = false
    return false
  }
}

export function isDbConnected(): boolean {
  return isPrismaConnected
}

// In-Memory Transactional Fallback Cache for local standalone execution
interface MemoryStore {
  users: Map<string, any>
  wallets: Map<string, any>
  ledger: any[]
  deposits: any[]
  withdrawals: any[]
  cryptoNetworks: any[]
  tradingAccounts: Map<string, any>
  positions: any[]
  orders: any[]
  trades: any[]
  riskSettings: any
  newsEvents: any[]
  auditLogs: any[]
  brokerAccounts: any[]
}

export const memoryStore: MemoryStore = {
  users: new Map(),
  wallets: new Map(),
  ledger: [],
  deposits: [],
  withdrawals: [],
  cryptoNetworks: [
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
  ],
  tradingAccounts: new Map(),
  positions: [],
  orders: [],
  trades: [],
  riskSettings: {
    maxRiskPerTrade: 1.00,
    maxDailyLossPercent: 2.00,
    maxWeeklyLossPercent: 5.00,
    maxTotalDrawdownPercent: 10.00,
    maxOpenPositions: 2,
    maxTradesPerDay: 5,
    minRiskReward: 2.00,
    consecutiveLossLimit: 3,
    isGlobalKillSwitchActive: false,
    newsFilterEnabled: true,
    newsWindowMinutes: 30,
    maxSpreadAllowed: 2.50,
  },
  newsEvents: [
    {
      id: "news_1",
      title: "US FOMC Interest Rate Decision",
      country: "USD",
      impact: "HIGH",
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
      forecast: "5.25%",
      previous: "5.50%",
      blocksTrading: true,
    },
    {
      id: "news_2",
      title: "US Non-Farm Payrolls (NFP)",
      country: "USD",
      impact: "HIGH",
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 96).toISOString(),
      forecast: "165K",
      previous: "142K",
      blocksTrading: true,
    },
    {
      id: "news_3",
      title: "US Consumer Price Index (CPI YoY)",
      country: "USD",
      impact: "HIGH",
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 160).toISOString(),
      forecast: "2.6%",
      previous: "2.9%",
      blocksTrading: true,
    },
  ],
  auditLogs: [],
  brokerAccounts: [
    {
      id: "exness_demo_1",
      name: "Exness MT5 Gateway Demo",
      brokerType: "EXNESS",
      server: "Exness-Trial10",
      login: "7829104",
      status: "CONNECTED",
      lastSyncAt: new Date().toISOString(),
    },
  ],
}

// Pre-seed default Admin & Trader in memory store
const defaultAdmin = {
  id: "usr_admin_01",
  email: "admin@tdrgold.com",
  fullName: "TDR Principal Admin",
  role: "ADMIN",
  status: "ACTIVE",
  twoFactorEnabled: false,
  createdAt: new Date().toISOString(),
}
memoryStore.users.set(defaultAdmin.id, defaultAdmin)

const defaultTrader = {
  id: "usr_trader_01",
  email: "trader@tdrgold.com",
  fullName: "Tesfaye Dereje",
  role: "USER",
  status: "ACTIVE",
  twoFactorEnabled: false,
  createdAt: new Date().toISOString(),
}
memoryStore.users.set(defaultTrader.id, defaultTrader)

memoryStore.wallets.set(defaultTrader.id, {
  id: "wal_trader_01",
  userId: defaultTrader.id,
  currency: "USDT",
  cachedBalance: 500.00,
  tradingAllocation: 500.00,
})

memoryStore.ledger.push({
  id: "tx_init_001",
  userId: defaultTrader.id,
  walletId: "wal_trader_01",
  amount: 500.00,
  currency: "USDT",
  type: "DEPOSIT",
  status: "VERIFIED",
  reference: "SEED-INIT-001",
  approvedBy: defaultAdmin.id,
  approvedAt: new Date().toISOString(),
  notes: "Verified Initial USDT Allocation",
  createdAt: new Date().toISOString(),
})

memoryStore.tradingAccounts.set(defaultTrader.id, {
  id: "acc_demo_01",
  userId: defaultTrader.id,
  accountType: "DEMO",
  balance: 10000.00,
  equity: 10000.00,
  usedMargin: 0.00,
  freeMargin: 10000.00,
  currency: "USD",
  maxDrawdown: 0.00,
  dailyDrawdown: 0.00,
  isLocked: false,
})
