import { useEffect, useState } from "react"
import { WifiHigh, Warning, ShieldCheck } from "@phosphor-icons/react"
import { motion, AnimatePresence } from "framer-motion"
import type { DataIntegrityState } from "../types"
import { getDataIntegrityState } from "../data/marketService"
import { formatInTimezone } from "../utils/timezone"
import type { TimezoneKey } from "../types"

interface Props {
  timezone: TimezoneKey
}

export function DataIntegrityMonitor({ timezone }: Props) {
  const [state, setState] = useState<DataIntegrityState>(getDataIntegrityState())

  useEffect(() => {
    const id = setInterval(() => {
      setState(getDataIntegrityState())
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const statusColor = state.feedStatus === "connected" ? "text-emerald-400" : state.feedStatus === "delayed" ? "text-amber-400" : "text-rose-400"
  const statusBg = state.feedStatus === "connected" ? "bg-emerald-500/10 border-emerald-500/30" : state.feedStatus === "delayed" ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30"
  const statusLabel = state.feedStatus === "connected" ? "LIVE DATA CONNECTED" : state.feedStatus === "delayed" ? "DATA DELAYED" : "DATA DISCONNECTED"

  const latency = state.brokerTimestamp - state.latestTickTimestamp

  return (
    <div className="bg-[#12161F] border border-zinc-800/50 rounded-lg p-2">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${statusBg} ${statusColor}`}>
          {state.feedStatus === "connected" ? <ShieldCheck className="w-3 h-3" /> : state.feedStatus === "delayed" ? <Warning className="w-3 h-3" /> : <WifiHigh className="w-3 h-3" />}
          {statusLabel}
        </div>
        <span className="text-[9px] font-mono text-zinc-500">
          {formatInTimezone(state.lastUpdate, timezone, { date: false, time: true, seconds: true })}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono">
        <div className="bg-zinc-800/40 rounded px-1.5 py-1">
          <span className="text-zinc-500 block">Latency</span>
          <span className={latency > 15000 ? "text-rose-400" : latency > 5000 ? "text-amber-400" : "text-emerald-400"}>
            {latency}ms
          </span>
        </div>
        <div className="bg-zinc-800/40 rounded px-1.5 py-1">
          <span className="text-zinc-500 block">Spread</span>
          <span className={state.spreadValue > 1.0 ? "text-amber-400" : "text-zinc-300"}>
            ${state.spreadValue.toFixed(2)}
          </span>
        </div>
        <div className="bg-zinc-800/40 rounded px-1.5 py-1">
          <span className="text-zinc-500 block">Discrepancy</span>
          <span className={state.priceDiscrepancy > 0.80 ? "text-rose-400" : state.priceDiscrepancy > 0.50 ? "text-amber-400" : "text-emerald-400"}>
            ${state.priceDiscrepancy.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex justify-between mt-1.5 text-[8px] font-mono text-zinc-600">
        <span>Chart: {formatInTimezone(state.chartTimestamp, timezone, { date: false, time: true, seconds: true })}</span>
        <span>Broker: {formatInTimezone(state.brokerTimestamp, timezone, { date: false, time: true, seconds: true })}</span>
      </div>

      {/* Circuit Breaker Alert */}
      <AnimatePresence>
        {state.circuitBreakerActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="bg-rose-500/15 border border-rose-500/40 rounded px-2 py-1.5 flex items-center gap-2">
              <Warning className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-400 block">
                  PRICE FEED MISMATCH - TRADING DISABLED
                </span>
                <span className="text-[9px] font-mono text-rose-300/70">
                  {state.circuitBreakerReason}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
