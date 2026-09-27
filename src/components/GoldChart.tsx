import { useRef, useEffect, useState, useCallback } from "react"
import { Eye, EyeOff, Layers, Crosshair } from "lucide-react"
import type { Candle, Timeframe, TechnicalIndicators, MarketTick } from "../types"
import { getCandles, refreshCandles, computeIndicators } from "../data/marketService"

interface Props {
  tick: MarketTick
  timeframe: Timeframe
  onTimeframeChange: (tf: Timeframe) => void
}

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d"]

export function GoldChart({ tick, timeframe, onTimeframeChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [candles, setCandles] = useState<Candle[]>([])
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null)
  const [showEMA, setShowEMA] = useState(true)
  const [showBB, setShowBB] = useState(false)
  const [showRSI, setShowRSI] = useState(true)
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; candle?: Candle } | null>(null)

  useEffect(() => {
    const c = getCandles(timeframe)
    setCandles(c)
    setIndicators(computeIndicators(c))
  }, [timeframe])

  useEffect(() => {
    const id = setInterval(() => {
      const c = refreshCandles(timeframe)
      setCandles(c)
      setIndicators(computeIndicators(c))
    }, 3000)
    return () => clearInterval(id)
  }, [timeframe])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || candles.length === 0 || !indicators) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)

    const W = rect.width
    const rsiH = showRSI ? 80 : 0
    const chartH = rect.height - rsiH - 20
    const visibleCount = Math.min(80, candles.length)
    const visible = candles.slice(-visibleCount)
    const indStart = candles.length - visibleCount

    // Price range
    const highs = visible.map(c => c.high)
    const lows = visible.map(c => c.low)
    const maxPrice = Math.max(...highs) + 2
    const minPrice = Math.min(...lows) - 2
    const priceRange = maxPrice - minPrice

    const candleW = W / visibleCount
    const bodyW = Math.max(2, candleW * 0.6)

    const priceToY = (p: number) => chartH - ((p - minPrice) / priceRange) * chartH

    // Background
    ctx.fillStyle = "#0D1117"
    ctx.fillRect(0, 0, W, rect.height)

    // Grid lines
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 0.5
    const gridLines = 6
    for (let i = 0; i <= gridLines; i++) {
      const y = (chartH / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
      // Price labels
      const price = maxPrice - (priceRange / gridLines) * i
      ctx.fillStyle = "#64748b"
      ctx.font = "10px JetBrains Mono, monospace"
      ctx.textAlign = "right"
      ctx.fillText(price.toFixed(2), W - 4, y + 3)
    }

    // Bollinger Bands
    if (showBB) {
      ctx.beginPath()
      ctx.strokeStyle = "rgba(139, 92, 246, 0.3)"
      ctx.lineWidth = 1
      for (let i = 0; i < visible.length; i++) {
        const idx = indStart + i
        const x = i * candleW + candleW / 2
        const y = priceToY(indicators.bollinger.upper[idx])
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.beginPath()
      for (let i = 0; i < visible.length; i++) {
        const idx = indStart + i
        const x = i * candleW + candleW / 2
        const y = priceToY(indicators.bollinger.lower[idx])
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      // Fill between
      ctx.fillStyle = "rgba(139, 92, 246, 0.04)"
      ctx.beginPath()
      for (let i = 0; i < visible.length; i++) {
        const idx = indStart + i
        const x = i * candleW + candleW / 2
        ctx.lineTo(x, priceToY(indicators.bollinger.upper[idx]))
      }
      for (let i = visible.length - 1; i >= 0; i--) {
        const idx = indStart + i
        const x = i * candleW + candleW / 2
        ctx.lineTo(x, priceToY(indicators.bollinger.lower[idx]))
      }
      ctx.closePath()
      ctx.fill()
    }

    // EMA lines
    if (showEMA) {
      const drawLine = (data: number[], color: string) => {
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 1.2
        for (let i = 0; i < visible.length; i++) {
          const idx = indStart + i
          if (idx >= data.length) break
          const x = i * candleW + candleW / 2
          const y = priceToY(data[idx])
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      drawLine(indicators.ema20, "#f59e0b")
      drawLine(indicators.ema50, "#3b82f6")
      drawLine(indicators.ema200, "#8b5cf6")
    }

    // Candles
    for (let i = 0; i < visible.length; i++) {
      const c = visible[i]
      const x = i * candleW + candleW / 2
      const bullish = c.close >= c.open
      const color = bullish ? "#10b981" : "#ef4444"

      // Wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, priceToY(c.high))
      ctx.lineTo(x, priceToY(c.low))
      ctx.stroke()

      // Body
      ctx.fillStyle = color
      const bodyTop = priceToY(Math.max(c.open, c.close))
      const bodyBot = priceToY(Math.min(c.open, c.close))
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, Math.max(1, bodyBot - bodyTop))
    }

    // Current price line
    const priceY = priceToY(tick.price)
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = tick.direction === "up" ? "#10b981" : "#ef4444"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, priceY)
    ctx.lineTo(W, priceY)
    ctx.stroke()
    ctx.setLineDash([])

    // Price tag
    ctx.fillStyle = tick.direction === "up" ? "#10b981" : "#ef4444"
    ctx.fillRect(W - 60, priceY - 8, 60, 16)
    ctx.fillStyle = "#fff"
    ctx.font = "bold 10px JetBrains Mono, monospace"
    ctx.textAlign = "right"
    ctx.fillText(tick.price.toFixed(2), W - 6, priceY + 4)

    // RSI Sub-chart
    if (showRSI) {
      const rsiTop = chartH + 20
      const rsiRange = 70
      ctx.fillStyle = "#0D1117"
      ctx.fillRect(0, rsiTop, W, rsiH)
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, rsiTop); ctx.lineTo(W, rsiTop); ctx.stroke()

      // RSI bands
      ctx.strokeStyle = "rgba(234, 179, 8, 0.2)"
      ctx.setLineDash([3, 3])
      const rsi70 = rsiTop + rsiH - (70 / rsiRange) * rsiH
      const rsi30 = rsiTop + rsiH - (30 / rsiRange) * rsiH
      ctx.beginPath(); ctx.moveTo(0, rsi70); ctx.lineTo(W, rsi70); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, rsi30); ctx.lineTo(W, rsi30); ctx.stroke()
      ctx.setLineDash([])

      // RSI line
      ctx.beginPath()
      ctx.strokeStyle = "#eab308"
      ctx.lineWidth = 1.2
      for (let i = 0; i < visible.length; i++) {
        const idx = indStart + i
        if (idx >= indicators.rsi.length) break
        const x = i * candleW + candleW / 2
        const y = rsiTop + rsiH - (Math.min(100, Math.max(0, indicators.rsi[idx])) / rsiRange) * rsiH
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()

      ctx.fillStyle = "#64748b"
      ctx.font = "9px JetBrains Mono, monospace"
      ctx.textAlign = "left"
      ctx.fillText("RSI 14", 4, rsiTop + 10)
    }

    // Time labels
    ctx.fillStyle = "#475569"
    ctx.font = "9px JetBrains Mono, monospace"
    ctx.textAlign = "center"
    for (let i = 0; i < visible.length; i += Math.max(1, Math.floor(visible.length / 8))) {
      const x = i * candleW + candleW / 2
      const d = new Date(visible[i].time)
      ctx.fillText(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`, x, chartH + 14)
    }
  }, [candles, indicators, tick, showEMA, showBB, showRSI])

  useEffect(() => { draw() }, [draw])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || candles.length === 0) return
    const x = e.clientX - rect.left
    const visibleCount = Math.min(80, candles.length)
    const candleW = rect.width / visibleCount
    const idx = Math.floor(x / candleW)
    const visible = candles.slice(-visibleCount)
    setCrosshair({ x, y: e.clientY - rect.top, candle: visible[idx] })
  }

  return (
    <div className="flex flex-col h-full bg-[#0D1117] border border-zinc-800/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-800/50 bg-[#161b22]">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${timeframe === tf ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}
          >
            {tf.toUpperCase()}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setShowEMA(!showEMA)} className={`p-1 rounded ${showEMA ? "text-amber-400" : "text-zinc-600"}`} title="EMA">
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowBB(!showBB)} className={`p-1 rounded ${showBB ? "text-purple-400" : "text-zinc-600"}`} title="Bollinger">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowRSI(!showRSI)} className={`p-1 rounded ${showRSI ? "text-yellow-400" : "text-zinc-600"}`} title="RSI">
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="flex-1 relative min-h-[300px]" onMouseMove={handleMouseMove} onMouseLeave={() => setCrosshair(null)}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {crosshair?.candle && (
          <div className="absolute top-2 left-2 bg-[#161b22]/90 border border-zinc-700 rounded px-2 py-1 text-xs font-mono pointer-events-none">
            <span className="text-zinc-400">O:{crosshair.candle.open.toFixed(2)} H:{crosshair.candle.high.toFixed(2)} L:{crosshair.candle.low.toFixed(2)} C:{crosshair.candle.close.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
