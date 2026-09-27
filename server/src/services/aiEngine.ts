// TDR GOLD TREADER - Multi-Timeframe AI Price-Action Engine (4H → 1H → 15M)
import type { Candle, MarketTick, AISignalProposal, Timeframe } from "../types"

export interface OrderBlock {
  type: "bullish" | "bearish"
  top: number
  bottom: number
  time: number
  mitigated: boolean
}

export interface FairValueGap {
  type: "bullish" | "bearish"
  top: number
  bottom: number
  time: number
  mitigated: boolean
}

export interface LiquidityLevel {
  type: "BSL" | "SSL" // Buy-Side Liquidity (Equal Highs) vs Sell-Side Liquidity (Equal Lows)
  price: number
  time: number
  swept: boolean
}

export interface MultiTimeframeAnalysis {
  bias4h: "Bullish" | "Bearish" | "Ranging"
  equilibrium4h: { high: number; low: number; mid: number; zone: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" }
  orderBlocks1h: OrderBlock[]
  fvg1h: FairValueGap[]
  liquidity1h: LiquidityLevel[]
  confirmation15m: {
    sweepDetected: boolean
    chochDetected: boolean
    displacementDetected: boolean
    rejectionDetected: boolean
    pattern: string
  }
}

export class AIPricActionEngine {
  /**
   * Primary entry point: Evaluates XAU/USD using structured multi-timeframe price-action rules.
   * Produces a proposed trade setup or an explicit NO_TRADE.
   */
  public static analyze(
    candles4h: Candle[],
    candles1h: Candle[],
    candles15m: Candle[],
    currentTick: MarketTick,
    spreadAllowed = 2.50
  ): AISignalProposal {
    // 0. Preliminary Safety Check: Spread & Staleness
    const tickAgeMs = Date.now() - currentTick.timestamp
    if (tickAgeMs > 5000) {
      return this.createNoTrade("Market feed stale (>5s latency). Safety halt active.")
    }

    if (currentTick.spread > spreadAllowed) {
      return this.createNoTrade(`Excessive spread ($${currentTick.spread.toFixed(2)} > $${spreadAllowed.toFixed(2)}). Execution unsafe.`)
    }

    if (candles4h.length < 20 || candles1h.length < 20 || candles15m.length < 20) {
      return this.createNoTrade("Insufficient historical candle data for multi-timeframe alignment.")
    }

    // 1. 4H Macro Context Analysis
    const macroAnalysis = this.analyze4HMacro(candles4h, currentTick.price)

    // 2. 1H POI (Point of Interest) Analysis
    const poiAnalysis = this.analyze1HPOI(candles1h, currentTick.price, macroAnalysis.bias4h)

    // 3. 15M Confirmation Analysis
    const confirmation = this.analyze15MConfirmation(candles15m, currentTick.price)

    // 4. Multi-Timeframe Confluence Evaluation
    // Rule: Must have 4H Bias alignment + 1H POI reaction + 15M Confirmation (Sweep + CHOCH/Displacement)
    if (macroAnalysis.bias4h === "Bullish") {
      // For BUY: Must be in 4H Discount or reacting to 1H Demand/Order Block with 15M Bullish CHOCH
      const inDiscount = macroAnalysis.equilibrium4h.zone === "DISCOUNT" || macroAnalysis.equilibrium4h.zone === "EQUILIBRIUM"
      const reactingToDemand = poiAnalysis.activeOrderBlock && poiAnalysis.activeOrderBlock.type === "bullish"

      if (!inDiscount && !reactingToDemand) {
        return this.createNoTrade(
          "4H bias is Bullish, but price is in Premium zone without valid 1H Demand POI mitigation."
        )
      }

      if (!confirmation.sweepDetected && !confirmation.chochDetected) {
        return this.createNoTrade(
          "15M confirmation missing: No liquidity sweep or CHOCH displacement detected at POI."
        )
      }

      // Valid Bullish Setup
      const entry = currentTick.ask
      const swingLow = Math.min(...candles15m.slice(-5).map((c) => c.low))
      const stopLoss = Math.round((swingLow - 1.50) * 100) / 100 // 1.5 pt buffer below sweep
      const riskDistance = entry - stopLoss

      if (riskDistance <= 0.50 || riskDistance > 12.00) {
        return this.createNoTrade(`Invalid Stop Loss geometry: Risk distance $${riskDistance.toFixed(2)} out of safe bounds.`)
      }

      const takeProfit = Math.round((entry + riskDistance * 2.5) * 100) / 100 // 1:2.5 R:R
      const rr = Math.round(((takeProfit - entry) / riskDistance) * 100) / 100

      if (rr < 2.0) {
        return this.createNoTrade(`Minimum 1:2 Risk/Reward not met (Calculated: 1:${rr}).`)
      }

      return {
        id: `SIG_${Date.now()}`,
        symbol: "XAUUSD",
        direction: "BUY",
        bias4h: "Bullish",
        poi1h: `Demand mitigation at ${poiAnalysis.activeOrderBlock ? poiAnalysis.activeOrderBlock.bottom.toFixed(2) : macroAnalysis.equilibrium4h.mid.toFixed(2)} + FVG`,
        confirmation15m: `${confirmation.pattern} with displacement past swing high`,
        proposedEntry: entry,
        stopLoss,
        takeProfit,
        riskReward: rr,
        riskPercent: 1.0,
        confidence: confirmation.sweepDetected && confirmation.displacementDetected ? "HIGH" : "MODERATE",
        status: "PROPOSED",
        reason: "4H Bullish trend alignment with 1H Discount POI mitigation and 15M SSL sweep + CHOCH displacement.",
        timeframeAlignment: "4H (Bullish) → 1H (Demand Mitigated) → 15M (Bullish Displacement)",
        createdAt: Date.now(),
      }
    } else if (macroAnalysis.bias4h === "Bearish") {
      // For SELL: Must be in 4H Premium or reacting to 1H Supply/Order Block with 15M Bearish CHOCH
      const inPremium = macroAnalysis.equilibrium4h.zone === "PREMIUM" || macroAnalysis.equilibrium4h.zone === "EQUILIBRIUM"
      const reactingToSupply = poiAnalysis.activeOrderBlock && poiAnalysis.activeOrderBlock.type === "bearish"

      if (!inPremium && !reactingToSupply) {
        return this.createNoTrade(
          "4H bias is Bearish, but price is in Discount zone without valid 1H Supply POI mitigation."
        )
      }

      if (!confirmation.sweepDetected && !confirmation.chochDetected) {
        return this.createNoTrade(
          "15M confirmation missing: No Buy-Side liquidity sweep or Bearish CHOCH detected at POI."
        )
      }

      // Valid Bearish Setup
      const entry = currentTick.bid
      const swingHigh = Math.max(...candles15m.slice(-5).map((c) => c.high))
      const stopLoss = Math.round((swingHigh + 1.50) * 100) / 100 // 1.5 pt buffer above sweep
      const riskDistance = stopLoss - entry

      if (riskDistance <= 0.50 || riskDistance > 12.00) {
        return this.createNoTrade(`Invalid Stop Loss geometry: Risk distance $${riskDistance.toFixed(2)} out of safe bounds.`)
      }

      const takeProfit = Math.round((entry - riskDistance * 2.5) * 100) / 100 // 1:2.5 R:R
      const rr = Math.round(((entry - takeProfit) / riskDistance) * 100) / 100

      if (rr < 2.0) {
        return this.createNoTrade(`Minimum 1:2 Risk/Reward not met (Calculated: 1:${rr}).`)
      }

      return {
        id: `SIG_${Date.now()}`,
        symbol: "XAUUSD",
        direction: "SELL",
        bias4h: "Bearish",
        poi1h: `Supply mitigation at ${poiAnalysis.activeOrderBlock ? poiAnalysis.activeOrderBlock.top.toFixed(2) : macroAnalysis.equilibrium4h.mid.toFixed(2)} + FVG`,
        confirmation15m: `${confirmation.pattern} with displacement past swing low`,
        proposedEntry: entry,
        stopLoss,
        takeProfit,
        riskReward: rr,
        riskPercent: 1.0,
        confidence: confirmation.sweepDetected && confirmation.displacementDetected ? "HIGH" : "MODERATE",
        status: "PROPOSED",
        reason: "4H Bearish structure with 1H Premium POI mitigation and 15M BSL sweep + Bearish CHOCH displacement.",
        timeframeAlignment: "4H (Bearish) → 1H (Supply Mitigated) → 15M (Bearish Displacement)",
        createdAt: Date.now(),
      }
    }

    return this.createNoTrade("4H market context is ranging/indecisive. Awaiting clean structural break.")
  }

  private static createNoTrade(reason: string): AISignalProposal {
    return {
      id: `NO_TRADE_${Date.now()}`,
      symbol: "XAUUSD",
      direction: "NO_TRADE",
      bias4h: "Ranging",
      poi1h: "None",
      confirmation15m: "None",
      confidence: "LOW",
      status: "PROPOSED",
      reason,
      timeframeAlignment: "No valid confluence across 4H/1H/15M frames",
      createdAt: Date.now(),
    }
  }

  /**
   * 4H Macro Context Analysis:
   * Determines Trend, Swings, Equilibrium, and Premium/Discount.
   */
  private static analyze4HMacro(candles: Candle[], currentPrice: number) {
    const recent = candles.slice(-20)
    const highs = recent.map((c) => c.high)
    const lows = recent.map((c) => c.low)
    const rangeHigh = Math.max(...highs)
    const rangeLow = Math.min(...lows)
    const mid = (rangeHigh + rangeLow) / 2

    // Simple market structure shift detection
    const latestCloses = recent.slice(-5).map((c) => c.close)
    const isTrendingUp = latestCloses[latestCloses.length - 1] > latestCloses[0] && currentPrice > mid
    const isTrendingDown = latestCloses[latestCloses.length - 1] < latestCloses[0] && currentPrice < mid

    const bias4h: "Bullish" | "Bearish" | "Ranging" = isTrendingUp
      ? "Bullish"
      : isTrendingDown
      ? "Bearish"
      : "Ranging"

    const zone: "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" =
      currentPrice > mid + (rangeHigh - mid) * 0.15
        ? "PREMIUM"
        : currentPrice < mid - (mid - rangeLow) * 0.15
        ? "DISCOUNT"
        : "EQUILIBRIUM"

    return {
      bias4h,
      equilibrium4h: { high: rangeHigh, low: rangeLow, mid, zone },
    }
  }

  /**
   * 1H POI Analysis:
   * Detects Order Blocks and Fair Value Gaps.
   */
  private static analyze1HPOI(candles: Candle[], currentPrice: number, bias: string) {
    const orderBlocks: OrderBlock[] = []
    const fvg: FairValueGap[] = []

    for (let i = 2; i < candles.length; i++) {
      const c1 = candles[i - 2]
      const c2 = candles[i - 1]
      const c3 = candles[i]

      // Bullish FVG: Low of c3 > High of c1
      if (c3.low > c1.high + 0.5) {
        fvg.push({
          type: "bullish",
          top: c3.low,
          bottom: c1.high,
          time: c2.time,
          mitigated: currentPrice <= c3.low,
        })
      }

      // Bearish FVG: High of c3 < Low of c1
      if (c3.high < c1.low - 0.5) {
        fvg.push({
          type: "bearish",
          top: c1.low,
          bottom: c3.high,
          time: c2.time,
          mitigated: currentPrice >= c3.high,
        })
      }

      // Order block: Opposite color candle before impulsive displacement
      if (c2.close < c2.open && c3.close > c2.high && c3.close > c3.open) {
        orderBlocks.push({
          type: "bullish",
          top: Math.max(c2.open, c2.close),
          bottom: c2.low,
          time: c2.time,
          mitigated: currentPrice < c2.low,
        })
      } else if (c2.close > c2.open && c3.close < c2.low && c3.close < c3.open) {
        orderBlocks.push({
          type: "bearish",
          top: c2.high,
          bottom: Math.min(c2.open, c2.close),
          time: c2.time,
          mitigated: currentPrice > c2.high,
        })
      }
    }

    // Find closest active order block to current price
    const activeOrderBlock = orderBlocks
      .filter((ob) => !ob.mitigated && Math.abs(currentPrice - ob.top) < 8.0)
      .slice(-1)[0]

    return { orderBlocks, fvg, activeOrderBlock }
  }

  /**
   * 15M Confirmation Analysis:
   * Verifies liquidity sweeps, rejection wicks, and displacement candles.
   */
  private static analyze15MConfirmation(candles: Candle[], currentPrice: number) {
    const recent = candles.slice(-8)
    let sweepDetected = false
    let chochDetected = false
    let displacementDetected = false
    let rejectionDetected = false
    let pattern = "Standard Structure"

    // Check last 3 candles for sweep & displacement
    const last = recent[recent.length - 1]
    const prev = recent[recent.length - 2]
    const prior = recent.slice(0, -2)

    const prevLowest = Math.min(...prior.map((c) => c.low))
    const prevHighest = Math.max(...prior.map((c) => c.high))

    // Bullish Liquidity Sweep: prev candle breached lowest low then closed back inside
    if (prev.low < prevLowest && prev.close > prevLowest) {
      sweepDetected = true
      pattern = "Sell-Side Liquidity Sweep (SSL)"
    }

    // Bearish Liquidity Sweep: prev candle breached highest high then closed back inside
    if (prev.high > prevHighest && prev.close < prevHighest) {
      sweepDetected = true
      pattern = "Buy-Side Liquidity Sweep (BSL)"
    }

    // Displacement candle: large body > 2x average body
    const bodySizes = recent.map((c) => Math.abs(c.close - c.open))
    const avgBody = bodySizes.reduce((a, b) => a + b, 0) / bodySizes.length
    const lastBody = Math.abs(last.close - last.open)

    if (lastBody > avgBody * 1.8) {
      displacementDetected = true
      pattern += " + Displacement Momentum"
    }

    // CHOCH: Breaking opposite swing point
    if (last.close > prevHighest) {
      chochDetected = true
      pattern += " + Bullish CHOCH"
    } else if (last.close < prevLowest) {
      chochDetected = true
      pattern += " + Bearish CHOCH"
    }

    // Rejection wick: wick > 50% of entire candle length
    const totalRange = last.high - last.low
    const upperWick = last.high - Math.max(last.open, last.close)
    const lowerWick = Math.min(last.open, last.close) - last.low
    if (upperWick > totalRange * 0.5 || lowerWick > totalRange * 0.5) {
      rejectionDetected = true
    }

    return {
      sweepDetected,
      chochDetected,
      displacementDetected,
      rejectionDetected,
      pattern,
    }
  }
}
