// TDR GOLD TREADER - Dedicated In-Terminal Trading Account Manager (Demo vs Real Live Exness)
import { useState } from "react"
import {
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  X,
  Database,
  Wallet,
  Sparkle,
  TrendUp,
  ArrowsClockwise,
  Lock,
} from "@phosphor-icons/react"
import type { UserProfile, PaperAccount, BrokerMode } from "../types"
import { DEFAULT_EXNESS_SERVER } from "../data/userStorage"

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
  brokerMode: BrokerMode
  onSelectBrokerMode: (mode: BrokerMode) => void
  account: PaperAccount
  onUpdateDemoBalance: (newBalance: number, leverage: number) => void
  onOpenWallet: () => void
  theme?: "dark" | "light"
}

export function TradingAccountModal({
  isOpen,
  onClose,
  currentUser,
  brokerMode,
  onSelectBrokerMode,
  account,
  onUpdateDemoBalance,
  onOpenWallet,
  theme = "dark",
}: Props) {
  const [activeTab, setActiveTab] = useState<"demo" | "live">(brokerMode === "LIVE" ? "live" : "demo")
  const [selectedDemoCapital, setSelectedDemoCapital] = useState<number>(account.balance || 10000)
  const [selectedLeverage, setSelectedLeverage] = useState<number>(500)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  if (!isOpen) return null

  const isLight = theme === "light"

  const handleApplyDemoAccount = () => {
    onUpdateDemoBalance(selectedDemoCapital, selectedLeverage)
    onSelectBrokerMode("DEMO")
    setSuccessNotice(`Demo Trading Account updated with $${selectedDemoCapital.toLocaleString()} USD virtual capital!`)
    setTimeout(() => {
      setSuccessNotice(null)
      onClose()
    }, 1800)
  }

  const handleSwitchToLive = () => {
    onSelectBrokerMode("LIVE")
    setSuccessNotice("Switched to Real Live Trading Account (Exness MT5 Gateway).")
    setTimeout(() => {
      setSuccessNotice(null)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl p-6 transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#0D1117] border-amber-500/30 text-zinc-200"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
            isLight
              ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className={`flex items-center gap-3 mb-5 border-b pb-4 ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-amber-500/20">
            TDR
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-wide ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
              Trading Account Configuration
            </h2>
            <p className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
              XAU/USD Execution Accounts • Demo & Real Exness Gateway
            </p>
          </div>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Account Tabs */}
        <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border mb-5 font-mono text-xs ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-[#161B22] border-zinc-800"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "demo"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>FREE DEMO ACCOUNT</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/15">Instant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("live")}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "live"
                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>REAL LIVE (EXNESS)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/15">KYC</span>
          </button>
        </div>

        {/* TAB 1: DEMO TRADING ACCOUNT */}
        {activeTab === "demo" && (
          <div className="space-y-4 font-mono text-xs">
            {/* Demo Header Info */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight
                ? "bg-amber-50/60 border-amber-200 text-slate-800"
                : "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/30"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-500">
                  <Sparkle className="w-4 h-4" />
                  <span>Free Demo Practice Environment</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  NO KYC NEEDED
                </span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
                Test your manual price-action executions and multi-order AI scalping grids risk-free with live spot feeds.
              </p>

              {/* Demo Account Specs Card */}
              <div className={`p-3 rounded-lg border space-y-1.5 text-[11px] ${
                isLight ? "bg-white border-slate-200" : "bg-[#12161F] border-zinc-800"
              }`}>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Demo Server:</span>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-zinc-200"}`}>Exness-Trial10</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Demo Account ID:</span>
                  <span className="text-amber-500 font-bold">
                    {currentUser?.demoAccountId || (currentUser?.id ? `DEMO-${currentUser.id.slice(-6).toUpperCase()}` : "DEMO-884920")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Current Equity:</span>
                  <span className="text-emerald-500 font-bold">${account.equity.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Select Virtual Capital */}
            <div>
              <label className={`block mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-zinc-300"}`}>
                Select Virtual Demo Capital:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1000, 5000, 10000, 50000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSelectedDemoCapital(amt)}
                    className={`py-2 rounded-lg border font-bold text-xs transition ${
                      selectedDemoCapital === amt
                        ? "bg-amber-500/20 border-amber-500 text-amber-500 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                        : "bg-[#161B22] border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    ${amt >= 1000 ? `${amt / 1000}k` : amt} USD
                  </button>
                ))}
              </div>
            </div>

            {/* Select Leverage */}
            <div>
              <label className={`block mb-1.5 text-xs font-bold ${isLight ? "text-slate-700" : "text-zinc-300"}`}>
                Select Account Leverage:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500, 1000].map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setSelectedLeverage(lev)}
                    className={`py-2 rounded-lg border font-bold text-xs transition ${
                      selectedLeverage === lev
                        ? "bg-purple-500/20 border-purple-500 text-purple-400 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                        : "bg-[#161B22] border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    1:{lev}
                  </button>
                ))}
              </div>
            </div>

            {/* Inspirational Note for Massive Payouts */}
            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
              isLight
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}>
              💡 <strong>Trading Tip:</strong> Enjoy trading with demo! Do not forget to open a <strong>Real Live Exness Account</strong> whenever you are ready to earn and withdraw massive real-money payouts.
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleApplyDemoAccount}
                className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <ArrowsClockwise className="w-4 h-4" />
                Activate / Reset Demo
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectBrokerMode("DEMO")
                  onClose()
                }}
                className={`py-2.5 rounded-xl border font-bold text-xs transition ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                    : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
                }`}
              >
                Keep Current Demo
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: REAL LIVE TRADING ACCOUNT */}
        {activeTab === "live" && (
          <div className="space-y-4 font-mono text-xs">
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight
                ? "bg-emerald-50/70 border-emerald-200 text-slate-800"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Institutional Exness Broker Gateway</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentUser?.assignedExnessAccount
                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  }`}
                >
                  {currentUser?.assignedExnessAccount ? "VERIFIED & ASSIGNED" : "PENDING ADMIN KYC"}
                </span>
              </div>

              <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-zinc-300"}`}>
                Real-money positions route directly into authorized Exness MT5 liquidity pools.
              </p>

              {/* Exness Live Specs */}
              <div className={`p-3 rounded-lg border space-y-1.5 text-[11px] ${
                isLight ? "bg-white border-slate-200" : "bg-[#12161F] border-zinc-800"
              }`}>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Live Broker Server:</span>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-zinc-200"}`}>
                    {currentUser?.assignedExnessServer || DEFAULT_EXNESS_SERVER}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Assigned Exness Account:</span>
                  <span className={currentUser?.assignedExnessAccount ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                    {currentUser?.assignedExnessAccount ? `#${currentUser.assignedExnessAccount}` : "Not Assigned (Contact Admin)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-slate-500" : "text-zinc-500"}>Verification Status:</span>
                  <span className={currentUser?.assignedExnessAccount ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                    {currentUser?.assignedExnessAccount ? "APPROVED (READY FOR TRADING)" : "PENDING ADMIN APPROVAL"}
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Deposit Guidance */}
            <div className={`p-3 rounded-xl border space-y-2 text-[11px] leading-relaxed ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-[#161B22] border-zinc-800 text-zinc-300"
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-amber-500">
                <Wallet className="w-4 h-4" />
                <span>USDT Wallet Funding</span>
              </div>
              <p>
                Deposit USDT via <strong>TRC20, ERC20, or BEP20</strong> networks configured by the administrator. Once verified on-chain, your funds are credited directly to your live trading equity.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenWallet()
                }}
                className="py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Deposit USDT to Wallet
              </button>

              <button
                type="button"
                onClick={handleSwitchToLive}
                className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Trade on Live Exness
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
