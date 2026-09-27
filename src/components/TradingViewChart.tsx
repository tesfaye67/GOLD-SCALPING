import { useEffect, useRef, useState, useCallback } from "react"
import { Clock, Gear, ArrowsClockwise, Crosshair, ChartLine } from "@phosphor-icons/react"
import type { Timeframe, ChartViewMode, SMCAnalysis, MarketTick } from "../types"
import { TIMEZONES, DEFAULT_TIMEZONE, getTimezoneLabel } from "../utils/timezone"
import type { TimezoneKey } from "../types"
import { GoldChart } from "./GoldChart"

interface Props {
  tick: MarketTick
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
  smcAnalysis: SMCAnalysis | null
  theme?: "dark" | "light"
}

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "1m", label: "1m" },
  { key: "5m", label: "5m" },
  { key: "15m", label: "15m" },
  { key: "30m", label: "30m" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
]

export function TradingViewChart({ tick, timeframe, onTimeframeChange, smcAnalysis, theme = "dark" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [viewMode, setViewMode] = useState<ChartViewMode>("tradingview")
  const [timezone, setTimezone] = useState<TimezoneKey>(DEFAULT_TIMEZONE)
  const [showOverlays, setShowOverlays] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const isLight = theme === "light"

  const createWidget = useCallback(() => {
    if (!containerRef.current) return

    const tv = (window as any).TradingView
    if (!tv) return

    const WidgetConstructor = tv.widget || tv.Widget
    if (typeof WidgetConstructor !== "function") return

    try {
      if (widgetRef.current && typeof widgetRef.current.remove === "function") {
        widgetRef.current.remove()
      }
    } catch {}

    containerRef.current.innerHTML = ""

    try {
      widgetRef.current = new WidgetConstructor({
        autosize: true,
        symbol: "OANDA:XAUUSD",
        interval: timeframe === "1h" ? "60" : timeframe === "4h" ? "240" : timeframe === "1d" ? "D" : timeframe.replace("m", ""),
        timezone: timezone === "Broker" ? "Africa/Addis_Ababa" : timezone,
        theme: isLight ? "light" : "dark",
        style: "1",
        locale: "en",
        toolbar_bg: isLight ? "#F8FAFC" : "#161b22",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        hide_top_toolbar: false,
        container_id: "tradingview_widget",
        studies: [],
        withdateranges: true,
        details: false,
      })
    } catch (err) {
      console.error("Failed to initialize TradingView widget:", err)
    }
  }, [timeframe, timezone, isLight])

  useEffect(() => {
    const SCRIPT_ID = "tradingview-tv-js"
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null

    const handleLoad = () => {
      createWidget()
    }

    if ((window as any).TradingView) {
      createWidget()
    } else if (script) {
      script.addEventListener("load", handleLoad, { once: true })
    } else {
      script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = "https://s3.tradingview.com/tv.js"
      script.async = true
      script.onload = handleLoad
      script.onerror = () => {
        console.warn("TradingView script failed to load, falling back to overlay mode")
        setViewMode("overlay")
      }
      document.head.appendChild(script)
    }

    return () => {
      if (script) {
        script.removeEventListener("load", handleLoad)
      }
    }
  }, [createWidget])

  useEffect(() => {
    return () => {
      if (widgetRef.current) {
        try {
          if (typeof widgetRef.current.remove === "function") {
            widgetRef.current.remove()
          }
        } catch {}
      }
    }
  }, [])

  return (
    <div className={`flex flex-col h-full rounded-xl overflow-hidden border transition-colors ${
      isLight ? "bg-white border-slate-200 text-slate-800" : "bg-[#0B0E14] border-zinc-800/50 text-zinc-200"
    }`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-2 py-1.5 border-b gap-2 flex-wrap transition-colors ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-[#12161F] border-zinc-800/50"
      }`}>
        {/* Timeframes */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.key}
              onClick={() => onTimeframeChange(tf.key)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors ${
                timeframe === tf.key
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === "tradingview" ? "overlay" : "tradingview")}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
            title={viewMode === "tradingview" ? "Switch to Overlay Mode" : "Switch to TradingView"}
          >
            <ChartLine className="w-3.5 h-3.5" />
            {viewMode === "tradingview" ? "TV" : "OVR"}
          </button>

          {/* Pure Price Action Overlays Toggle */}
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              showOverlays ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30" : "text-zinc-500 hover:text-zinc-300"
            }`}
            title="Toggle Pure Price Action Overlays"
          >
            <Crosshair className="w-3.5 h-3.5" />
            PRICE ACTION
          </button>

          {/* Timezone */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {getTimezoneLabel(timezone).split(" ")[0]}
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 bg-[#161b22] border border-zinc-700 rounded-lg p-1 z-50 shadow-xl min-w-[160px]">
                {TIMEZONES.map(tz => (
                  <button
                    key={tz.key}
                    onClick={() => { setTimezone(tz.key); setShowSettings(false) }}
                    className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      timezone === tz.key ? "text-amber-400 bg-amber-500/10" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                  >
                    {tz.label} ({tz.offset})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={createWidget}
            className="flex items-center justify-center w-6 h-6 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
            title="Reload Chart"
          >
            <ArrowsClockwise className="w-3.5 h-3.5" />
          </button>

          <Gear className="w-3.5 h-3.5 text-zinc-600" />
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 relative min-h-0">
        <div
          id="tradingview_widget"
          ref={containerRef}
          className={`w-full h-full ${viewMode === "tradingview" ? "" : "hidden"}`}
        />
        {viewMode === "overlay" && (
          <div className="w-full h-full absolute inset-0">
            <GoldChart tick={tick} timeframe={timeframe} onTimeframeChange={onTimeframeChange} />
          </div>
        )}

        {/* SMC Overlay Panel */}
        {showOverlays && smcAnalysis && (
          <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
            <div className="bg-[#0B0E14]/90 backdrop-blur-sm border border-zinc-800/60 rounded-lg p-2 pointer-events-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider font-bold">Pure Price Action Structures</span>
                <span className="text-[9px] font-mono text-zinc-500">XAU/USD {timeframe}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-[9px] font-mono">
                {/* Order Blocks */}
                <div>
                  <span className="text-zinc-500 block mb-0.5">Order Blocks</span>
                  {smcAnalysis.orderBlocks.slice(-3).map((ob, i) => (
                    <div key={i} className={`flex justify-between ${ob.type === "bullish" ? "text-emerald-400" : "text-rose-400"}`}>
                      <span>{ob.type === "bullish" ? "Bull" : "Bear"}</span>
                      <span>{ob.bottom.toFixed(1)}-{ob.top.toFixed(1)}</span>
                    </div>
                  ))}
                  {smcAnalysis.orderBlocks.length === 0 && <span className="text-zinc-600">None detected</span>}
                </div>

                {/* FVG */}
                <div>
                  <span className="text-zinc-500 block mb-0.5">Fair Value Gaps</span>
                  {smcAnalysis.fvg.slice(-3).map((f, i) => (
                    <div key={i} className={`flex justify-between ${f.type === "bullish" ? "text-emerald-300" : "text-rose-300"}`}>
                      <span>{f.type === "bullish" ? "Bull" : "Bear"}</span>
                      <span>{f.bottom.toFixed(1)}-{f.top.toFixed(1)}</span>
                    </div>
                  ))}
                  {smcAnalysis.fvg.length === 0 && <span className="text-zinc-600">None detected</span>}
                </div>

                {/* Liquidity */}
                <div>
                  <span className="text-zinc-500 block mb-0.5">Liquidity</span>
                  {smcAnalysis.liquidity.slice(-3).map((l, i) => (
                    <div key={i} className={`flex justify-between ${l.type === "BSL" ? "text-amber-300" : "text-purple-300"}`}>
                      <span>{l.type}</span>
                      <span>{l.price.toFixed(1)}</span>
                    </div>
                  ))}
                  {smcAnalysis.liquidity.length === 0 && <span className="text-zinc-600">None detected</span>}
                </div>

                {/* Structure + Premium/Discount */}
                <div>
                  <span className="text-zinc-500 block mb-0.5">Structure</span>
                  {smcAnalysis.structures.slice(-2).map((s, i) => (
                    <div key={i} className={`flex justify-between ${s.direction === "bullish" ? "text-emerald-400" : "text-rose-400"}`}>
                      <span>{s.type}</span>
                      <span>{s.price.toFixed(1)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-zinc-400 mt-0.5 pt-0.5 border-t border-zinc-800">
                    <span>EQ</span>
                    <span>{smcAnalysis.premiumDiscount.equilibrium.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Prem/Disc</span>
                    <span>{smcAnalysis.premiumDiscount.premium.toFixed(0)}/{smcAnalysis.premiumDiscount.discount.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-2 right-2 bg-[#0B0E14]/80 backdrop-blur-sm border border-zinc-800/60 rounded px-2 py-1">
          <span className="text-[10px] font-mono text-amber-400 font-bold">${tick.price.toFixed(2)}</span>
          <span className="text-[9px] font-mono text-zinc-500 ml-1.5">B:{tick.bid.toFixed(2)} A:{tick.ask.toFixed(2)}</span>
        </div>
      </div>

      {/* Separation Banner */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#0D1117] border-t border-zinc-800/50">
        <span className="text-[9px] font-mono text-zinc-600">
          TradingView = Visualization Engine | Execution via Broker API / Paper Engine
        </span>
        <span className="text-[9px] font-mono text-zinc-600">
          TZ: {getTimezoneLabel(timezone)}
        </span>
      </div>
    </div>
  )
}
