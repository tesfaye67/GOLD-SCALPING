// TDR GOLD TREADER - Institutional Navigation Header with Theme Toggle & Real User Profile
import { useState, useEffect } from "react"
import {
  ShieldCheck,
  Wallet,
  Clock,
  User,
  Broadcast,
  Sun,
  Moon,
  Database,
  SignOut,
  SignIn,
  Gear,
  Sliders,
} from "@phosphor-icons/react"
import { motion } from "framer-motion"
import type { MarketTick, PaperAccount, BrokerMode, TimezoneKey, UserProfile, WalletSummary } from "../types"
import { TIMEZONES, getTimezoneLabel } from "../utils/timezone"
import { getActiveSessions } from "../data/marketService"
import { getMarketHoursInfo, isWeekendSimulationActive } from "../utils/marketHours"

interface Props {
  tick: MarketTick
  account: PaperAccount
  prevPrice: number
  brokerMode: BrokerMode
  onToggleBrokerMode: (mode: BrokerMode) => void
  onOpenTradingAccount?: () => void
  timezone: TimezoneKey
  onTimezoneChange: (tz: TimezoneKey) => void
  currentUser: UserProfile | null
  walletSummary: WalletSummary
  theme: "dark" | "light"
  onToggleTheme: () => void
  onOpenWallet: () => void
  onOpenAdmin: () => void
  onOpenAuth: () => void
  onSignOut?: () => void
  isDataStale: boolean
}

export function MarketHeader({
  tick,
  account,
  prevPrice,
  brokerMode,
  onToggleBrokerMode,
  onOpenTradingAccount,
  timezone,
  onTimezoneChange,
  currentUser,
  walletSummary,
  theme,
  onToggleTheme,
  onOpenWallet,
  onOpenAdmin,
  onOpenAuth,
  onSignOut,
  isDataStale,
}: Props) {
  const [sessions, setSessions] = useState(getActiveSessions())
  const [showTzDropdown, setShowTzDropdown] = useState(false)
  const [marketHours, setMarketHours] = useState(() => getMarketHoursInfo(isWeekendSimulationActive()))

  const change = tick.price - prevPrice
  const changePct = ((change / (prevPrice || 2650)) * 100).toFixed(3)
  const bullish = change >= 0
  const isLight = theme === "light"

  useEffect(() => {
    const id = setInterval(() => setSessions(getActiveSessions()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setMarketHours(getMarketHoursInfo(isWeekendSimulationActive()))
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      className={`border-b px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-4 flex-wrap select-none transition-colors ${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-2xs"
          : "bg-[#0B0E14] border-zinc-800 text-zinc-200"
      }`}
    >
      {/* 1. Left: Brand & Instrument */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/10 text-black font-extrabold text-[11px] sm:text-xs">
            TDR
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`font-extrabold text-xs sm:text-sm tracking-wider ${isLight ? "text-slate-900" : "text-amber-400"}`}>
                TDR GOLD
              </span>
              <span className="px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                XAU/USD
              </span>
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono hidden xs:block ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              {currentUser?.assignedExnessAccount
                ? `Exness Real: #${currentUser.assignedExnessAccount}`
                : "Institutional Engine"}
            </div>
          </div>
        </div>

        {/* Live Gold Spot Price */}
        <motion.div
          key={tick.price.toFixed(2)}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded border transition-colors ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#12161F] border-zinc-800"
          }`}
        >
          <span className={`text-[10px] sm:text-[11px] font-mono font-medium ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
            SPOT
          </span>
          <span className={`font-mono text-xs sm:text-base font-bold tabular-nums ${bullish ? "text-emerald-500" : "text-rose-500"}`}>
            ${tick.price.toFixed(2)}
          </span>
          <span className={`text-[9px] sm:text-[10px] font-mono font-bold ${bullish ? "text-emerald-500" : "text-rose-500"}`}>
            {bullish ? `+${changePct}%` : `${changePct}%`}
          </span>
        </motion.div>

        {/* Bid/Ask Spread */}
        <div className={`hidden md:flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#12161F] border-zinc-800/80"
        }`}>
          <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
            B: <strong className="text-emerald-500">{tick.bid.toFixed(2)}</strong>
          </span>
          <span className={isLight ? "text-slate-300" : "text-zinc-600"}>|</span>
          <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
            A: <strong className="text-rose-500">{tick.ask.toFixed(2)}</strong>
          </span>
          <span className={isLight ? "text-slate-300" : "text-zinc-600"}>|</span>
          <span className={isLight ? "text-slate-600" : "text-zinc-400"}>
            Spr: <strong className="text-amber-500">${tick.spread.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {/* 2. Middle: Mode Toggle (DEMO vs LIVE) & Data Integrity */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* DEMO vs LIVE Switcher */}
        <div className={`flex items-center rounded-lg p-0.5 border text-[10px] sm:text-[11px] font-mono transition-colors ${
          isLight ? "bg-slate-100 border-slate-300" : "bg-[#161B22] border-zinc-800"
        }`}>
          <button
            onClick={() => onToggleBrokerMode("DEMO")}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition flex items-center gap-1 sm:gap-1.5 ${
              brokerMode === "DEMO"
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${brokerMode === "DEMO" ? "bg-amber-500" : "bg-zinc-400"}`} />
            <span>DEMO<span className="hidden sm:inline"> ACCOUNT</span></span>
          </button>

          <button
            onClick={() => onToggleBrokerMode("LIVE")}
            className={`px-2 sm:px-3 py-1 rounded-md font-bold transition flex items-center gap-1 sm:gap-1.5 ${
              brokerMode === "LIVE"
                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 shadow-xs animate-pulse"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${brokerMode === "LIVE" ? "bg-emerald-500" : "bg-zinc-400"}`} />
            <span className="hidden sm:inline">
              {currentUser?.assignedExnessAccount ? `EXNESS (#${currentUser.assignedExnessAccount})` : "EXNESS (LIVE)"}
            </span>
            <span className="sm:hidden">EXNESS</span>
          </button>

          {/* Settings button to manage trading account */}
          {onOpenTradingAccount && (
            <button
              onClick={onOpenTradingAccount}
              className={`p-1 ml-0.5 sm:ml-1 rounded hover:bg-black/10 transition ${
                isLight ? "text-slate-500 hover:text-slate-800" : "text-zinc-400 hover:text-amber-400"
              }`}
              title="Configure Trading Accounts (Demo & Live)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Feed Health Indicator */}
        <div className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#12161F] border-zinc-800"
        }`}>
          <Broadcast className={`w-3.5 h-3.5 ${isDataStale ? "text-rose-500" : "text-emerald-500 animate-pulse"}`} />
          <span className={isDataStale ? "text-rose-500 font-bold" : "text-emerald-500"}>
            {isDataStale ? "FEED STALE" : "FEED LIVE"}
          </span>
        </div>

        {/* Real Gold Market Hours Status Badge */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-colors ${
            marketHours.isOpen
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600"
          }`}
          title={marketHours.reason}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              marketHours.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="font-bold">{marketHours.statusLabel}</span>
          <span className={isLight ? "text-slate-500 text-[9px]" : "text-zinc-500 text-[9px]"}>
            ({marketHours.countdownText})
          </span>
        </div>

        {/* Timezone Selector */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowTzDropdown(!showTzDropdown)}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] sm:text-[11px] font-mono transition ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700 hover:text-amber-600"
                : "bg-[#161B22] border-zinc-800 text-zinc-300 hover:text-amber-400"
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isLight ? "text-slate-400" : "text-zinc-500"}`} />
            <span>{getTimezoneLabel(timezone).split(" ")[0]}</span>
          </button>
          {showTzDropdown && (
            <div className={`absolute right-0 top-full mt-1 border rounded-xl p-1 z-50 shadow-2xl min-w-[170px] font-mono text-[11px] ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#161B22] border-zinc-700 text-zinc-200"
            }`}>
              {TIMEZONES.map((tz) => (
                <button
                  key={tz.key}
                  onClick={() => {
                    onTimezoneChange(tz.key)
                    setShowTzDropdown(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                    timezone === tz.key
                      ? "text-amber-500 bg-amber-500/10 font-bold"
                      : isLight
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {tz.label} ({tz.offset})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle Button (Dark / Light) */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded border transition ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              : "bg-[#161B22] border-zinc-800 text-zinc-400 hover:text-amber-400"
          }`}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />}
        </button>
      </div>

      {/* 3. Right: Wallet, Account & User Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Wallet Pill */}
        <button
          onClick={onOpenWallet}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-xs font-mono transition group ${
            isLight
              ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
              : "bg-[#161B22] hover:bg-[#1a202c] border-zinc-800 hover:border-amber-500/40 text-zinc-200"
          }`}
          title="Open USDT Deposit & Ledger"
        >
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          <div className="text-left">
            <span className={`text-[9px] sm:text-[10px] block leading-none ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              Wallet
            </span>
            <span className="font-bold text-amber-500 text-[11px] sm:text-xs">
              ${walletSummary.verifiedBalance.toFixed(2)}
            </span>
          </div>
        </button>

        {/* Trading Equity */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
          isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#161B22] border-zinc-800 text-zinc-200"
        }`}>
          <div className="text-left">
            <span className={`text-[10px] block leading-none ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              {brokerMode === "LIVE" ? "Exness Equity" : "Demo Equity"}
            </span>
            <span className="font-bold text-emerald-500">${account.equity.toFixed(2)} USD</span>
          </div>
        </div>

        {/* Admin Portal Button (Admin only) */}
        {currentUser?.role === "ADMIN" && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-500 text-[11px] sm:text-xs font-mono font-bold transition shadow-sm"
            title="Open Administrator Portal"
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">ADMIN</span>
          </button>
        )}

        {/* User Profile & Sign Out Buttons */}
        {currentUser ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border text-xs font-mono transition ${
                isLight
                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                  : "bg-[#161B22] hover:bg-[#1c222c] border-zinc-800 text-zinc-200"
              }`}
              title="Account Profile & Security"
            >
              <div className={`w-2 h-2 rounded-full ${currentUser.role === "ADMIN" ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span className="max-w-[70px] sm:max-w-[110px] truncate font-bold">{currentUser.fullName.split(" ")[0]}</span>
              <span className={`text-[10px] uppercase hidden xs:inline ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                ({currentUser.role})
              </span>
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
                  isLight
                    ? "bg-slate-100 hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-600"
                    : "bg-zinc-800/80 hover:bg-rose-950/40 border-zinc-700 hover:border-rose-500/50 text-zinc-400 hover:text-rose-300"
                }`}
                title="Sign out of trading account"
              >
                <SignOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold transition"
          >
            <SignIn className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In / Register</span>
            <span className="sm:hidden">Sign In</span>
          </button>
        )}
      </div>
    </header>
  )
}
