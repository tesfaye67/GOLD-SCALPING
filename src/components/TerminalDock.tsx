import { useState, useEffect } from "react"
import {
  ListBullets,
  Clock,
  Newspaper,
  Receipt,
  TrendUp,
  TrendDown,
  PencilSimple,
  Check,
} from "@phosphor-icons/react"
import type { TradePosition, TradeJournalEntry, EconomicEvent, LedgerEntry, TimezoneKey } from "../types"
import { formatInTimezone } from "../utils/timezone"
import { getMarketHoursInfo, isWeekendSimulationActive } from "../utils/marketHours"

interface Props {
  positions: TradePosition[]
  closedTrades: TradeJournalEntry[]
  newsEvents: EconomicEvent[]
  ledger: LedgerEntry[]
  timezone: TimezoneKey
  onClosePosition: (id: string) => void
  onUpdatePositionSLTP?: (id: string, sl: number, tp: number) => void
  theme?: "dark" | "light"
  className?: string
}

export function TerminalDock({
  positions,
  closedTrades,
  newsEvents,
  ledger,
  timezone,
  onClosePosition,
  onUpdatePositionSLTP,
  theme = "dark",
  className = "h-64",
}: Props) {
  const [activeTab, setActiveTab] = useState<"positions" | "history" | "news" | "ledger">("positions")
  const [marketHours, setMarketHours] = useState(() => getMarketHoursInfo(isWeekendSimulationActive()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSl, setEditSl] = useState("")
  const [editTp, setEditTp] = useState("")

  const isLight = theme === "light"

  useEffect(() => {
    const id = setInterval(() => {
      setMarketHours(getMarketHoursInfo(isWeekendSimulationActive()))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const startEdit = (pos: TradePosition) => {
    setEditingId(pos.id)
    setEditSl(pos.sl ? pos.sl.toString() : "")
    setEditTp(pos.tp ? pos.tp.toString() : "")
  }

  const saveEdit = (posId: string) => {
    if (onUpdatePositionSLTP) {
      onUpdatePositionSLTP(posId, parseFloat(editSl) || 0, parseFloat(editTp) || 0)
    }
    setEditingId(null)
  }

  return (
    <div
      className={`${className} flex flex-col rounded-xl overflow-hidden font-mono text-xs border transition-colors ${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-2xs"
          : "bg-[#0D1117] border-zinc-800/80 text-zinc-200"
      }`}
    >
      {/* Dock Tabs Header */}
      <div
        className={`flex items-center justify-between px-2 sm:px-3 border-b select-none transition-colors overflow-x-auto no-scrollbar ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#12161F] border-zinc-800"
        }`}
      >
        <div className="flex flex-shrink-0">
          <button
            onClick={() => setActiveTab("positions")}
            className={`py-2 px-2.5 sm:px-3 flex items-center gap-1.5 transition text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${
              activeTab === "positions"
                ? "text-amber-500 border-b-2 border-amber-500 bg-amber-500/10"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ListBullets className="w-3.5 h-3.5" />
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-2.5 sm:px-3 flex items-center gap-1.5 transition text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${
              activeTab === "history"
                ? "text-amber-500 border-b-2 border-amber-500 bg-amber-500/10"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Trade Journal ({closedTrades.length})
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`py-2 px-2.5 sm:px-3 flex items-center gap-1.5 transition text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${
              activeTab === "news"
                ? "text-amber-500 border-b-2 border-amber-500 bg-amber-500/10"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5 text-blue-500" />
            Economic Calendar ({newsEvents.length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2 px-2.5 sm:px-3 flex items-center gap-1.5 transition text-[11px] font-bold whitespace-nowrap flex-shrink-0 ${
              activeTab === "ledger"
                ? "text-amber-500 border-b-2 border-amber-500 bg-amber-500/10"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            Double-Entry Ledger ({ledger.length})
          </button>
        </div>

        <div className={`hidden md:flex text-[10px] items-center gap-3 whitespace-nowrap flex-shrink-0 pl-2 ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`w-2 h-2 rounded-full ${
                marketHours.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className={marketHours.isOpen ? "text-emerald-500" : "text-amber-500"}>
              {marketHours.isOpen ? "XAU/USD OPEN" : "WEEKEND HOLD ACTIVE"}
            </span>
            <span className="font-normal opacity-80">({marketHours.countdownText})</span>
          </div>
          <span>|</span>
          <span>Time: {timezone}</span>
        </div>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* TAB 1: OPEN POSITIONS */}
        {activeTab === "positions" && (
          <div className="overflow-x-auto min-w-full">
            <div className="space-y-1 min-w-[700px]">
              <div
                className={`grid grid-cols-8 gap-2 px-2 py-1 text-[10px] font-bold uppercase border-b ${
                  isLight ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
                }`}
              >
                <span>Instrument</span>
                <span>Side</span>
                <span>Lots (oz)</span>
                <span>Entry Price</span>
                <span>Current Price</span>
                <span>SL / TP (Editable)</span>
                <span>Floating P/L</span>
                <span className="text-right">Action</span>
              </div>

              {positions.map((pos) => {
                const curPrice = pos.currentPrice || pos.entryPrice
                const isEditing = editingId === pos.id
                return (
                  <div
                    key={pos.id}
                    className={`grid grid-cols-8 gap-2 px-2 py-1.5 rounded text-[11px] items-center border transition ${
                      isLight
                        ? "hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-800"
                        : "hover:bg-[#161B22] border-transparent hover:border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-amber-500">XAU/USD</span>
                      {!marketHours.isOpen && (
                        <span
                          className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40"
                          title="Position held safely until market re-opens Sunday 22:00 UTC"
                        >
                          HELD
                        </span>
                      )}
                    </div>

                    <span
                      className={`font-bold flex items-center gap-1 ${
                        pos.side === "buy" ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {pos.side === "buy" ? <TrendUp className="w-3 h-3" /> : <TrendDown className="w-3 h-3" />}
                      {pos.side.toUpperCase()}
                    </span>

                    <span>{pos.size.toFixed(2)} lots</span>
                    <span>${pos.entryPrice.toFixed(2)}</span>
                    <span>${curPrice.toFixed(2)}</span>

                    {/* SL/TP with inline modifier */}
                    <div>
                      {!isEditing ? (
                        <button
                          onClick={() => startEdit(pos)}
                          className={`flex items-center gap-1 text-[10px] transition py-0.5 px-1 rounded ${
                            isLight
                              ? "text-slate-700 hover:bg-slate-100"
                              : "text-zinc-300 hover:text-amber-300 hover:bg-zinc-800"
                          }`}
                          title="Click to adjust Stop Loss & Take Profit"
                        >
                          <span className="text-rose-500">${pos.sl ? pos.sl.toFixed(1) : "—"}</span>
                          <span className={isLight ? "text-slate-400" : "text-zinc-600"}>/</span>
                          <span className="text-emerald-500">${pos.tp ? pos.tp.toFixed(1) : "—"}</span>
                          <PencilSimple className="w-3 h-3 text-slate-400 ml-0.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={editSl}
                            onChange={(e) => setEditSl(e.target.value)}
                            placeholder="SL"
                            className={`w-12 border rounded px-1 py-0.5 text-[10px] text-rose-500 ${
                              isLight ? "bg-white border-slate-300" : "bg-[#0D1117] border-zinc-700"
                            }`}
                          />
                          <input
                            type="number"
                            step="0.5"
                            value={editTp}
                            onChange={(e) => setEditTp(e.target.value)}
                            placeholder="TP"
                            className={`w-12 border rounded px-1 py-0.5 text-[10px] text-emerald-500 ${
                              isLight ? "bg-white border-slate-300" : "bg-[#0D1117] border-zinc-700"
                            }`}
                          />
                          <button
                            onClick={() => saveEdit(pos.id)}
                            className="p-1 rounded bg-amber-500 text-black hover:bg-amber-400 transition"
                            title="Save SL/TP"
                          >
                            <Check className="w-3 h-3 font-bold" />
                          </button>
                        </div>
                      )}
                    </div>

                    <span
                      className={`font-bold ${
                        pos.pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {pos.pnl >= 0 ? `+$${pos.pnl.toFixed(2)}` : `-$${Math.abs(pos.pnl).toFixed(2)}`}
                      <span className={`text-[10px] font-normal ml-1 ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                        ({pos.pnlPercent ? pos.pnlPercent.toFixed(1) : "0.0"}%)
                      </span>
                    </span>

                    <div className="text-right">
                      <button
                        onClick={() => onClosePosition(pos.id)}
                        className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500 border border-rose-500/40 hover:bg-rose-500/25 text-[10px] font-bold transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )
              })}

              {positions.length === 0 && (
                <div className={`text-center py-10 text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                  No active XAU/USD open positions. AI Price-Action Engine searching for confirmed confluences.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TRADE JOURNAL */}
        {activeTab === "history" && (
          <div className="overflow-x-auto min-w-full">
            <div className="space-y-1 min-w-[700px]">
              <div
                className={`grid grid-cols-7 gap-2 px-2 py-1 text-[10px] font-bold uppercase border-b ${
                  isLight ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
                }`}
              >
                <span>Time Closed</span>
                <span>Symbol & Side</span>
                <span>Lots</span>
                <span>Entry → Exit</span>
                <span>Net P/L ($)</span>
                <span>AI Setup Rationale</span>
                <span className="text-right">Return</span>
              </div>

              {closedTrades.map((tr) => (
                <div
                  key={tr.id}
                  className={`grid grid-cols-7 gap-2 px-2 py-1.5 rounded text-[11px] items-center border transition ${
                    isLight
                      ? "hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-800"
                      : "hover:bg-[#161B22] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                    {formatInTimezone(tr.closedAt, timezone)}
                  </span>
                  <span className={`font-bold ${tr.side === "buy" ? "text-emerald-500" : "text-rose-500"}`}>
                    XAU/USD {tr.side.toUpperCase()}
                  </span>
                  <span>{tr.size.toFixed(2)}</span>
                  <span>${tr.entryPrice.toFixed(2)} → ${tr.exitPrice.toFixed(2)}</span>
                  <span className={`font-bold ${tr.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {tr.pnl >= 0 ? `+$${tr.pnl.toFixed(2)}` : `-$${Math.abs(tr.pnl).toFixed(2)}`}
                  </span>
                  <span className={`text-[10px] truncate ${isLight ? "text-slate-600" : "text-zinc-400"}`} title={tr.aiSetup}>
                    {tr.aiSetup}
                  </span>
                  <span className={`text-right font-bold ${tr.pnlPercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {tr.pnlPercent >= 0 ? `+${tr.pnlPercent.toFixed(2)}%` : `${tr.pnlPercent.toFixed(2)}%`}
                  </span>
                </div>
              ))}

              {closedTrades.length === 0 && (
                <div className={`text-center py-10 text-[11px] ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                  No completed trades logged in journal for this session.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ECONOMIC CALENDAR */}
        {activeTab === "news" && (
          <div className="overflow-x-auto min-w-full">
            <div className="space-y-1 min-w-[650px]">
              <div
                className={`grid grid-cols-6 gap-2 px-2 py-1 text-[10px] font-bold uppercase border-b ${
                  isLight ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
                }`}
              >
                <span>Scheduled Time</span>
                <span>Currency</span>
                <span>Impact</span>
                <span>Economic Event</span>
                <span>Forecast / Previous</span>
                <span className="text-right">Trading Filter</span>
              </div>

              {newsEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`grid grid-cols-6 gap-2 px-2 py-1.5 rounded text-[11px] items-center border transition ${
                    isLight
                      ? "hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-800"
                      : "hover:bg-[#161B22] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <span className={`font-bold ${isLight ? "text-slate-800" : "text-zinc-300"}`}>
                    {formatInTimezone(ev.scheduledTime, timezone)}
                  </span>
                  <span className="text-blue-500 font-bold">{ev.country}</span>
                  <span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 border border-rose-500/30 font-bold">
                      {ev.impact}
                    </span>
                  </span>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-zinc-200"}`}>{ev.title}</span>
                  <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                    {ev.forecast || "—"} / {ev.previous || "—"}
                  </span>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold">
                      30m Blackout
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: IMMUTABLE DOUBLE-ENTRY LEDGER */}
        {activeTab === "ledger" && (
          <div className="overflow-x-auto min-w-full">
            <div className="space-y-1 min-w-[600px]">
              <div
                className={`grid grid-cols-5 gap-2 px-2 py-1 text-[10px] font-bold uppercase border-b ${
                  isLight ? "text-slate-500 border-slate-200" : "text-zinc-500 border-zinc-800"
                }`}
              >
                <span>Timestamp</span>
                <span>Reference</span>
                <span>Type</span>
                <span>Amount</span>
                <span className="text-right">Ledger Status</span>
              </div>

              {ledger.map((tx) => (
                <div
                  key={tx.id}
                  className={`grid grid-cols-5 gap-2 px-2 py-1.5 rounded text-[11px] items-center border transition ${
                    isLight
                      ? "hover:bg-slate-50 border-transparent hover:border-slate-200 text-slate-800"
                      : "hover:bg-[#161B22] border-transparent hover:border-zinc-800 text-zinc-300"
                  }`}
                >
                  <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                    {formatInTimezone(tx.createdAt, timezone)}
                  </span>
                  <span className={`font-bold ${isLight ? "text-slate-900" : "text-zinc-200"}`}>{tx.reference}</span>
                  <span className="text-amber-500 font-bold">{tx.type}</span>
                  <span className={`font-bold ${tx.amount >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                  </span>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                      VERIFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
