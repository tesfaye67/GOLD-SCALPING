import { useState, useRef, useEffect } from "react"
import {
  Brain,
  Send,
  Settings,
  X,
  Zap,
  Key,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  CheckCircle,
  Wallet,
  Trash2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type {
  CopilotMessage,
  AISignal,
  MarketTick,
  Timeframe,
  UserProfile,
  WalletSummary,
  DepositRecord,
} from "../types"
import {
  copilotChat,
  generateSignal,
  QUICK_PROMPTS,
  DEFAULT_GOOGLE_API_KEY,
} from "../services/aiCopilotService"
import { getCandles } from "../data/marketService"
import { getMarketHoursInfo, isWeekendSimulationActive } from "../utils/marketHours"

interface Props {
  tick: MarketTick
  timeframe: Timeframe
  open: boolean
  onToggle: () => void
  onExecuteSignal: (signal: AISignal) => void
  theme?: "dark" | "light"
  currentUser: UserProfile | null
  walletSummary: WalletSummary
  deposits: DepositRecord[]
  onOpenDeposit?: () => void
  onOpenAuth?: () => void
}

const LS_KEY = "tdr_ai_api_key"

const DEFAULT_WELCOME_MESSAGE: CopilotMessage = {
  id: "0",
  role: "assistant",
  content:
    "Welcome to **TDR FX Institutional AI Copilot** (Powered by Google Gemini 2.5).\n\nI audit every market movement of XAU/USD using the strict Price Action Master Blueprint:\n\n`4H Direction → 1H Location (POI) → 15M Confirmation → Risk Engine Permission → Execution`\n\nAsk any question or click **Generate Signal** to request a multi-timeframe movement inspection and high-probability setup.",
  timestamp: Date.now(),
}

export function AICopilotDrawer({
  tick,
  timeframe,
  open,
  onToggle,
  onExecuteSignal,
  theme = "dark",
  currentUser,
  walletSummary,
  deposits,
  onOpenDeposit,
  onOpenAuth,
}: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([DEFAULT_WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(LS_KEY) || DEFAULT_GOOGLE_API_KEY
  })
  const [showKey, setShowKey] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentSignal, setCurrentSignal] = useState<AISignal | null>(null)
  const [autoTrading, setAutoTrading] = useState(false)
  const [minConfidence, setMinConfidence] = useState(75)
  const [marketHours, setMarketHours] = useState(() => getMarketHoursInfo(isWeekendSimulationActive()))
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setMarketHours(getMarketHoursInfo(isWeekendSimulationActive()))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const isLight = theme === "light"
  const isAdmin = currentUser?.role === "ADMIN"

  // User is eligible if they are Admin OR have an approved deposit / verified balance
  const isApprovedDepositor = !!(
    currentUser &&
    (isAdmin ||
      walletSummary.verifiedBalance > 0 ||
      deposits.some((d) => d.userId === currentUser.id && d.status === "APPROVED"))
  )

  const chatStorageKey = currentUser ? `tdr_copilot_chat_${currentUser.id}` : null

  // ─── Load User Chat History ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !isApprovedDepositor) {
      setMessages([DEFAULT_WELCOME_MESSAGE])
      return
    }

    try {
      const saved = localStorage.getItem(`tdr_copilot_chat_${currentUser.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch {}

    setMessages([DEFAULT_WELCOME_MESSAGE])
  }, [currentUser?.id, isApprovedDepositor])

  // ─── Save User Chat History ───────────────────────────────────────────────
  useEffect(() => {
    if (chatStorageKey && isApprovedDepositor && messages.length > 0) {
      try {
        localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-50)))
      } catch {}
    }
  }, [messages, chatStorageKey, isApprovedDepositor])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  // ─── AI Automated Trading Engine Loop ─────────────────────────────────────
  useEffect(() => {
    if (!autoTrading || !isApprovedDepositor) return

    const interval = setInterval(async () => {
      const hours = getMarketHoursInfo(isWeekendSimulationActive())
      if (!hours.isOpen) return

      const candles = getCandles(timeframe)
      try {
        const signal = await generateSignal(candles, tick.price, apiKey || DEFAULT_GOOGLE_API_KEY)
        if (
          signal &&
          signal.direction !== "neutral" &&
          signal.confidence >= minConfidence
        ) {
          setCurrentSignal(signal)
          onExecuteSignal(signal)
          const autoMsg: CopilotMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `🤖 **TDR FX AUTO-PILOT EXECUTION TRIGGERED**
Direction: ${signal.direction.toUpperCase()} @ $${signal.entry.toFixed(2)}
Confidence: ${signal.confidence}% (Threshold: ${minConfidence}%)
SL: $${signal.sl.toFixed(2)} | TP1: $${signal.tp1.toFixed(2)} | R:R: ${signal.rrRatio.toFixed(2)}:1
4H Bias: ${signal.bias4h || "Confirmed"} | 1H POI: ${signal.poi1h || "Valid"}
Reason: ${signal.reasoning}`,
            timestamp: Date.now(),
            signal,
          }
          setMessages((prev) => [...prev, autoMsg])
          toast.success(
            `TDR FX Auto-Pilot: Executed ${signal.direction.toUpperCase()} trade at $${signal.entry.toFixed(2)}`
          )
        }
      } catch {}
    }, 18000)

    return () => clearInterval(interval)
  }, [autoTrading, minConfidence, timeframe, apiKey, onExecuteSignal, tick.price, isApprovedDepositor])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !isApprovedDepositor) return
    const userMsg: CopilotMessage = { id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const candles = getCandles(timeframe)
    const key = apiKey || DEFAULT_GOOGLE_API_KEY

    try {
      const response = await copilotChat(text, candles, tick.price, key)
      const aiMsg: CopilotMessage = { id: crypto.randomUUID(), role: "assistant", content: response, timestamp: Date.now() }
      setMessages((prev) => [...prev, aiMsg])
    } catch (e: any) {
      toast.error(e.message || "AI response failed")
    } finally {
      setLoading(false)
    }
  }

  const fetchSignal = async () => {
    if (loading || !isApprovedDepositor) return
    setLoading(true)

    const hours = getMarketHoursInfo(isWeekendSimulationActive())

    // 1. Instantly accept request and start market movement inspection
    const ackMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `🔎 **[TDR FX Request Accepted]**: Initializing Multi-Timeframe Price-Action Market Scan...

• **Instrument**: XAU/USD (Spot Gold)
• **Live Price**: $${tick.price.toFixed(2)} | **Bid/Ask**: $${tick.bid.toFixed(2)} / $${tick.ask.toFixed(2)}
• **Market Status**: ${hours.statusLabel}

**Executing Pure Price Action Multi-Movement Inspection**:
1. Analyzing 4H Swing Structure (Highs, Lows & Equilibrium discount/premium)
2. Mapping 1H Point of Interest (Key Rejection Zones & Unmitigated Levels)
3. Checking 15M Confirmation (Liquidity Sweeps & CHOCH displacement)
4. Verifying Risk Engine permission (Structural SL & 1:2 R:R minimum)`,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, ackMsg])

    const candles = getCandles(timeframe)
    const key = apiKey || DEFAULT_GOOGLE_API_KEY

    try {
      const signal = await generateSignal(candles, tick.price, key)
      setCurrentSignal(signal)

      const signalContent = `### 🦅 TDR FX SIGNAL ANALYSIS & EXECUTION SCORECARD

**Live Market Level**: \`$${signal.entry.toFixed(2)}\`
**Market Status**: \`${signal.marketStatus || hours.statusLabel}\`
**Trade Direction**: **\`${signal.direction.toUpperCase()}\`** (Confidence: **${signal.confidence}%**)

---
* **4H Direction Bias**: \`${signal.bias4h || "Confirmed Trend Bias"}\`
* **1H Location (POI)**: \`${signal.poi1h || "Valid Institutional Key Level"}\`
* **15M Confirmation**: \`${signal.confirmation15m || "Liquidity Swept + CHOCH Displacement"}\`

---
* **Live Entry Price**: **\`$${signal.entry.toFixed(2)}\`**
* **Structural Stop Loss (SL)**: **\`$${signal.sl.toFixed(2)}\`**
* **Take Profit 1 (TP1)**: **\`$${signal.tp1.toFixed(2)}\`**
* **Take Profit 2 (TP2)**: **\`$${signal.tp2?.toFixed(2) || "Opposing Liquidity"}\`**
* **Calculated R:R Ratio**: **\`${signal.rrRatio.toFixed(2)} : 1.00\`** (Passes strict 1:2 risk engine rule)

**Pure Price Action Rationale**:
${signal.reasoning}

${!hours.isOpen ? `\n> 🔒 **Real Broker Rule (Market Closed)**: Interbank Gold is offline until Sunday 22:00 UTC. Spot level is $${signal.entry.toFixed(2)}. In accordance with real broker rules, order opening is closed until Sunday 22:00 UTC. Chart remains active for analysis.` : ""}`

      const msg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: signalContent,
        timestamp: Date.now(),
        signal,
      }
      setMessages((prev) => [...prev, msg])
    } catch (e: any) {
      toast.error(e.message || "Signal generation failed")
    } finally {
      setLoading(false)
    }
  }

  const saveKey = () => {
    localStorage.setItem(LS_KEY, apiKey)
    toast.success("Google Gemini API Key saved locally.")
    setSettingsOpen(false)
  }

  const handleClearHistory = () => {
    setMessages([DEFAULT_WELCOME_MESSAGE])
    if (chatStorageKey) {
      localStorage.removeItem(chatStorageKey)
    }
    toast.info("AI Copilot chat history cleared.")
  }

  const engineLabel = apiKey && apiKey.startsWith("sk-")
    ? "GPT-4o MINI"
    : "GOOGLE GEMINI 2.5"

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-amber-500/20 border border-amber-500/40 rounded-l-lg p-2 hover:bg-amber-500/30 transition-colors shadow-lg"
      >
        <Brain className="w-4 h-4 text-amber-500" />
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 bottom-0 w-[420px] max-w-[95vw] z-50 border-l flex flex-col shadow-2xl transition-colors ${
              isLight
                ? "bg-white border-slate-200 text-slate-800"
                : "bg-[#0D1117] border-zinc-800/80 text-zinc-100"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-3.5 py-2.5 border-b transition-colors ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#161b22] border-zinc-800/60"
            }`}>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-500">TDR FX Copilot</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  {engineLabel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Clear History Button for Approved Depositors */}
                {isApprovedDepositor && messages.length > 1 && (
                  <button
                    onClick={handleClearHistory}
                    className={`p-1.5 rounded transition ${
                      isLight ? "hover:bg-slate-200 text-slate-500" : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Settings ONLY visible for Admin */}
                {isAdmin && (
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`p-1.5 rounded transition ${
                      isLight ? "hover:bg-slate-200 text-slate-600" : "hover:bg-zinc-800 text-zinc-400"
                    }`}
                    title="Admin Only: Configure Google Gemini API Key"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={onToggle}
                  className={`p-1.5 rounded transition ${
                    isLight ? "hover:bg-slate-200 text-slate-600" : "hover:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ADMIN ONLY: API Key Settings Panel */}
            {isAdmin && (
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-b overflow-hidden transition-colors ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#161b22] border-zinc-800"
                    }`}
                  >
                    <div className="p-3 space-y-2">
                      <label className={`text-[10px] flex items-center gap-1 font-bold ${
                        isLight ? "text-slate-700" : "text-zinc-400"
                      }`}>
                        <Key className="w-3 h-3 text-amber-500" /> Admin Google Gemini / OpenAI API Key
                      </label>
                      <div className="flex gap-1">
                        <input
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AIzaSy... or sk-..."
                          className={`flex-1 rounded px-2 py-1.5 text-xs font-mono outline-none border transition ${
                            isLight
                              ? "bg-white border-slate-300 text-slate-900 focus:border-amber-500"
                              : "bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:border-amber-500"
                          }`}
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className={`p-1.5 rounded transition ${
                            isLight ? "bg-slate-200 text-slate-700" : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={saveKey}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
                        >
                          Save
                        </button>
                      </div>
                      <p className={`text-[9px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                        Restricted Admin View: Google Gemini 2.5 Flash powers real-time multi-movement auditing.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* CASE 1: Guest User (Not logged in) */}
            {!currentUser ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Sign In to Access AI Copilot
                  </h3>
                  <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    Our institutional Pure Price Action AI Copilot is reserved for registered members with an approved trading deposit.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onToggle()
                    onOpenAuth?.()
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                >
                  Sign In / Register Account
                </button>
              </div>
            ) : !isApprovedDepositor ? (
              /* CASE 2: Registered user who has NOT deposited / not approved yet */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                    DEPOSIT & ADMIN APPROVAL REQUIRED
                  </span>
                  <h3 className={`text-base font-bold pt-1 ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Unlock Pro Version AI Trader
                  </h3>
                  <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    Access to limitless winning signals and real-time Pure Price Action multi-movement scanning is reserved exclusively for funded members who have deposited USDT and received administrator verification.
                  </p>
                </div>

                <div className={`w-full max-w-xs p-3 rounded-xl border text-left text-[11px] font-mono space-y-1.5 ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#161B22] border-zinc-800 text-zinc-300"
                }`}>
                  <div className="text-amber-500 font-bold mb-1">What you unlock with deposit:</div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Limitless signals from Pro AI Trader</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Pure Price Action multi-movement audit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>Persistent personal chat & signal history</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onToggle()
                    onOpenDeposit?.()
                  }}
                  className="w-full max-w-xs py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
                >
                  <Wallet className="w-4 h-4" />
                  Deposit USDT to Unlock Pro Signals
                </button>
              </div>
            ) : (
              /* CASE 3: Approved Depositor / Admin - Full Access & Chat History */
              <>
                {/* Auto-Pilot Automated Trading Controller */}
                <div className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono transition-colors ${
                  isLight ? "bg-slate-100/60 border-slate-200" : "bg-[#090C10] border-zinc-800"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${autoTrading ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
                    <span className={`font-bold text-[11px] ${isLight ? "text-slate-800" : "text-zinc-200"}`}>
                      {autoTrading ? "AI AUTO-PILOT ACTIVE" : "AI AUTO-PILOT STANDBY"}
                    </span>
                    <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      ({minConfidence}%+)
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoTrading(!autoTrading)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                      autoTrading
                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/40 hover:bg-rose-500/30"
                        : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/30"
                    }`}
                  >
                    {autoTrading ? "Pause Auto" : "Enable Auto-Trade"}
                  </button>
                </div>

                {/* Signal Card */}
                {currentSignal && (
                  <div className={`mx-3 mt-2 rounded-xl p-2.5 border transition-colors ${
                    isLight
                      ? "bg-amber-50/70 border-amber-300 text-slate-800"
                      : "bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30 text-zinc-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> TDR FX PURE PRICE ACTION SIGNAL
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          currentSignal.direction === "long"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : currentSignal.direction === "short"
                            ? "bg-rose-500/20 text-rose-500"
                            : "bg-zinc-500/20 text-zinc-500"
                        }`}
                      >
                        {currentSignal.direction.toUpperCase()} {currentSignal.confidence}%
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-1 text-[9px] font-mono">
                      <div>
                        <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Entry</span>
                        <br />
                        <span className="font-bold">${currentSignal.entry.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className={isLight ? "text-slate-500" : "text-zinc-500"}>SL</span>
                        <br />
                        <span className="text-rose-500 font-bold">${currentSignal.sl.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className={isLight ? "text-slate-500" : "text-zinc-500"}>TP1</span>
                        <br />
                        <span className="text-emerald-500 font-bold">${currentSignal.tp1.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className={isLight ? "text-slate-500" : "text-zinc-500"}>R:R</span>
                        <br />
                        <span className="text-amber-500 font-bold">{currentSignal.rrRatio.toFixed(1)}:1</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onExecuteSignal(currentSignal)}
                      disabled={!marketHours.isOpen}
                      className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold transition shadow-xs flex items-center justify-center gap-1.5 ${
                        !marketHours.isOpen
                          ? isLight
                            ? "bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                          : "bg-amber-500 hover:bg-amber-400 text-black cursor-pointer"
                      }`}
                    >
                      {!marketHours.isOpen
                        ? "MARKET CLOSED (OPENS SUN 22:00 UTC)"
                        : "Execute Signal on Terminal"}
                    </button>
                  </div>
                )}

                {/* Messages & Chat History */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 font-mono">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-amber-500 text-black font-semibold shadow-xs"
                            : isLight
                            ? "bg-slate-100 text-slate-800 border border-slate-200"
                            : "bg-zinc-800/70 text-zinc-200 border border-zinc-700/60"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className={`rounded-xl px-3 py-2 text-xs animate-pulse ${
                        isLight ? "bg-slate-100 text-slate-500" : "bg-zinc-800/60 text-zinc-400"
                      }`}>
                        Inspecting market movements & running TDR FX Pure Price Action scan...
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className={`px-3 py-1.5 flex gap-1 flex-wrap border-t ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-[#090C10] border-zinc-800/80"
                }`}>
                  {QUICK_PROMPTS.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition ${
                        isLight
                          ? "bg-white text-slate-600 border-slate-300 hover:text-amber-600 hover:border-amber-400"
                          : "bg-zinc-800/70 text-zinc-400 border-zinc-700 hover:border-amber-500/40 hover:text-amber-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={fetchSignal}
                    disabled={loading}
                    className="text-[9px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold shadow-xs transition"
                  >
                    Generate Signal
                  </button>
                </div>

                {/* Input */}
                <div className={`p-3 border-t ${isLight ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800/80"}`}>
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                      placeholder="Ask about XAU/USD price action structure..."
                      className={`flex-1 rounded-xl px-3 py-2 text-xs outline-none border transition ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
                          : "bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:border-amber-400"
                      }`}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={loading}
                      className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
