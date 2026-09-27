import type { Candle, MarketTick, OrderBook, OrderBookEntry, TechnicalIndicators, Timeframe, PaperAccount, TradePosition, MarketOrder, SMCAnalysis, OrderBlock, FairValueGap, LiquidityLevel, SupplyDemandZone, MarketStructure, DataIntegrityState, FeedStatus } from "../types"
import { getMarketHoursInfo, isWeekendSimulationActive } from "../utils/marketHours"

// ─── State ────────────────────────────────────────────────────────────────────
let currentPrice = 4280.00
let priceHistory: MarketTick[] = []
let candleMap: Map<Timeframe, Candle[]> = new Map()
let listeners: Set<(tick: MarketTick) => void> = new Set()
let tickInterval: ReturnType<typeof setInterval> | null = null
let apiConnected = false
let lastTickTime = Date.now()

// ─── Binance PAXG/USDT (Gold Spot Proxy) ─────────────────────────────────────
const BINANCE_REST = "https://api.binance.com/api/v3"
const PAXG_SYMBOL = "PAXGUSDT"

async function fetchLivePrice(): Promise<number | null> {
  try {
    const res = await fetch(`${BINANCE_REST}/ticker/price?symbol=${PAXG_SYMBOL}`)
    if (!res.ok) return null
    const data = await res.json()
    const p = parseFloat(data.price)
    return !isNaN(p) && p > 1000 && p < 15000 ? p : null
  } catch { return null }
}

export async function fetchKlines(interval: string, limit = 100): Promise<Candle[]> {
  try {
    const res = await fetch(`${BINANCE_REST}/klines?symbol=${PAXG_SYMBOL}&interval=${interval}&limit=${limit}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map((k: any[]) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  } catch { return [] }
}

// ─── Tick Generator ───────────────────────────────────────────────────────────
function generateTick(): MarketTick {
  const hours = getMarketHoursInfo(isWeekendSimulationActive())
  if (!hours.isOpen) {
    // Weekend or off-market hours: Interbank Gold market is closed! Price is frozen.
    const spread = 0.35
    const tick: MarketTick = {
      price: currentPrice,
      bid: currentPrice - spread / 2,
      ask: currentPrice + spread / 2,
      spread,
      timestamp: Date.now(),
      direction: "flat",
    }
    lastTickTime = tick.timestamp
    return tick
  }

  const volatility = 0.0003 + Math.random() * 0.0005
  const drift = (Math.random() - 0.498) * volatility * currentPrice
  const prevPrice = currentPrice
  currentPrice = Math.max(2200, currentPrice + drift)

  const spread = 0.3 + Math.random() * 0.7
  const bid = currentPrice - spread / 2
  const ask = currentPrice + spread / 2
  const direction = currentPrice > prevPrice ? "up" : currentPrice < prevPrice ? "down" : "flat"

  const tick: MarketTick = { price: currentPrice, bid, ask, spread, timestamp: Date.now(), direction }
  priceHistory.push(tick)
  if (priceHistory.length > 5000) priceHistory = priceHistory.slice(-3000)
  lastTickTime = tick.timestamp
  return tick
}

// ─── Candle Builder ───────────────────────────────────────────────────────────
function buildCandlesFromTicks(tf: Timeframe): Candle[] {
  const msMap: Record<Timeframe, number> = { "1m": 60000, "5m": 300000, "15m": 900000, "30m": 1800000, "1h": 3600000, "4h": 14400000, "1d": 86400000 }
  const bucketMs = msMap[tf]
  const now = Date.now()
  const candles: Candle[] = []

  for (let i = 120; i >= 0; i--) {
    const bucketStart = now - i * bucketMs
    const bucketEnd = bucketStart + bucketMs
    const ticksInBucket = priceHistory.filter(t => t.timestamp >= bucketStart && t.timestamp < bucketEnd)

    if (ticksInBucket.length > 0) {
      const prices = ticksInBucket.map(t => t.price)
      candles.push({
        time: bucketStart,
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        volume: ticksInBucket.length * (50 + Math.random() * 200),
      })
    } else {
      const base = currentPrice - (i * (bucketMs / 60000) * 0.05)
      const range = (Math.random() * 3 + 1) * (bucketMs / 60000)
      const open = base + (Math.random() - 0.5) * range
      const close = open + (Math.random() - 0.48) * range
      candles.push({
        time: bucketStart,
        open,
        high: Math.max(open, close) + Math.random() * range * 0.3,
        low: Math.min(open, close) - Math.random() * range * 0.3,
        close,
        volume: Math.random() * 500 + 100,
      })
    }
  }

  // Ensure last candle close is 100% synchronized with currentPrice
  if (candles.length > 0) {
    const last = candles[candles.length - 1]
    last.close = currentPrice
    last.high = Math.max(last.high, currentPrice)
    last.low = Math.min(last.low, currentPrice)
  }

  return candles
}

// ─── Technical Indicators ─────────────────────────────────────────────────────
function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const ema: number[] = [data[0]]
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k))
  }
  return ema
}

function calcRSI(data: number[], period = 14): number[] {
  const rsi: number[] = new Array(data.length).fill(50)
  if (data.length < period + 1) return rsi
  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss -= change
  }
  avgGain /= period; avgLoss /= period
  rsi[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.0001))
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
    rsi[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.0001))
  }
  return rsi
}

function calcMACD(data: number[]): { line: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calcEMA(data, 12)
  const ema26 = calcEMA(data, 26)
  const line = ema12.map((v, i) => v - ema26[i])
  const signal = calcEMA(line, 9)
  const histogram = line.map((v, i) => v - signal[i])
  return { line, signal, histogram }
}

function calcBollinger(data: number[], period = 20, mult = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const middle: number[] = [], upper: number[] = [], lower: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { middle.push(data[i]); upper.push(data[i]); lower.push(data[i]); continue }
    const slice = data.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period)
    middle.push(mean); upper.push(mean + mult * std); lower.push(mean - mult * std)
  }
  return { upper, middle, lower }
}

function calcATR(candles: Candle[], period = 14): number[] {
  const atr: number[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { atr.push(candles[i].high - candles[i].low); continue }
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close))
    atr.push(i < period ? (atr.reduce((a, b) => a + b, 0) / (i + 1)) : (atr[i - 1] * (period - 1) + tr) / period)
  }
  return atr
}

export function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map(c => c.close)
  return {
    rsi: calcRSI(closes),
    ema20: calcEMA(closes, 20),
    ema50: calcEMA(closes, 50),
    ema200: calcEMA(closes, 200),
    macd: calcMACD(closes),
    bollinger: calcBollinger(closes),
    atr: calcATR(candles),
  }
}

// ─── SMC / ICT Pattern Detection ──────────────────────────────────────────────
export function detectSMCStructures(candles: Candle[]): SMCAnalysis {
  const orderBlocks: OrderBlock[] = []
  const fvg: FairValueGap[] = []
  const liquidity: LiquidityLevel[] = []
  const supplyDemand: SupplyDemandZone[] = []
  const structures: MarketStructure[] = []

  // Detect Fair Value Gaps (3-candle imbalance)
  for (let i = 2; i < candles.length; i++) {
    const prev = candles[i - 2]
    const curr = candles[i - 1]
    const next = candles[i]
    // Bullish FVG: next.low > prev.high
    if (next.low > prev.high && curr.close > curr.open) {
      fvg.push({ type: "bullish", top: next.low, bottom: prev.high, time: curr.time, filled: false })
    }
    // Bearish FVG: next.high < prev.low
    if (next.high < prev.low && curr.close < curr.open) {
      fvg.push({ type: "bearish", top: prev.low, bottom: next.high, time: curr.time, filled: false })
    }
  }

  // Detect Order Blocks (last opposing candle before strong move)
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i]
    const curr = candles[i + 1]
    const range = Math.abs(curr.close - curr.open)
    const prevRange = Math.abs(prev.close - prev.open)
    // Bullish OB: bearish candle followed by strong bullish
    if (prev.close < prev.open && curr.close > curr.open && range > prevRange * 1.5) {
      orderBlocks.push({ type: "bullish", top: prev.high, bottom: prev.low, time: prev.time, mitigated: false })
    }
    // Bearish OB: bullish candle followed by strong bearish
    if (prev.close > prev.open && curr.close < curr.open && range > prevRange * 1.5) {
      orderBlocks.push({ type: "bearish", top: prev.high, bottom: prev.low, time: prev.time, mitigated: false })
    }
  }

  // Detect Liquidity Levels (swing highs/lows)
  const recentCandles = candles.slice(-40)
  for (let i = 2; i < recentCandles.length - 2; i++) {
    const c = recentCandles[i]
    const isSwingHigh = c.high > recentCandles[i - 1].high && c.high > recentCandles[i - 2].high &&
      c.high > recentCandles[i + 1].high && c.high > recentCandles[i + 2].high
    const isSwingLow = c.low < recentCandles[i - 1].low && c.low < recentCandles[i - 2].low &&
      c.low < recentCandles[i + 1].low && c.low < recentCandles[i + 2].low
    if (isSwingHigh) liquidity.push({ type: "BSL", price: c.high, time: c.time, swept: false, label: `BSL @ ${c.high.toFixed(2)}` })
    if (isSwingLow) liquidity.push({ type: "SSL", price: c.low, time: c.time, swept: false, label: `SSL @ ${c.low.toFixed(2)}` })
  }

  // Detect Market Structure (BOS / CHOCH)
  if (recentCandles.length > 10) {
    const last = recentCandles[recentCandles.length - 1]
    const swingHighs = liquidity.filter(l => l.type === "BSL")
    const swingLows = liquidity.filter(l => l.type === "SSL")
    if (swingHighs.length > 0 && last.close > swingHighs[swingHighs.length - 1].price) {
      structures.push({ type: "BOS", direction: "bullish", price: swingHighs[swingHighs.length - 1].price, time: last.time })
    }
    if (swingLows.length > 0 && last.close < swingLows[swingLows.length - 1].price) {
      structures.push({ type: "BOS", direction: "bearish", price: swingLows[swingLows.length - 1].price, time: last.time })
    }
    // CHOCH: structure break in opposite direction
    if (structures.length >= 2) {
      const prev = structures[structures.length - 2]
      const curr = structures[structures.length - 1]
      if (prev.direction !== curr.direction) {
        structures.push({ type: "CHOCH", direction: curr.direction, price: curr.price, time: curr.time })
      }
    }
  }

  // Supply/Demand Zones from consolidation areas
  const avgRange = recentCandles.reduce((a, c) => a + (c.high - c.low), 0) / recentCandles.length
  for (let i = 0; i < recentCandles.length - 3; i++) {
    const cluster = recentCandles.slice(i, i + 3)
    const clusterRange = Math.max(...cluster.map(c => c.high)) - Math.min(...cluster.map(c => c.low))
    if (clusterRange < avgRange * 0.6) {
      const top = Math.max(...cluster.map(c => c.high))
      const bottom = Math.min(...cluster.map(c => c.low))
      const mid = (top + bottom) / 2
      if (mid > currentPrice) {
        supplyDemand.push({ type: "supply", top, bottom, time: cluster[0].time, strength: 3 - (clusterRange / avgRange) })
      } else {
        supplyDemand.push({ type: "demand", top, bottom, time: cluster[0].time, strength: 3 - (clusterRange / avgRange) })
      }
    }
  }

  // Premium/Discount
  const allHighs = candles.map(c => c.high)
  const allLows = candles.map(c => c.low)
  const rangeHigh = Math.max(...allHighs.slice(-60))
  const rangeLow = Math.min(...allLows.slice(-60))
  const equilibrium = (rangeHigh + rangeLow) / 2

  return {
    orderBlocks: orderBlocks.slice(-8),
    fvg: fvg.slice(-6),
    liquidity: liquidity.slice(-10),
    supplyDemand: supplyDemand.slice(-6),
    structures: structures.slice(-4),
    premiumDiscount: { equilibrium, premium: rangeHigh, discount: rangeLow },
  }
}

// ─── Data Integrity Monitor ───────────────────────────────────────────────────
export function getDataIntegrityState(): DataIntegrityState {
  const now = Date.now()
  const tickAge = now - lastTickTime
  let feedStatus: FeedStatus = "connected"
  if (tickAge > 60000) feedStatus = "disconnected"
  else if (tickAge > 15000) feedStatus = "delayed"

  const latestTick = priceHistory[priceHistory.length - 1]
  const spreadValue = latestTick?.spread ?? 0
  // Simulate broker vs chart price discrepancy
  const priceDiscrepancy = Math.abs((latestTick?.price ?? currentPrice) - currentPrice)
  const tradingEnabled = feedStatus === "connected" && priceDiscrepancy < 0.80
  const circuitBreakerActive = !tradingEnabled

  let circuitBreakerReason = ""
  if (feedStatus === "disconnected") circuitBreakerReason = "DATA DISCONNECTED - No valid tick received in 60s"
  else if (priceDiscrepancy >= 0.80) circuitBreakerReason = "PRICE FEED MISMATCH - Chart/Execution spread exceeds $0.80 tolerance"

  return {
    feedStatus,
    chartTimestamp: latestTick?.timestamp ?? now,
    brokerTimestamp: now,
    latestTickTimestamp: lastTickTime,
    spreadValue,
    priceDiscrepancy,
    lastUpdate: now,
    tradingEnabled,
    circuitBreakerActive,
    circuitBreakerReason,
  }
}

// ─── Order Book Generator ─────────────────────────────────────────────────────
export function generateOrderBook(): OrderBook {
  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []
  let bidTotal = 0, askTotal = 0
  for (let i = 0; i < 12; i++) {
    const bidPrice = currentPrice - 0.5 - i * (0.3 + Math.random() * 0.4)
    const askPrice = currentPrice + 0.5 + i * (0.3 + Math.random() * 0.4)
    const bidSize = Math.random() * 15 + 2
    const askSize = Math.random() * 15 + 2
    bidTotal += bidSize; askTotal += askSize
    bids.push({ price: bidPrice, size: bidSize, total: bidTotal })
    asks.push({ price: askPrice, size: askSize, total: askTotal })
  }
  return { bids, asks }
}

// ─── Market Sessions ──────────────────────────────────────────────────────────
export function getActiveSessions(): { name: string; open: boolean; overlap: boolean }[] {
  const utcHour = new Date().getUTCHours()
  const london = utcHour >= 7 && utcHour < 16
  const ny = utcHour >= 12 && utcHour < 21
  const tokyo = utcHour >= 0 && utcHour < 9
  const overlap = london && ny
  return [
    { name: "London", open: london, overlap },
    { name: "New York", open: ny, overlap },
    { name: "Tokyo", open: tokyo, overlap: tokyo && london },
  ]
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export function subscribeToTicks(cb: (tick: MarketTick) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getCurrentTick(): MarketTick {
  return priceHistory[priceHistory.length - 1] || { price: currentPrice, bid: currentPrice - 0.3, ask: currentPrice + 0.3, spread: 0.6, timestamp: Date.now(), direction: "flat" }
}

export async function loadRealKlines(tf: Timeframe): Promise<Candle[]> {
  const binanceTfMap: Record<Timeframe, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  }
  const interval = binanceTfMap[tf] || "15m"
  const klines = await fetchKlines(interval, 100)
  if (klines && klines.length > 0) {
    candleMap.set(tf, klines)
    const last = klines[klines.length - 1]
    if (last && Math.abs(currentPrice - last.close) > 10) {
      currentPrice = last.close
    }
    return klines
  }
  return buildCandlesFromTicks(tf)
}

export function getCandles(tf: Timeframe): Candle[] {
  let candles = candleMap.get(tf)
  if (!candles || candles.length === 0) {
    candles = buildCandlesFromTicks(tf)
    candleMap.set(tf, candles)
    // Asynchronously fetch real market structure candles
    loadRealKlines(tf).catch(() => {})
  } else {
    // Keep latest candle close aligned with currentPrice
    const last = candles[candles.length - 1]
    if (last) {
      last.close = currentPrice
      last.high = Math.max(last.high, currentPrice)
      last.low = Math.min(last.low, currentPrice)
    }
  }
  return candles
}

export function refreshCandles(tf: Timeframe): Candle[] {
  const candles = buildCandlesFromTicks(tf)
  candleMap.set(tf, candles)
  loadRealKlines(tf).catch(() => {})
  return candles
}

// ─── Init & Live Feed ─────────────────────────────────────────────────────────
export async function initMarketFeed(): Promise<void> {
  const livePrice = await fetchLivePrice()
  if (livePrice && livePrice > 1000 && livePrice < 15000) {
    currentPrice = livePrice
    apiConnected = true
  }

  for (let i = 0; i < 2000; i++) {
    const tick = generateTick()
    tick.timestamp = Date.now() - (2000 - i) * 1000
    priceHistory.push(tick)
  }

  // Pre-load real market structure candles for 15M, 1H, and 4H
  try {
    await Promise.all([
      loadRealKlines("15m"),
      loadRealKlines("1h"),
      loadRealKlines("4h"),
    ])
  } catch {}

  tickInterval = setInterval(() => {
    const tick = generateTick()
    listeners.forEach((cb) => cb(tick))
  }, 400)

  setInterval(async () => {
    const p = await fetchLivePrice()
    if (p && p > 1000 && p < 15000) {
      currentPrice = p
      apiConnected = true
    } else {
      apiConnected = false
    }
  }, 10000)
}

export function isApiConnected(): boolean { return apiConnected }
export function stopMarketFeed(): void { if (tickInterval) clearInterval(tickInterval) }

// ─── LocalStorage Persistence ─────────────────────────────────────────────────
const LS_KEYS = { account: "goldx_account", positions: "goldx_positions", orders: "goldx_orders", config: "goldx_config" }

export function loadAccount(): PaperAccount {
  try {
    const raw = localStorage.getItem(LS_KEYS.account)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { balance: 100000, equity: 100000, marginUsed: 0, freeMargin: 100000 }
}

export function saveAccount(acc: PaperAccount): void {
  localStorage.setItem(LS_KEYS.account, JSON.stringify(acc))
}

export function loadPositions(): TradePosition[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.positions)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function savePositions(positions: TradePosition[]): void {
  localStorage.setItem(LS_KEYS.positions, JSON.stringify(positions))
}

export function loadOrders(): MarketOrder[] {
  try {
    const raw = localStorage.getItem(LS_KEYS.orders)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveOrders(orders: MarketOrder[]): void {
  localStorage.setItem(LS_KEYS.orders, JSON.stringify(orders))
}

export function resetPaperAccount(): void {
  localStorage.removeItem(LS_KEYS.account)
  localStorage.removeItem(LS_KEYS.positions)
  localStorage.removeItem(LS_KEYS.orders)
}
