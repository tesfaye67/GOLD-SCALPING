// TDR GOLD TREADER - Core Backend Types & Interfaces

export type UserRole = "ADMIN" | "USER"

export type AccountStatus =
  | "ACTIVE"
  | "TRADING"
  | "PAUSED"
  | "RISK_LOCKED"
  | "BROKER_DISCONNECTED"
  | "KYC_REQUIRED"
  | "SUSPENDED"

export type AccountType = "DEMO" | "LIVE"

export type TradeSide = "BUY" | "SELL"
export type OrderType = "MARKET" | "LIMIT" | "STOP"
export type OrderStatus = "PENDING" | "FILLED" | "CANCELLED" | "REJECTED"
export type PositionStatus = "OPEN" | "PARTIALLY_FILLED" | "CLOSED" | "REJECTED" | "ERROR"

export type LedgerType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRADE_RESERVATION"
  | "TRADE_PROFIT"
  | "TRADE_LOSS"
  | "FEE"
  | "ADJUSTMENT"
  | "REFUND"

export type LedgerStatus = "PENDING" | "VERIFIED" | "REJECTED" | "CANCELLED"
export type DepositStatus = "PENDING_VERIFICATION" | "APPROVED" | "REJECTED" | "EXPIRED"
export type WithdrawalStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED"
export type BrokerType = "EXNESS" | "MT5" | "PAPER"
export type BrokerStatus = "CONNECTED" | "DISCONNECTED" | "ERROR"

export interface MarketTick {
  symbol: string
  price: number
  bid: number
  ask: number
  spread: number
  timestamp: number
  direction: "up" | "down" | "flat"
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d"

export interface AISignalProposal {
  id: string
  symbol: "XAUUSD"
  direction: "BUY" | "SELL" | "NO_TRADE"
  bias4h: "Bullish" | "Bearish" | "Ranging"
  poi1h: string
  confirmation15m: string
  proposedEntry?: number
  stopLoss?: number
  takeProfit?: number
  riskReward?: number
  riskPercent?: number
  confidence: "HIGH" | "MODERATE" | "LOW"
  status: "PROPOSED" | "APPROVED" | "REJECTED_BY_RISK" | "EXECUTED"
  reason: string
  timeframeAlignment: string
  createdAt: number
}

export interface RiskEvaluationResult {
  allowed: boolean
  lotSize: number
  riskAmountUSD: number
  rejectionReason?: string
  warnings: string[]
  consecutiveLosses: number
  adjustedRiskPercent: number
  circuitBreakerActive: boolean
}

export interface BrokerOrderRequest {
  symbol: "XAUUSD"
  side: TradeSide
  type: OrderType
  lots: number
  price?: number
  sl?: number
  tp?: number
  comment?: string
}

export interface BrokerPosition {
  id: string
  symbol: string
  side: TradeSide
  lots: number
  entryPrice: number
  currentPrice: number
  sl?: number
  tp?: number
  floatingPnl: number
  margin: number
  openedAt: number
}

export interface BrokerAccountSummary {
  brokerType: BrokerType
  login: string
  server: string
  balance: number
  equity: number
  usedMargin: number
  freeMargin: number
  currency: string
  status: BrokerStatus
}

export interface BrokerAdapter {
  connect(): Promise<boolean>
  authenticate(credentials: Record<string, any>): Promise<boolean>
  getAccount(): Promise<BrokerAccountSummary>
  getBalance(): Promise<number>
  getEquity(): Promise<number>
  getPositions(): Promise<BrokerPosition[]>
  getMarketPrice(symbol: string): Promise<MarketTick>
  placeOrder(req: BrokerOrderRequest): Promise<{ success: boolean; positionId?: string; orderId?: string; error?: string }>
  modifyOrder(id: string, sl?: number, tp?: number): Promise<boolean>
  closeOrder(positionId: string): Promise<{ success: boolean; exitPrice: number; pnl: number }>
  syncTrades(): Promise<any[]>
}
