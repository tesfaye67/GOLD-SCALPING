// TDR GOLD TREADER - Complete Unified Domain Types

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketTick {
  price: number
  bid: number
  ask: number
  spread: number
  timestamp: number
  direction: "up" | "down" | "flat"
}

export interface OrderBookEntry {
  price: number
  size: number
  total: number
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}

export type OrderSide = "buy" | "sell"
export type OrderType = "market" | "limit" | "stop"
export type OrderStatus = "open" | "filled" | "cancelled" | "triggered" | "pending"

export interface MarketOrder {
  id: string
  side: OrderSide
  type: OrderType
  price: number
  size: number
  leverage?: number
  sl?: number
  tp?: number
  status: OrderStatus
  createdAt: number
  filledAt?: number
  fillPrice?: number
}

export interface TradePosition {
  id: string
  side: OrderSide
  entryPrice: number
  currentPrice?: number
  size: number // Lots
  leverage: number
  sl: number
  tp: number
  pnl: number
  pnlPercent: number
  openedAt: number
  margin: number
  brokerPositionId?: string
}

export interface TradeJournalEntry {
  id: string
  symbol: string
  side: OrderSide
  size: number
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  durationSeconds: number
  reason: string
  aiSetup: string
  sl: number
  tp: number
  closedAt: number
}

export interface AISignal {
  id: string
  direction: "long" | "short" | "neutral"
  entry: number
  tp1: number
  tp2?: number
  sl: number
  rrRatio: number
  confidence: number
  timeframe: string
  reasoning: string
  bias4h?: string
  poi1h?: string
  confirmation15m?: string
  marketStatus?: string
  isBlueprintSatisfied?: boolean
  pendingCondition?: string
  createdAt: number
}

export interface CopilotMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  signal?: AISignal
}

export interface TechnicalIndicators {
  rsi: number[]
  ema20: number[]
  ema50: number[]
  ema200: number[]
  macd: { line: number[]; signal: number[]; histogram: number[] }
  bollinger: { upper: number[]; middle: number[]; lower: number[] }
  atr: number[]
}

export interface UserConfig {
  openaiKey: string
  useAI: boolean
  defaultLeverage: number
  defaultRiskPercent: number
}

export interface PaperAccount {
  balance: number
  equity: number
  marginUsed: number
  freeMargin: number
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d"

export interface MarketSession {
  name: string
  open: boolean
  overlap: boolean
}

// ─── Timezone Types ───────────────────────────────────────────────────────────

export type TimezoneKey =
  | "Africa/Addis_Ababa"
  | "UTC"
  | "America/New_York"
  | "Europe/London"
  | "Asia/Tokyo"
  | "Broker"

export interface TimezoneOption {
  key: TimezoneKey
  label: string
  offset: string
}

// ─── User, Auth & Roles ───────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "USER"

export type AccountStatus =
  | "ACTIVE"
  | "TRADING"
  | "PAUSED"
  | "RISK_LOCKED"
  | "BROKER_DISCONNECTED"
  | "KYC_REQUIRED"
  | "SUSPENDED"

export interface UserProfile {
  id: string
  email: string
  fullName: string
  password?: string
  role: UserRole
  status: AccountStatus
  twoFactorEnabled: boolean
  accountType?: "DEMO" | "LIVE"
  demoBalance?: number
  demoLeverage?: number
  demoAccountId?: string
  isVerified?: boolean
  assignedExnessAccount?: string
  assignedExnessServer?: string
  token?: string
  createdAt?: number
}

// ─── Wallet & Double-Entry Ledger ─────────────────────────────────────────────

export interface WalletSummary {
  walletId: string
  userId: string
  currency: string
  verifiedBalance: number
  pendingDeposits: number
  pendingWithdrawals: number
  tradingAllocation: number
  availableBalance: number
}

export interface CryptoNetwork {
  id: string
  name: string
  symbol: string
  network: "TRC20" | "ERC20" | "BEP20" | string
  depositAddress: string
  qrCodeUrl?: string
  minDeposit: number
  isEnabled: boolean
  confirmationsRequired: number
}

export interface DepositRecord {
  id: string
  userId: string
  walletId: string
  cryptoNetworkId: string
  networkName: string
  amount: number
  currency: string
  txHash: string
  proofUrl?: string
  status: "PENDING_VERIFICATION" | "APPROVED" | "REJECTED"
  adminNotes?: string
  createdAt: number
}

export interface WithdrawalRecord {
  id: string
  userId: string
  walletId: string
  cryptoNetworkId: string
  networkName: string
  amount: number
  currency: string
  destinationAddress: string
  txHash?: string
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED"
  adminNotes?: string
  createdAt: number
}

export interface LedgerEntry {
  id: string
  userId: string
  walletId: string
  amount: number
  currency: string
  type: "DEPOSIT" | "WITHDRAWAL" | "TRADE_RESERVATION" | "TRADE_PROFIT" | "TRADE_LOSS" | "FEE" | "ADJUSTMENT" | "REFUND"
  status: "PENDING" | "VERIFIED" | "REJECTED"
  reference: string
  approvedBy?: string
  notes?: string
  createdAt: number
}

// ─── Broker & Risk Controls ───────────────────────────────────────────────────

export type BrokerMode = "DEMO" | "LIVE"

export interface BrokerConnectionState {
  id: string
  name: string
  brokerType: "EXNESS" | "MT5" | "PAPER"
  server: string
  login: string
  status: "CONNECTED" | "DISCONNECTED" | "ERROR"
  balance: number
  equity: number
  lastSyncAt: number
}

export interface RiskSettings {
  maxRiskPerTrade: number // 1%
  maxDailyLossPercent: number // 2%
  maxWeeklyLossPercent: number // 5%
  maxTotalDrawdownPercent: number // 10%
  maxOpenPositions: number // 2
  maxTradesPerDay: number // 5
  minRiskReward: number // 2.0
  consecutiveLossLimit: number // 3
  isGlobalKillSwitchActive: boolean
  newsFilterEnabled: boolean
  newsWindowMinutes: number
  maxSpreadAllowed: number
}

// ─── Economic News Event ──────────────────────────────────────────────────────

export interface EconomicEvent {
  id: string
  title: string
  country: string
  impact: "HIGH" | "MEDIUM" | "LOW"
  scheduledTime: number
  forecast?: string
  previous?: string
  blocksTrading: boolean
}

// ─── Chart View Mode ──────────────────────────────────────────────────────────

export type ChartViewMode = "tradingview" | "overlay"

// ─── SMC / ICT Structures ─────────────────────────────────────────────────────

export interface OrderBlock {
  type: "bullish" | "bearish"
  top: number
  bottom: number
  time: number
  mitigated: boolean
}

export interface FairValueGap {
  type: "bullish" | "bearish"
  top: number
  bottom: number
  time: number
  filled: boolean
}

export interface LiquidityLevel {
  type: "BSL" | "SSL"
  price: number
  time: number
  swept: boolean
  label: string
}

export interface SupplyDemandZone {
  type: "supply" | "demand"
  top: number
  bottom: number
  time: number
  strength: number
}

export interface MarketStructure {
  type: "BOS" | "CHOCH"
  direction: "bullish" | "bearish"
  price: number
  time: number
}

export interface PremiumDiscount {
  equilibrium: number
  premium: number
  discount: number
}

export interface SMCAnalysis {
  orderBlocks: OrderBlock[]
  fvg: FairValueGap[]
  liquidity: LiquidityLevel[]
  supplyDemand: SupplyDemandZone[]
  structures: MarketStructure[]
  premiumDiscount: PremiumDiscount
}

// ─── Data Integrity ───────────────────────────────────────────────────────────

export type FeedStatus = "connected" | "delayed" | "disconnected"

export interface DataIntegrityState {
  feedStatus: FeedStatus
  chartTimestamp: number
  brokerTimestamp: number
  latestTickTimestamp: number
  spreadValue: number
  priceDiscrepancy: number
  lastUpdate: number
  tradingEnabled: boolean
  circuitBreakerActive: boolean
  circuitBreakerReason: string
}
