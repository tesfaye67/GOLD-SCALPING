// TDR GOLD TREADER - Public Landing & Educational Portal UI (High-Contrast Dark & Light Theme)
import { useState } from "react"
import {
  ShieldCheck,
  ChartLineUp,
  Wallet,
  Robot,
  Question,
  SignIn,
  UserPlus,
  Sun,
  Moon,
  CheckCircle,
  LockKey,
  Lightning,
  CurrencyDollar,
  TelegramLogo,
  Globe,
  Info,
  Sparkle,
} from "@phosphor-icons/react"
import type { MarketTick } from "../types"
import { getMarketHoursInfo, isWeekendSimulationActive } from "../utils/marketHours"

interface Props {
  theme: "dark" | "light"
  onToggleTheme: () => void
  onOpenLogin: () => void
  onOpenRegister: () => void
  tick: MarketTick
}

export function PublicLanding({
  theme,
  onToggleTheme,
  onOpenLogin,
  onOpenRegister,
  tick,
}: Props) {
  const [activeTab, setActiveTab] = useState<"home" | "about" | "help" | "contact">("home")
  const [marketHours] = useState(() => getMarketHoursInfo(isWeekendSimulationActive()))

  const isLight = theme === "light"

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isLight ? "bg-[#F8FAFC] text-slate-900" : "bg-[#0B0E14] text-zinc-100"
      }`}
    >
      {/* ─── Top Navigation Header ────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isLight
            ? "bg-white/95 border-slate-200 text-slate-900 shadow-xs"
            : "bg-[#0D1117]/95 border-zinc-800/80 text-zinc-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-amber-500/20">
              TDR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-extrabold tracking-tight text-base uppercase ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  TDR Gold Treader
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  XAU/USD ONLY
                </span>
              </div>
              <p className={`text-[11px] font-mono hidden sm:block ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                Institutional AI Scalping & Real Exness Gateway
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setActiveTab("home")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "home"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              }`}
            >
              <Globe className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "about"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              }`}
            >
              <Info className="w-4 h-4" />
              About Platform
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "help"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              }`}
            >
              <Question className="w-4 h-4" />
              Help & Guide
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "contact"
                  ? "bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
              }`}
            >
              <TelegramLogo className="w-4 h-4 text-sky-500" />
              Telegram Support
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Live Gold Ticker Pill */}
            <div
              className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800"
                  : "bg-[#161B22] border-zinc-800 text-zinc-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${marketHours.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>GOLD</span>
              <span className="text-amber-500 font-bold">${tick.price.toFixed(2)}</span>
              {!marketHours.isOpen && (
                <span className="text-[10px] text-amber-600 font-bold px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40">
                  WEEKEND CLOSE
                </span>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg transition ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                  : "bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
              title="Toggle theme (Dark / Light)"
            >
              {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Sign In Button */}
            <button
              onClick={onOpenLogin}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs"
                  : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200"
              }`}
            >
              <SignIn className="w-3.5 h-3.5" />
              Sign In
            </button>

            {/* Register Button */}
            <button
              onClick={onOpenRegister}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-mono font-bold shadow-lg shadow-amber-500/15 transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className={`flex md:hidden border-t px-4 py-2 gap-1 overflow-x-auto text-xs font-mono ${
          isLight ? "border-slate-200 bg-slate-50" : "border-zinc-800/60 bg-[#0B0E14]"
        }`}>
          {(["home", "about", "help", "contact"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-3 py-1 rounded-md flex-shrink-0 capitalize ${
                activeTab === tabKey
                  ? "bg-amber-500 text-black font-bold"
                  : isLight
                  ? "text-slate-600"
                  : "text-zinc-400"
              }`}
            >
              {tabKey === "contact" ? "Telegram Desk" : tabKey}
            </button>
          ))}
        </div>
      </header>

      {/* ─── Main Content Tabs ────────────────────────────────────────────── */}
      <main className="flex-1">
        {/* ==================================================================== */}
        {/* TAB 1: HOME (What the site does generally)                           */}
        {/* ==================================================================== */}
        {activeTab === "home" && (
          <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-4xl mx-auto pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold tracking-wide uppercase">
                <Sparkle className="w-3.5 h-3.5" />
                Institutional AI Gold Scalping Engine • Zero Simulated Trades
              </div>

              <h1 className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
                isLight ? "text-slate-950" : "text-zinc-50"
              }`}>
                Algorithmic Precision for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600">
                  Gold (XAU/USD)
                </span>
              </h1>

              <p className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
                isLight ? "text-slate-600" : "text-zinc-400"
              }`}>
                TDR GOLD TREADER delivers institutional-grade Pure Price Action automation, multi-timeframe structural breakout detection, deterministic risk governance, and direct Exness MT5 broker gateway execution.
              </p>

              {/* Pro Version AI Trader Callout */}
              <div className={`max-w-xl mx-auto p-3 rounded-xl border text-xs font-mono flex items-center justify-center gap-2 shadow-sm ${
                isLight ? "bg-amber-500/10 border-amber-500/30 text-amber-900" : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}>
                <Sparkle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                <span>
                  <strong>Pro AI Access:</strong> Users who successfully deposit can get access to <strong>limitless signals</strong> from our Pro Version AI Trader!
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold font-mono text-sm shadow-xl shadow-amber-500/20 transition flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Trader Account
                </button>
                <button
                  onClick={onOpenLogin}
                  className={`px-6 py-3 rounded-xl border font-bold font-mono text-sm transition flex items-center gap-2 ${
                    isLight
                      ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs"
                      : "bg-[#161B22] hover:bg-[#1f2530] border-zinc-700 text-zinc-200"
                  }`}
                >
                  <SignIn className="w-4 h-4" />
                  Sign In to Terminal
                </button>
                <a
                  href="https://t.me/adsensehealp"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-500 font-bold font-mono text-sm transition flex items-center gap-2"
                >
                  <TelegramLogo className="w-4 h-4 text-sky-500" />
                  Contact on Telegram
                </a>
              </div>

              {/* Live Gold Ticker Strip */}
              <div
                className={`p-4 rounded-2xl border max-w-2xl mx-auto font-mono flex items-center justify-between text-xs flex-wrap gap-3 ${
                  isLight
                    ? "bg-white border-slate-200 shadow-sm text-slate-800"
                    : "bg-[#12161F] border-zinc-800 text-zinc-200"
                }`}
              >
                <div>
                  <span className={`block text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                    XAU/USD Spot Price {!marketHours.isOpen && "(WEEKEND CLOSE)"}
                  </span>
                  <span className="text-lg font-bold text-amber-500">
                    ${tick.price.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className={`block text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                    Bid / Ask
                  </span>
                  <span>
                    <strong className="text-emerald-500">{tick.bid.toFixed(2)}</strong> /{" "}
                    <strong className="text-rose-500">{tick.ask.toFixed(2)}</strong>
                  </span>
                </div>
                <div>
                  <span className={`block text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                    Spread
                  </span>
                  <span className="text-amber-500 font-bold">${tick.spread.toFixed(2)}</span>
                </div>
                <div>
                  <span className={`block text-[10px] uppercase font-bold ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                    Market State
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      marketHours.isOpen
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    }`}
                  >
                    {marketHours.isOpen ? "FEED LIVE (OPEN)" : "WEEKEND CLOSED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ChartLineUp className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Real TradingView Chart Technology
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Real tick-by-tick candlestick charting with volume analysis, multiple timeframes (1m to 1D), and embedded Pure Price Action structure overlays. Zero market simulation.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-500">
                  <Robot className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Original AI Automated Trading
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Scans live market conditions for Fair Value Gaps, Liquidity Sweeps, and Order Blocks. Automatically drafts high-confluence setups with automated execution capability.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Deterministic Risk Governor
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Mathematical circuit breakers: maximum 1.00% risk per trade, 2.00% daily loss halt, mandatory stop-losses, and an administrative emergency kill switch.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Exness MT5 Real Gateway
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Direct pairing with authorized institutional Exness MT5 gateways (Exness-Real10). Transparent routing to interbank liquidity pools.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Double-Entry Crypto Ledger
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Real multi-network USDT deposit gateways (TRC20, ERC20, BEP20) managed actively by administrators. Every credit and debit is recorded on an immutable ledger.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 transition ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                  <LockKey className="w-5 h-5" />
                </div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                  Independent User Workspaces
                </h3>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Every trader receives their own isolated dashboard, personal trade journal, and private wallet that starts strictly at $0.00 for authentic accounting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: ABOUT (What does this mean & Core Philosophy)                 */}
        {/* ==================================================================== */}
        {activeTab === "about" && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
            <div className="space-y-3 text-center">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">
                Architecture & Market Philosophy
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black ${isLight ? "text-slate-950" : "text-zinc-100"}`}>
                What Does TDR GOLD TREADER Mean?
              </h2>
              <p className={`text-sm max-w-2xl mx-auto ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                A purpose-built algorithmic framework designed to eliminate emotional retail gambling and operate with pure institutional discipline.
              </p>
            </div>

            <div className="space-y-6 text-sm">
              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-300"
              }`}>
                <h3 className="text-base font-bold text-amber-500 flex items-center gap-2">
                  <CurrencyDollar className="w-5 h-5" />
                  1. Why Exclusively Gold (XAU/USD)?
                </h3>
                <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Gold is the premier institutional commodity globally. It experiences continuous multi-billion dollar daily liquidity, trades 24 hours a day 5 days a week, and exhibits clean, fractal market structure. By concentrating our algorithms solely on XAU/USD, we avoid fragmented attention and achieve extreme precision in order block and liquidity sweeps.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-300"
              }`}>
                <h3 className="text-base font-bold text-amber-500 flex items-center gap-2">
                  <Lightning className="w-5 h-5" />
                  2. Pure Price Action Strategy & Institutional Execution
                </h3>
                <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Retail traders rely on lagging indicators. TDR GOLD TREADER executes strictly on Pure Price Action: market structure shifts, key supply and demand levels, clean liquidity sweeps, and price rejection displacement:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className={`p-3 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0D1117] border-zinc-800 text-zinc-300"
                  }`}>
                    <strong className="text-amber-500 block mb-1">Fair Value Gaps (Imbalance)</strong>
                    <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
                      Identifies 3-candle price imbalances where aggressive orders left unfilled volume, acting as magnets for price re-balancing.
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0D1117] border-zinc-800 text-zinc-300"
                  }`}>
                    <strong className="text-amber-500 block mb-1">Key Order Flow Blocks</strong>
                    <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
                      Pinpoints key institutional accumulation/distribution zones prior to major structure breaks for high R:R entries.
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0D1117] border-zinc-800 text-zinc-300"
                  }`}>
                    <strong className="text-amber-500 block mb-1">Liquidity Pools (BSL/SSL)</strong>
                    <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
                      Maps key liquidity clusters above swing highs and below swing lows where market displacement triggers high-probability reversals.
                    </span>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#0D1117] border-zinc-800 text-zinc-300"
                  }`}>
                    <strong className="text-amber-500 block mb-1">Market Structure Breaks (BOS)</strong>
                    <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
                      Confirms directional commitment on higher timeframes before permitting algorithmic trade execution.
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 mt-2 ${
                  isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}>
                  <Sparkle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>
                    <strong>Pro AI Trader Access:</strong> Users who successfully deposit funds unlock limitless signals from our Pro Version AI Trader!
                  </span>
                </div>
              </div>

              <div className={`p-6 rounded-2xl border space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-300"
              }`}>
                <h3 className="text-base font-bold text-amber-500 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  3. Zero-Fabrication Rule & Real-Money Integrity
                </h3>
                <p className={`leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Unlike simulated demo toys or marketing scams, TDR GOLD TREADER operates on a strict real-money financial standard:
                </p>
                <ul className={`space-y-2 text-xs pt-1 font-mono list-disc list-inside ${
                  isLight ? "text-slate-600" : "text-zinc-400"
                }`}>
                  <li><strong>$0.00 Initial Ledger:</strong> Every newly registered user starts at exactly $0.00. No fake initial balances.</li>
                  <li><strong>Verified On-Chain Deposits:</strong> Balances are credited exclusively after the administrator confirms the blockchain transaction hash (TXID).</li>
                  <li><strong>Real Exness Bridge:</strong> In Live Mode, positions correspond to real institutional trades routed via your admin-assigned Exness account.</li>
                  <li><strong>Deterministic Risk Governance:</strong> The system enforces hard stop losses and daily loss thresholds that cannot be bypassed.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: HELP & GUIDE (How can they use the platform)                  */}
        {/* ==================================================================== */}
        {activeTab === "help" && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10">
            <div className="space-y-3 text-center">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">
                Comprehensive User Manual
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black ${isLight ? "text-slate-950" : "text-zinc-100"}`}>
                How to Use TDR GOLD TREADER
              </h2>
              <p className={`text-sm max-w-2xl mx-auto ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                Step-by-step walkthrough from initial registration to automated AI execution and profit withdrawal.
              </p>
            </div>

            {/* 5 Step Sequential Guide */}
            <div className="space-y-6">
              {/* Step 1 */}
              <div className={`p-6 rounded-2xl border flex gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  01
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Register Your Trader Account
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    Click the <strong>Register</strong> button in the top right. Enter your full name, email, and password. Your personal trading workspace is immediately initialized with an active session, personal trade journal, and an initial verified balance of <strong>$0.00 USDT</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-6 rounded-2xl border flex gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  02
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Deposit USDT via Active Crypto Gateways
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    Click the <strong>USDT Wallet</strong> pill in your header. Select from the actively enabled cryptocurrency networks (such as <strong>TRC20, ERC20, or BEP20</strong>). Copy the official receiving address configured by the administrator, send USDT from your external wallet, and submit your Transaction Hash (TXID). The administrator verifies on-chain and credits your ledger balance.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`p-6 rounded-2xl border flex gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  03
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Connect to Demo or Exness Broker Engine
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    Switch between <strong>DEMO ACCOUNT</strong> and <strong>EXNESS (LIVE)</strong> inside the terminal. Practice with up to $100k free demo capital instantly, or request live verification to trade directly through our institutional gateway with your assigned Exness MT5 account.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`p-6 rounded-2xl border flex gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  04
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Execute Trades or Activate AI Auto-Trading
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    You have two execution modes:
                  </p>
                  <ul className={`text-xs space-y-1 list-disc list-inside font-mono ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    <li><strong>Manual Order Entry:</strong> Select lot size, position side (BUY/SELL), and stop-loss / take-profit with real-time margin calculation.</li>
                    <li><strong>AI Automated Trading:</strong> Open the AI Price-Action Copilot drawer to scan for multi-timeframe Pure Price Action confluences and trigger automated execution when high-probability setups are detected. Users who successfully deposit gain limitless signals from our Pro Version AI Trader.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`p-6 rounded-2xl border flex gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm text-slate-800" : "bg-[#12161F] border-zinc-800 text-zinc-200"
              }`}>
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 font-mono font-black text-sm flex items-center justify-center flex-shrink-0">
                  05
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    Withdraw Funds & Audit Double-Entry Ledger
                  </h3>
                  <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                    When you want to withdraw profits, open your Wallet, select <strong>Withdraw USDT</strong>, choose your payout network, enter your external crypto address, and submit. View complete transaction histories and auditable receipts in the <strong>Double-Entry Ledger</strong> tab.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action */}
            <div className="text-center pt-4">
              <button
                onClick={onOpenRegister}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold font-mono text-sm shadow-xl shadow-amber-500/20 transition inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Register Now & Get Started
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: CONTACT US (Telegram Support Desk)                            */}
        {/* ==================================================================== */}
        {activeTab === "contact" && (
          <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
            <div className="space-y-3 text-center">
              <span className="text-xs font-mono font-bold text-sky-500 uppercase tracking-widest">
                Direct Communication Channel
              </span>
              <h2 className={`text-3xl sm:text-4xl font-black ${isLight ? "text-slate-950" : "text-zinc-100"}`}>
                Official Telegram Support & Desk
              </h2>
              <p className={`text-sm max-w-xl mx-auto ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                Need help with deposit confirmations, Exness broker pairing, account verification, or AI trading setup? Reach out directly on Telegram.
              </p>
            </div>

            {/* Telegram Feature Box */}
            <div className={`p-8 rounded-3xl border shadow-2xl text-center space-y-6 transition ${
              isLight
                ? "bg-gradient-to-br from-sky-50 via-white to-blue-50 border-sky-300 text-slate-800"
                : "bg-gradient-to-br from-[#121B2A] to-[#12161F] border-sky-500/30 text-zinc-200"
            }`}>
              <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-500 flex items-center justify-center mx-auto shadow-lg shadow-sky-500/20">
                <TelegramLogo className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Support Desk Online (24/7)
                </div>
                <h3 className={`text-2xl font-black ${isLight ? "text-slate-950" : "text-zinc-100"}`}>
                  Telegram: @adsensehealp
                </h3>
                <p className={`text-xs max-w-md mx-auto font-mono ${isLight ? "text-slate-600" : "text-zinc-400"}`}>
                  Official direct Telegram channel: <strong className="text-sky-500">https://t.me/adsensehealp</strong>
                </p>
              </div>

              {/* Direct Open Button */}
              <div className="pt-2">
                <a
                  href="https://t.me/adsensehealp"
                  target="_blank"
                  rel="noreferrer"
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold font-mono text-sm shadow-xl shadow-sky-500/25 transition inline-flex items-center gap-2"
                >
                  <TelegramLogo className="w-5 h-5" />
                  Open Telegram Support: @adsensehealp
                </a>
              </div>

              {/* Services Offered on Telegram */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t text-left font-mono text-xs ${
                isLight ? "border-slate-200" : "border-zinc-800"
              }`}>
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800/80"
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className={`block ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
                      Instant Deposit Confirmation
                    </strong>
                    <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      Fast on-chain TXID verification and wallet crediting.
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800/80"
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className={`block ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
                      Exness Account Pairing
                    </strong>
                    <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      Assign authorized institutional MT5 trading account.
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800/80"
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className={`block ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
                      AI Auto-Trader Configuration
                    </strong>
                    <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      Custom confluence parameters and scalping risk guidance.
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isLight ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800/80"
                }`}>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className={`block ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
                      Security & Payout Auditing
                    </strong>
                    <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                      Direct assistance with USDT withdrawals & ledger queries.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer
        className={`border-t py-8 px-4 sm:px-6 lg:px-8 font-mono text-xs transition-colors ${
          isLight
            ? "bg-slate-100 border-slate-200 text-slate-600"
            : "bg-[#090C10] border-zinc-800/80 text-zinc-500"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-500">TDR GOLD TREADER</span>
            <span>•</span>
            <span>Institutional XAU/USD Architecture</span>
            <span>•</span>
            <span>Exness MT5 Real Gateway</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTab("home")} className="hover:text-amber-500 transition">
              Home
            </button>
            <button onClick={() => setActiveTab("about")} className="hover:text-amber-500 transition">
              About
            </button>
            <button onClick={() => setActiveTab("help")} className="hover:text-amber-500 transition">
              Help
            </button>
            <a
              href="https://t.me/adsensehealp"
              target="_blank"
              rel="noreferrer"
              className="text-sky-500 hover:text-sky-400 transition"
            >
              Telegram: @adsensehealp
            </a>
            <button onClick={onOpenLogin} className="hover:text-amber-500 font-bold transition">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
