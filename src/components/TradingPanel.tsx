// TDR GOLD TREADER - Dual-Mode Manual & AI Automated Trading Panel
// Real-Money XAU/USD Accounting, Exact SL/TP Modifiers & Weekend Holding Engine
import { useState, useEffect, useCallback } from "react"
import {
  ArrowUp,
  ArrowDown,
  Target,
  Shield,
  Trash2,
  Clock,
  Sparkles,
  Sliders,
  Check,
  Edit2,
  Lock,
  Play,
  Pause,
  AlertTriangle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type {
  MarketTick,
  OrderBook,
  TradePosition,
  MarketOrder,
  OrderSide,
  OrderType,
  PaperAccount,
  BrokerMode,
  DataIntegrityState,
} from "../types"
import { generateOrderBook, savePositions, saveOrders, saveAccount, getCandles } from "../data/marketService"
import { evaluateTDRBlueprint, type TDRBlueprintEvaluation } from "../services/tdrBlueprintEngine"
import {
  getMarketHoursInfo,
  isWeekendSimulationActive,
  setWeekendSimulationActive,
} from "../utils/marketHours"

interface Props {
  tick: MarketTick
  account: PaperAccount
  onAccountChange: (acc: PaperAccount) => void
  positions: TradePosition[]
  onPositionsChange: (pos: TradePosition[]) => void
  integrity: DataIntegrityState
  brokerMode: BrokerMode
  onBrokerModeChange: (mode: BrokerMode) => void
  onUpdatePositionSLTP?: (id: string, sl: number, tp: number) => void
  theme?: "dark" | "light"
  onOpenTradingAccount?: () => void
}

export function TradingPanel({
  tick,
  account,
  onAccountChange,
  positions,
  onPositionsChange,
  integrity,
  brokerMode,
  onBrokerModeChange,
  onUpdatePositionSLTP,
  theme = "dark",
  onOpenTradingAccount,
}: Props) {
  const isLight = theme === "light"
  // ─── Mode: Manual vs AI Automated ──────────────────────────────────────────
  const [tradingStyle, setTradingStyle] = useState<"manual" | "automated">("manual")

  // ─── Market Hours & Weekend Closure ────────────────────────────────────────
  const [simOverride, setSimOverride] = useState<boolean>(isWeekendSimulationActive())
  const [marketHours, setMarketHours] = useState(() => getMarketHoursInfo(simOverride))

  useEffect(() => {
    const timer = setInterval(() => {
      setMarketHours(getMarketHoursInfo(simOverride))
    }, 1000)
    return () => clearInterval(timer)
  }, [simOverride])

  const handleToggleSimOverride = () => {
    const next = !simOverride
    setSimOverride(next)
    setWeekendSimulationActive(next)
    setMarketHours(getMarketHoursInfo(next))
    toast.info(next ? "Weekend simulation override enabled (Demo testing)." : "Real market hours schedule restored.")
  }

  // ─── Manual Order State ───────────────────────────────────────────────────
  const [orderBook, setOrderBook] = useState<OrderBook>(generateOrderBook())
  const [side, setSide] = useState<OrderSide>("buy")
  const [orderType, setOrderType] = useState<OrderType>("market")
  const [lots, setLots] = useState(0.10) // 0.10 lot = 10 oz standard
  const [leverage, setLeverage] = useState(100) // Standard broker leverage
  const [sl, setSl] = useState(0)
  const [tp, setTp] = useState(0)
  const [limitPrice, setLimitPrice] = useState(tick.price)

  // ─── In-Line SL/TP Position Edit Modal / Inline State ───────────────────────
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null)
  const [editSlValue, setEditSlValue] = useState("")
  const [editTpValue, setEditTpValue] = useState("")

  // ─── AI Auto-Trading State (TDR FX Blueprint Autonomous Engine) ───────────
  const [autoTradingActive, setAutoTradingActive] = useState(false)
  const [autoConfidence, setAutoConfidence] = useState(80)
  const [autoRiskPercent, setAutoRiskPercent] = useState(1.0)
  const [lastAutoTrigger, setLastAutoTrigger] = useState<string | null>(null)
  const [liveBlueprint, setLiveBlueprint] = useState<TDRBlueprintEvaluation | null>(null)

  // Refresh Orderbook & limit price
  useEffect(() => {
    const id = setInterval(() => setOrderBook(generateOrderBook()), 800)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setLimitPrice(tick.price)
  }, [tick.price])

  // ─── Real-Money Calculations (1 Standard Lot = 100 oz) ────────────────────
  // 1 Lot = 100 troy ounces. A $1.00 movement in Gold = $100.00 PnL per lot.
  const contractOunces = lots * 100
  const marginRequired = (contractOunces * tick.price) / leverage

  // Stop Loss & Take Profit calculations
  const entryPrice = orderType === "market" ? (side === "buy" ? tick.ask : tick.bid) : limitPrice
  const slDistance = sl > 0 ? (side === "buy" ? entryPrice - sl : sl - entryPrice) : 0
  const tpDistance = tp > 0 ? (side === "buy" ? tp - entryPrice : entryPrice - tp) : 0

  const maxLossUSD = slDistance > 0 ? slDistance * contractOunces : 0
  const maxGainUSD = tpDistance > 0 ? tpDistance * contractOunces : 0
  const lossPctEquity = account.equity > 0 ? (maxLossUSD / account.equity) * 100 : 0
  const gainPctEquity = account.equity > 0 ? (maxGainUSD / account.equity) * 100 : 0
  const rrRatio = slDistance > 0 && tpDistance > 0 ? (tpDistance / slDistance).toFixed(2) : "—"

  const canTrade = integrity.tradingEnabled && !integrity.circuitBreakerActive

  // Quick Preset Helper for SL/TP
  const applyPresetSL = (pipsUSD: number) => {
    if (side === "buy") {
      setSl(Math.max(0, +(entryPrice - pipsUSD).toFixed(2)))
    } else {
      setSl(Math.max(0, +(entryPrice + pipsUSD).toFixed(2)))
    }
  }

  const applyPresetTP = (pipsUSD: number) => {
    if (side === "buy") {
      setTp(Math.max(0, +(entryPrice + pipsUSD).toFixed(2)))
    } else {
      setTp(Math.max(0, +(entryPrice - pipsUSD).toFixed(2)))
    }
  }

  // ─── Execute Manual Order (Real Broker Rule: Blocked when market closed) ───
  const executeTrade = useCallback(() => {
    // 1. Strict Market Hours Verification (Real Broker Rule)
    if (!marketHours.isOpen) {
      toast.error(
        `Market Closed: Interbank gold trading is offline. Re-opens Sunday at 22:00 UTC (${marketHours.countdownText}). Orders cannot be placed while market is closed.`
      )
      return
    }

    if (!canTrade) {
      toast.error(integrity.circuitBreakerReason || "Trading disabled - data integrity check failed")
      return
    }

    if (account.freeMargin < marginRequired) {
      toast.error(`Insufficient Free Margin ($${account.freeMargin.toFixed(2)} available, $${marginRequired.toFixed(2)} required)`)
      return
    }

    const calculatedSl = sl || (side === "buy" ? entryPrice - 5.0 : entryPrice + 5.0)
    const calculatedTp = tp || (side === "buy" ? entryPrice + 10.0 : entryPrice - 10.0)

    const pos: TradePosition = {
      id: crypto.randomUUID(),
      side,
      entryPrice,
      size: lots, // in standard lots (0.10 lot = 10 oz)
      leverage,
      sl: calculatedSl,
      tp: calculatedTp,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      margin: marginRequired,
      brokerPositionId:
        brokerMode === "LIVE"
          ? `EXN_LIVE_${Date.now().toString().slice(-4)}`
          : `DEMO_${Date.now().toString().slice(-4)}`,
    }

    const newPositions = [...positions, pos]
    onPositionsChange(newPositions)
    savePositions(newPositions)

    const newAcc = {
      ...account,
      marginUsed: account.marginUsed + marginRequired,
      freeMargin: Math.max(0, account.freeMargin - marginRequired),
    }
    onAccountChange(newAcc)
    saveAccount(newAcc)

    const order: MarketOrder = {
      id: crypto.randomUUID(),
      side,
      type: orderType,
      price: entryPrice,
      size: lots,
      leverage,
      sl: calculatedSl,
      tp: calculatedTp,
      status: "filled",
      createdAt: Date.now(),
      filledAt: Date.now(),
      fillPrice: entryPrice,
    }
    const orders = JSON.parse(localStorage.getItem("goldx_orders") || "[]")
    saveOrders([order, ...orders])

    toast.success(
      `Order Filled (${brokerMode}): ${side.toUpperCase()} ${lots} lots (${contractOunces} oz) @ $${entryPrice.toFixed(2)}`
    )
  }, [
    marketHours,
    canTrade,
    account,
    marginRequired,
    sl,
    tp,
    side,
    entryPrice,
    lots,
    leverage,
    positions,
    onPositionsChange,
    onAccountChange,
    brokerMode,
    contractOunces,
    orderType,
    integrity,
  ])

  // ─── Close Position ───────────────────────────────────────────────────────
  const closePosition = useCallback(
    (id: string) => {
      const pos = positions.find((p) => p.id === id)
      if (!pos) return
      const closePrice = pos.side === "buy" ? tick.bid : tick.ask
      const contractOz = pos.size * 100
      const pnl =
        pos.side === "buy"
          ? (closePrice - pos.entryPrice) * contractOz
          : (pos.entryPrice - closePrice) * contractOz

      const newAcc = {
        ...account,
        balance: account.balance + pnl,
        equity: account.equity + pnl,
        marginUsed: Math.max(0, account.marginUsed - pos.margin),
        freeMargin: account.freeMargin + pos.margin + pnl,
      }
      onAccountChange(newAcc)
      saveAccount(newAcc)

      const newPositions = positions.filter((p) => p.id !== id)
      onPositionsChange(newPositions)
      savePositions(newPositions)

      toast.info(`Position closed: Net P/L ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} USD`)
    },
    [positions, tick, account, onPositionsChange, onAccountChange]
  )

  const closeAll = useCallback(() => {
    positions.forEach((p) => closePosition(p.id))
  }, [positions, closePosition])

  // ─── Real-Time Floating PnL & Auto TP/SL Execution Engine ─────────────────
  useEffect(() => {
    if (positions.length === 0) return

    let totalFloatingPnl = 0
    let realizedClosedPnl = 0
    let releasedMargin = 0
    const remaining: TradePosition[] = []

    positions.forEach((p) => {
      const cur = p.side === "buy" ? tick.bid : tick.ask
      const contractOz = p.size * 100
      const pnl =
        p.side === "buy"
          ? (cur - p.entryPrice) * contractOz
          : (p.entryPrice - cur) * contractOz

      // Check Take Profit trigger
      const hitTp =
        p.tp > 0 &&
        ((p.side === "buy" && cur >= p.tp) || (p.side === "sell" && cur <= p.tp))

      // Check Stop Loss trigger
      const hitSl =
        p.sl > 0 &&
        ((p.side === "buy" && cur <= p.sl) || (p.side === "sell" && cur >= p.sl))

      if (hitTp || hitSl) {
        realizedClosedPnl += pnl
        releasedMargin += p.margin || 0
      } else {
        totalFloatingPnl += pnl
        remaining.push({
          ...p,
          currentPrice: cur,
          pnl,
          pnlPercent: (pnl / (p.margin || 1)) * 100,
        })
      }
    })

    if (realizedClosedPnl !== 0 || remaining.length !== positions.length) {
      const newBalance = account.balance + realizedClosedPnl
      const newMargin = Math.max(0, account.marginUsed - releasedMargin)
      const newEquity = newBalance + totalFloatingPnl
      const newAcc = {
        ...account,
        balance: newBalance,
        equity: newEquity,
        marginUsed: newMargin,
        freeMargin: Math.max(0, newEquity - newMargin),
      }
      onAccountChange(newAcc)
      saveAccount(newAcc)
      onPositionsChange(remaining)
      savePositions(remaining)

      if (realizedClosedPnl > 0) {
        toast.success(
          `🎯 Target TP Triggered: +$${realizedClosedPnl.toFixed(2)} USD profit credited directly to Balance!`
        )
      } else if (realizedClosedPnl < 0) {
        toast.info(
          `🛡️ Stop Loss Triggered: -$${Math.abs(realizedClosedPnl).toFixed(2)} USD loss deducted from Balance.`
        )
      }
    } else {
      // Dynamic Floating Equity / Trading Balance fluctuation during open positions
      const newEquity = Math.max(0, account.balance + totalFloatingPnl)
      onAccountChange({
        ...account,
        equity: newEquity,
        freeMargin: Math.max(0, newEquity - account.marginUsed),
      })
    }
  }, [tick.price])

  // ─── Inline Edit SL & TP on Open Position ─────────────────────────────────
  const handleStartEditPosition = (pos: TradePosition) => {
    setEditingPositionId(pos.id)
    setEditSlValue(pos.sl ? pos.sl.toString() : "")
    setEditTpValue(pos.tp ? pos.tp.toString() : "")
  }

  const handleSaveEditPosition = (posId: string) => {
    const newSlNum = parseFloat(editSlValue) || 0
    const newTpNum = parseFloat(editTpValue) || 0

    if (onUpdatePositionSLTP) {
      onUpdatePositionSLTP(posId, newSlNum, newTpNum)
    } else {
      const updated = positions.map((p) =>
        p.id === posId ? { ...p, sl: newSlNum, tp: newTpNum } : p
      )
      onPositionsChange(updated)
      savePositions(updated)
      toast.success("Position SL/TP modified successfully.")
    }
    setEditingPositionId(null)
  }

  // ─── TDR FX Autonomous Master Switch ─────────────────────────────────────
  const toggleAutoTrading = useCallback(() => {
    if (autoTradingActive) {
      setAutoTradingActive(false)
      toast.info("AI Autonomous Scalper Paused. Capital preserved.")
      return
    }

    const hours = getMarketHoursInfo(isWeekendSimulationActive())
    if (!hours.isOpen) {
      toast.error(
        `Market Closed (${hours.statusLabel}): Real broker rules prohibit automated trading while interbank gold is offline. Trading re-opens Sunday at 22:00 UTC.`
      )
      return
    }

    if (!canTrade) {
      toast.error(integrity.circuitBreakerReason || "Trading disabled: Feed integrity check failed.")
      return
    }

    setAutoTradingActive(true)
    setLastAutoTrigger(new Date().toLocaleTimeString())
    toast.success(
      `🤖 TDR FX Autonomous Engine RUNNING: Continuously analyzing 4H Direction → 1H POI → 15M Confirmation. The system will ONLY execute when the market strictly meets the TDR FX Blueprint A+ rules!`
    )
  }, [autoTradingActive, canTrade, integrity.circuitBreakerReason])

  // ─── Continuous TDR FX Blueprint Autonomous Evaluation & Execution Loop ───
  useEffect(() => {
    const candles = getCandles("15m")
    const evaluation = evaluateTDRBlueprint(candles, tick, autoConfidence)
    setLiveBlueprint(evaluation)

    if (!autoTradingActive) return

    // Real Broker Rule: Market must be open to enter orders
    if (!marketHours.isOpen) return

    // Only enter if the market strictly meets ALL TDR FX Blueprint rules (A+ Setup)
    if (
      evaluation.isAplusSetup &&
      evaluation.direction !== "neutral" &&
      evaluation.confidence >= autoConfidence
    ) {
      // Prevent duplicate trade spam: if an AI position was opened within the last 180 seconds, do not stack
      const recentAiPos = positions.find(
        (p) => p.brokerPositionId?.includes("AI_TDR") && Date.now() - p.openedAt < 180000
      )
      if (recentAiPos) return

      // Strict Risk Engine: Risk cap 1% to 5% of equity
      const riskPct = Math.min(5.0, Math.max(0.5, autoRiskPercent))
      const riskCapUSD = account.equity * (riskPct / 100)
      const slDist = Math.max(1.5, Math.abs(evaluation.entryPrice - evaluation.slPrice))
      const rawLots = riskCapUSD / (slDist * 100) // 1 lot = 100 oz
      const calculatedLots = Math.max(0.01, Math.min(2.0, Math.round(rawLots * 100) / 100))
      const marginNeeded = (calculatedLots * 100 * evaluation.entryPrice) / leverage

      if (account.freeMargin < marginNeeded) {
        toast.error(`Auto-Trader: Insufficient free margin for A+ trade ($${marginNeeded.toFixed(2)} required)`)
        return
      }

      // Execute the verified A+ trade
      const newPos: TradePosition = {
        id: crypto.randomUUID(),
        side: evaluation.direction,
        entryPrice: evaluation.entryPrice,
        size: calculatedLots,
        leverage,
        sl: evaluation.slPrice,
        tp: evaluation.tp1Price,
        pnl: 0,
        pnlPercent: 0,
        openedAt: Date.now(),
        margin: marginNeeded,
        brokerPositionId:
          brokerMode === "LIVE"
            ? `EXN_AI_TDR_${Date.now().toString().slice(-4)}`
            : `DEMO_AI_TDR_${Date.now().toString().slice(-4)}`,
      }

      const updated = [newPos, ...positions]
      onPositionsChange(updated)
      savePositions(updated)

      const updatedAcc = {
        ...account,
        marginUsed: account.marginUsed + marginNeeded,
        freeMargin: Math.max(0, account.freeMargin - marginNeeded),
      }
      onAccountChange(updatedAcc)
      saveAccount(updatedAcc)

      setLastAutoTrigger(new Date().toLocaleTimeString())

      toast.success(
        `🎯 TDR FX A+ Setup Verified! AI Auto-Trader opened ${evaluation.direction.toUpperCase()} ${calculatedLots} lots @ $${evaluation.entryPrice.toFixed(2)} [SL: $${evaluation.slPrice.toFixed(2)} | TP: $${evaluation.tp1Price.toFixed(2)}] (R:R: ${evaluation.rrRatio}:1)`
      )
    }
  }, [
    tick.price,
    autoTradingActive,
    autoConfidence,
    autoRiskPercent,
    marketHours.isOpen,
    account.equity,
    account.freeMargin,
    leverage,
    positions,
    onPositionsChange,
    onAccountChange,
    brokerMode,
  ])

  const maxAsk = Math.max(...orderBook.asks.map((a) => a.size))
  const maxBid = Math.max(...orderBook.bids.map((b) => b.size))

  return (
    <div className={`flex flex-col gap-3 h-full overflow-y-auto p-2 font-mono text-xs transition-colors ${
      isLight ? "bg-white text-slate-800" : "bg-[#0B0E14] text-zinc-200"
    }`}>
      {/* ─── 1. Trading Style Selector: Manual vs AI Automated ─────────────── */}
      <div className={`rounded-xl p-1 flex gap-1 border transition-colors ${
        isLight ? "bg-slate-100 border-slate-200" : "bg-[#12161F] border-zinc-800"
      }`}>
        <button
          onClick={() => setTradingStyle("manual")}
          className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            tradingStyle === "manual"
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : isLight
              ? "text-slate-600 hover:text-slate-900"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          MANUAL TRADING
        </button>
        <button
          onClick={() => setTradingStyle("automated")}
          className={`flex-1 py-2 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            tradingStyle === "automated"
              ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20"
              : isLight
              ? "text-slate-600 hover:text-slate-900"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI AUTO-TRADER
        </button>
      </div>

      {/* ─── 2. Market Hours & Weekend Holding Status ──────────────────────── */}
      <div
        className={`p-2.5 rounded-xl border text-[11px] space-y-1 transition ${
          marketHours.isOpen
            ? isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
            : isLight
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : "bg-amber-500/10 border-amber-500/40 text-amber-300"
        }`}
      >
        <div className="flex items-center justify-between font-bold">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                marketHours.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{marketHours.statusLabel}</span>
          </div>
          <button
            onClick={handleToggleSimOverride}
            className={`text-[9px] px-2 py-0.5 rounded border transition ${
              isLight
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                : "border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300"
            }`}
            title="Toggle weekend simulation override for Demo testing"
          >
            Sim Mode: {simOverride ? "ON" : "OFF"}
          </button>
        </div>

        <div className={`text-[10px] flex items-center justify-between ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
          <span>{marketHours.nextEventLabel}</span>
          <span className={`font-bold ${isLight ? "text-slate-800" : "text-zinc-300"}`}>{marketHours.countdownText}</span>
        </div>

        {!marketHours.isOpen && (
          <div className={`text-[10px] pt-1 border-t leading-tight ${
            isLight ? "text-amber-800 border-amber-200" : "text-amber-200/90 border-amber-500/20"
          }`}>
            <Lock className="w-3 h-3 inline mr-1 text-amber-500" />
            <strong>Exness Weekend Hold:</strong> Open positions are carried over safely until market re-opens. Instant market orders paused.
          </div>
        )}
      </div>

      {/* ─── 3. TAB A: MANUAL TRADING CONTROLS ──────────────────────────────── */}
      {tradingStyle === "manual" && (
        <div className={`border rounded-xl p-3 space-y-3 transition-colors ${
          isLight ? "bg-white border-slate-200 shadow-2xs text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isLight ? "text-slate-800" : "text-zinc-300"}`}>
              Manual Order Entry
            </span>
            <span className="text-[10px] text-amber-500 font-bold">
              1 Lot = 100 oz ($100/$)
            </span>
          </div>

          {/* Side Toggle: BUY vs SELL */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("buy")}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                side === "buy"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400"
                  : isLight
                  ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                  : "bg-[#161B22] border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
              BUY (LONG)
              <span className="text-[10px] opacity-80">${tick.ask.toFixed(1)}</span>
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                side === "sell"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20 ring-1 ring-rose-400"
                  : isLight
                  ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                  : "bg-[#161B22] border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              SELL (SHORT)
              <span className="text-[10px] opacity-80">${tick.bid.toFixed(1)}</span>
            </button>
          </div>

          {/* Order Type: Market / Limit / Stop */}
          <div className="flex gap-1">
            {(["market", "limit", "stop"] as OrderType[]).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition ${
                  orderType === t
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                    : isLight
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-[#161B22] text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Lot Size & Preset Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Order Volume (Lots)</span>
              <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                {contractOunces.toFixed(1)} oz • ${(contractOunces * tick.price).toLocaleString(undefined, { maximumFractionDigits: 0 })} Notional
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10.0"
                value={lots}
                onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className={`w-24 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none border transition ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
                    : "bg-[#0D1117] border-zinc-700 text-zinc-100 focus:border-amber-400"
                }`}
              />
              <div className="flex-1 flex gap-1 overflow-x-auto">
                {[0.01, 0.05, 0.10, 0.50, 1.00].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setLots(preset)}
                    className={`px-1.5 py-1 rounded text-[10px] border transition ${
                      lots === preset
                        ? "bg-amber-500/20 border-amber-500 text-amber-600 font-bold"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-[#0D1117] border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Margin Required */}
          <div className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#0D1117] border-zinc-800 text-zinc-300"
          }`}>
            <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Required Margin (1:{leverage})</span>
            <span className="text-amber-500 font-bold">${marginRequired.toFixed(2)} USD</span>
          </div>

          {/* Stop Loss (SL) & Take Profit (TP) Inputs & Quick Modifiers */}
          <div className={`space-y-2 pt-1 border-t ${isLight ? "border-slate-200" : "border-zinc-800/80"}`}>
            {/* Stop Loss Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label className={`flex items-center gap-1 font-semibold ${isLight ? "text-slate-700" : "text-zinc-400"}`}>
                  <Shield className="w-3 h-3 text-rose-500" />
                  Stop Loss ($)
                </label>
                <div className="flex gap-1 text-[9px]">
                  <button
                    type="button"
                    onClick={() => applyPresetSL(2.0)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    -$2.00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetSL(5.0)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    -$5.00
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder={side === "buy" ? (entryPrice - 5).toFixed(2) : (entryPrice + 5).toFixed(2)}
                value={sl || ""}
                onChange={(e) => setSl(parseFloat(e.target.value) || 0)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs text-rose-500 font-bold outline-none border transition ${
                  isLight ? "bg-slate-50 border-slate-300 focus:border-rose-500" : "bg-[#0D1117] border-zinc-700 focus:border-rose-500"
                }`}
              />
            </div>

            {/* Take Profit Input */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label className={`flex items-center gap-1 font-semibold ${isLight ? "text-slate-700" : "text-zinc-400"}`}>
                  <Target className="w-3 h-3 text-emerald-500" />
                  Take Profit ($)
                </label>
                <div className="flex gap-1 text-[9px]">
                  <button
                    type="button"
                    onClick={() => applyPresetTP(5.0)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    +$5.00
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetTP(10.0)}
                    className={`px-1.5 py-0.5 rounded transition ${
                      isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    +$10.00
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder={side === "buy" ? (entryPrice + 10).toFixed(2) : (entryPrice - 10).toFixed(2)}
                value={tp || ""}
                onChange={(e) => setTp(parseFloat(e.target.value) || 0)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-xs text-emerald-500 font-bold outline-none border transition ${
                  isLight ? "bg-slate-50 border-slate-300 focus:border-emerald-500" : "bg-[#0D1117] border-zinc-700 focus:border-emerald-500"
                }`}
              />
            </div>

            {/* Real Money Risk vs Reward Breakdown */}
            <div className={`p-2.5 rounded-lg border space-y-1 text-[10px] ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#090C10] border-zinc-800 text-zinc-300"
            }`}>
              <div className="flex items-center justify-between">
                <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Max Risk (SL):</span>
                <span className="text-rose-500 font-bold">
                  {maxLossUSD > 0 ? `-$${maxLossUSD.toFixed(2)} (${lossPctEquity.toFixed(2)}%)` : "Dynamic / 1% Cap"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Target Profit (TP):</span>
                <span className="text-emerald-500 font-bold">
                  {maxGainUSD > 0 ? `+$${maxGainUSD.toFixed(2)} (${gainPctEquity.toFixed(2)}%)` : "Dynamic Target"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Calculated R:R Ratio:</span>
                <span className="text-amber-500 font-bold">{rrRatio}:1</span>
              </div>
            </div>
          </div>

          {/* Order Execution Button (Real Broker Rule: Disabled when market closed) */}
          <button
            onClick={executeTrade}
            disabled={!marketHours.isOpen || account.freeMargin < marginRequired}
            className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
              !marketHours.isOpen
                ? isLight
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                : account.freeMargin < marginRequired
                ? isLight
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                : side === "buy"
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-emerald-500/20 cursor-pointer"
                : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white shadow-rose-500/20 cursor-pointer"
            }`}
          >
            {!marketHours.isOpen ? (
              <>
                <Clock className="w-4 h-4 text-amber-500" />
                MARKET CLOSED (OPENS SUN 22:00 UTC)
              </>
            ) : account.freeMargin < marginRequired ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                INSUFFICIENT FREE MARGIN
              </>
            ) : (
              <>
                {side === "buy" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {side.toUpperCase()} {lots} LOTS @ ${entryPrice.toFixed(2)} {brokerMode === "DEMO" ? "(DEMO)" : ""}
              </>
            )}
          </button>

          {!marketHours.isOpen && (
            <p className={`text-[10px] text-center font-mono mt-1 ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              🔒 Real Broker Rule: Market is offline until Sunday 22:00 UTC. Chart is live for analysis, but new orders are strictly closed.
            </p>
          )}
        </div>
      )}

      {/* ─── 4. TAB B: AI AUTOMATED TRADING CONTROLS ───────────────────────── */}
      {tradingStyle === "automated" && (
        <div className={`border rounded-xl p-3 space-y-3 transition-colors ${
          isLight
            ? "bg-white border-purple-300 shadow-2xs text-slate-800"
            : "bg-[#12161F] border-purple-500/30 text-zinc-200"
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
            <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              AI Automated Scalper
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                autoTradingActive
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 animate-pulse"
                  : isLight
                  ? "bg-slate-100 text-slate-500"
                  : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {autoTradingActive ? "ACTIVE" : "PAUSED"}
            </span>
          </div>

          <p className={`text-[10px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
            The AI engine autonomously evaluates real-time market structure (Fair Value Gaps, Liquidity Sweeps, Order Blocks) and executes high-probability setups with strict risk limits.
          </p>

          {/* Autopilot Master Switch (TDR FX Blueprint Autonomous Engine) */}
          <button
            onClick={toggleAutoTrading}
            disabled={!marketHours.isOpen}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              !marketHours.isOpen
                ? isLight
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                : autoTradingActive
                ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-500/40 cursor-pointer shadow-lg shadow-rose-500/10"
                : "bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-700 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 cursor-pointer"
            }`}
          >
            {!marketHours.isOpen ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                MARKET CLOSED (OPENS SUN 22:00 UTC)
              </>
            ) : autoTradingActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                PAUSE AI AUTO-TRADER (RUNNING & SCANNING)
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                START AI AUTOMATED TRADING (TDR FX BLUEPRINT)
              </>
            )}
          </button>

          {!marketHours.isOpen && (
            <p className={`text-[10px] text-center font-mono mt-1 ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              🔒 Real Broker Rule: Market is offline until Sunday 22:00 UTC. Automated scalper cannot place orders during market closure.
            </p>
          )}

          {/* Auto Parameters */}
          <div className={`space-y-2 pt-2 border-t text-[10px] ${isLight ? "border-slate-200" : "border-zinc-800/80"}`}>
            <div>
              <div className="flex justify-between mb-1">
                <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Min Confluence Threshold:</span>
                <span className="text-purple-500 font-bold">{autoConfidence}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={90}
                value={autoConfidence}
                onChange={(e) => setAutoConfidence(+e.target.value)}
                className="w-full accent-purple-500 h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className={isLight ? "text-slate-600" : "text-zinc-400"}>Max Equity Risk per Trade:</span>
                <span className="text-amber-500 font-bold">{autoRiskPercent.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={autoRiskPercent}
                onChange={(e) => setAutoRiskPercent(+e.target.value)}
                className="w-full accent-amber-500 h-1.5"
              />
            </div>
          </div>

          {/* TDR FX Live Blueprint Confluence Status Card */}
          <div className={`p-2.5 rounded-lg border space-y-1.5 text-[10px] ${
            isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#090C10] border-zinc-800 text-zinc-300"
          }`}>
            <div className={`font-bold text-amber-500 border-b pb-1 flex items-center justify-between ${
              isLight ? "border-slate-200" : "border-zinc-800/80"
            }`}>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoTradingActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
                TDR FX BLUEPRINT AUDIT
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                liveBlueprint?.isAplusSetup
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-500 border border-amber-500/40"
              }`}>
                {liveBlueprint?.isAplusSetup ? "A+ CONFLUENCE CONFIRMED" : "SCANNING (NO A+ YET)"}
              </span>
            </div>

            {/* Step 1: 4H Market Direction */}
            <div className="flex justify-between items-center">
              <span className={isLight ? "text-slate-500" : "text-zinc-500"}>1. 4H Direction:</span>
              <span className={`font-bold ${liveBlueprint?.checklist.rule4H.passed ? "text-emerald-500" : "text-amber-500"}`}>
                {liveBlueprint?.checklist.rule4H.bias || "SCANNING"} ({liveBlueprint?.checklist.rule4H.isDiscount ? "Discount EQ" : "Premium EQ"}) {liveBlueprint?.checklist.rule4H.passed ? "✓" : "⏳"}
              </span>
            </div>

            {/* Step 2: 1H Location (POI) */}
            <div className="flex justify-between items-center">
              <span className={isLight ? "text-slate-500" : "text-zinc-500"}>2. 1H Location (POI):</span>
              <span className={`font-bold ${liveBlueprint?.checklist.rule1H.passed ? "text-emerald-500" : "text-amber-500"}`}>
                {liveBlueprint?.checklist.rule1H.poiType || "POI"} {liveBlueprint?.checklist.rule1H.passed ? "✓" : `(+$${liveBlueprint?.checklist.rule1H.priceDistanceToPoi} away) ⏳`}
              </span>
            </div>

            {/* Step 3: 15M Confirmation */}
            <div className="flex justify-between items-center">
              <span className={isLight ? "text-slate-500" : "text-zinc-500"}>3. 15M Confirmation:</span>
              <span className={`font-bold ${liveBlueprint?.checklist.rule15M.passed ? "text-emerald-500" : "text-amber-500"}`}>
                {liveBlueprint?.checklist.rule15M.sweepConfirmed ? "Sweep ✓" : "Sweep ⏳"} | {liveBlueprint?.checklist.rule15M.chochConfirmed ? "CHOCH ✓" : "CHOCH ⏳"}
              </span>
            </div>

            {/* Step 4: Risk Engine */}
            <div className="flex justify-between items-center">
              <span className={isLight ? "text-slate-500" : "text-zinc-500"}>4. Risk Engine:</span>
              <span className={`font-bold ${liveBlueprint?.checklist.ruleRisk.passed ? "text-emerald-500" : "text-rose-500"}`}>
                {!marketHours.isOpen ? "Market Closed 🔒" : liveBlueprint?.checklist.ruleRisk.passed ? `Approved (1:${liveBlueprint?.rrRatio.toFixed(1)} R:R) ✓` : `R:R < 1:2 ⏳`}
              </span>
            </div>

            {/* Autonomous Rule Explanation */}
            <div className={`border-t pt-1.5 text-[9px] ${isLight ? "border-slate-200 text-slate-600" : "border-zinc-800 text-zinc-400"}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold text-amber-500">Autonomous Policy:</span>
                <span>Last Scan: {lastAutoTrigger || "Active"}</span>
              </div>
              <p className="leading-tight">
                {liveBlueprint?.isAplusSetup
                  ? "🎯 A+ setup verified! Position automatically executed with structural SL & 1:2 TP."
                  : "🛡️ TDR FX Blueprint is waiting for A+ confluence. Capital is strictly held and protected until market rules confirm entry."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Open Positions & Real-Time Modification ─────────────────────── */}
      <div className={`border rounded-xl p-3 space-y-2 transition-colors ${
        isLight ? "bg-white border-slate-200 shadow-2xs text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
      }`}>
        <div className={`flex items-center justify-between pb-1 border-b ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold uppercase ${isLight ? "text-slate-800" : "text-zinc-300"}`}>
              Open Positions ({positions.length})
            </span>
            {!marketHours.isOpen && positions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-500 border border-amber-500/40">
                HELD OVER WEEKEND
              </span>
            )}
          </div>
          {positions.length > 0 && (
            <button
              onClick={closeAll}
              className="text-[10px] text-rose-500 hover:text-rose-600 flex items-center gap-1 font-bold"
            >
              <Trash2 className="w-3 h-3" /> Close All
            </button>
          )}
        </div>

        {positions.length === 0 ? (
          <p className={`text-[11px] text-center py-4 ${isLight ? "text-slate-400" : "text-zinc-500"}`}>
            No active positions
          </p>
        ) : (
          <div className="space-y-2">
            {positions.map((p) => {
              const isEditing = editingPositionId === p.id
              return (
                <div
                  key={p.id}
                  className={`rounded-lg p-2.5 text-[10px] border space-y-1.5 transition ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0D1117] border-zinc-800 text-zinc-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        p.side === "buy" ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {p.side.toUpperCase()} {p.size.toFixed(2)} lots @ ${p.entryPrice.toFixed(2)}
                    </span>
                    <button
                      onClick={() => closePosition(p.id)}
                      className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border border-rose-500/30 font-bold text-[9px] transition"
                    >
                      CLOSE
                    </button>
                  </div>

                  {/* Real-Money Floating PnL Display */}
                  <div className="flex justify-between items-center">
                    <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Live Floating P/L:</span>
                    <span
                      className={`font-bold text-xs ${
                        p.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {p.pnl >= 0 ? `+$${p.pnl.toFixed(2)}` : `-$${Math.abs(p.pnl).toFixed(2)}`} (
                      {p.pnlPercent.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Weekend Hold Indicator on position */}
                  {!marketHours.isOpen && (
                    <div className="text-[9px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Exness Weekend Hold Active (Safe until market open)</span>
                    </div>
                  )}

                  {/* SL / TP Values & Edit Trigger */}
                  {!isEditing ? (
                    <div className={`flex items-center justify-between pt-1 border-t text-[10px] ${
                      isLight ? "border-slate-200 text-slate-600" : "border-zinc-800/80 text-zinc-400"
                    }`}>
                      <span>
                        SL: <strong className="text-rose-500">${p.sl ? p.sl.toFixed(1) : "—"}</strong> | TP:{" "}
                        <strong className="text-emerald-500">${p.tp ? p.tp.toFixed(1) : "—"}</strong>
                      </span>
                      <button
                        onClick={() => handleStartEditPosition(p)}
                        className={`px-1.5 py-0.5 rounded text-[9px] flex items-center gap-1 transition ${
                          isLight ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        Modify SL/TP
                      </button>
                    </div>
                  ) : (
                    /* Inline Modifier Form */
                    <div className={`p-2 rounded border space-y-1.5 pt-1 ${
                      isLight ? "bg-white border-amber-400" : "bg-[#161B22] border-amber-500/30"
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-amber-500 block">
                        Adjust Position Stop Loss & Take Profit
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className={`text-[9px] block ${isLight ? "text-slate-600" : "text-zinc-400"}`}>New SL ($)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editSlValue}
                            onChange={(e) => setEditSlValue(e.target.value)}
                            className={`w-full rounded px-1.5 py-1 text-[10px] text-rose-500 border ${
                              isLight ? "bg-slate-50 border-slate-300" : "bg-[#0D1117] border-zinc-700"
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`text-[9px] block ${isLight ? "text-slate-600" : "text-zinc-400"}`}>New TP ($)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editTpValue}
                            onChange={(e) => setEditTpValue(e.target.value)}
                            className={`w-full rounded px-1.5 py-1 text-[10px] text-emerald-500 border ${
                              isLight ? "bg-slate-50 border-slate-300" : "bg-[#0D1117] border-zinc-700"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-1 justify-end pt-1">
                        <button
                          onClick={() => setEditingPositionId(null)}
                          className={`px-2 py-0.5 rounded text-[9px] ${
                            isLight ? "text-slate-500 hover:text-slate-800" : "text-zinc-400 hover:text-zinc-200"
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEditPosition(p.id)}
                          className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-bold text-[9px] flex items-center gap-1 shadow"
                        >
                          <Check className="w-3 h-3" />
                          Save SL/TP
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── 6. Live Order Book ────────────────────────────────────────────── */}
      <div className={`border rounded-xl p-3 transition-colors ${
        isLight ? "bg-white border-slate-200 shadow-2xs text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
      }`}>
        <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
          isLight ? "text-slate-600" : "text-zinc-400"
        }`}>
          Order Book Depth
        </h4>
        <div className="space-y-0.5 text-[9px]">
          {orderBook.asks.slice(0, 5).reverse().map((a, i) => (
            <div key={i} className="relative flex justify-between px-1">
              <div
                className="absolute inset-0 bg-rose-500/10"
                style={{ width: `${(a.size / maxAsk) * 100}%`, right: 0, left: "auto" }}
              />
              <span className="text-rose-500 font-semibold relative z-10">${a.price.toFixed(2)}</span>
              <span className={`relative z-10 ${isLight ? "text-slate-600" : "text-zinc-400"}`}>{a.size.toFixed(1)}</span>
            </div>
          ))}
          <div className={`py-0.5 text-center text-amber-500 font-bold text-[10px] border-y my-0.5 ${
            isLight ? "border-slate-200" : "border-zinc-800"
          }`}>
            ${tick.price.toFixed(2)}
          </div>
          {orderBook.bids.slice(0, 5).map((b, i) => (
            <div key={i} className="relative flex justify-between px-1">
              <div
                className="absolute inset-0 bg-emerald-500/10"
                style={{ width: `${(b.size / maxBid) * 100}%` }}
              />
              <span className="text-emerald-500 font-semibold relative z-10">${b.price.toFixed(2)}</span>
              <span className={`relative z-10 ${isLight ? "text-slate-600" : "text-zinc-400"}`}>{b.size.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

