// TDR GOLD TREADER - Deterministic Institutional Risk Engine & Circuit Breakers
import type { AISignalProposal, RiskEvaluationResult, MarketTick, BrokerPosition } from "../types"
import { memoryStore, isDbConnected, prisma } from "../db"

export interface AccountRiskState {
  equity: number
  balance: number
  peakEquity: number
  todayLossUSD: number
  todayTradesCount: number
  weekLossUSD: number
  consecutiveLosses: number
  openPositionsCount: number
  isLocked: boolean
  lockReason?: string
}

export class DeterministicRiskEngine {
  // XAU/USD Contract Specification: 1 standard lot = 100 troy ounces
  public static readonly CONTRACT_SIZE_OUNCES = 100

  /**
   * Evaluates an AI trade proposal against deterministic institutional risk rules.
   * AI can NEVER bypass or override this evaluation.
   */
  public static async evaluateTradeProposal(
    proposal: AISignalProposal,
    accountState: AccountRiskState,
    currentTick: MarketTick,
    openPositions: BrokerPosition[],
    isNewsBlackoutActive: boolean
  ): Promise<RiskEvaluationResult> {
    const warnings: string[] = []

    // 1. Check Global Admin Kill Switch
    const killSwitch = await this.isGlobalKillSwitchActive()
    if (killSwitch) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: "ADMIN GLOBAL KILL SWITCH ACTIVE: All new trades suspended by administrator.",
        warnings: ["Global Kill Switch active"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    }

    // 2. Check Account Lock Status
    if (accountState.isLocked) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Account is locked: ${accountState.lockReason || "Risk violation lock"}. Manual admin review required.`,
        warnings: ["Account locked"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    }

    // 3. Signal Direction Check
    if (proposal.direction === "NO_TRADE") {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `AI Engine returned NO_TRADE: ${proposal.reason}`,
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: false,
      }
    }

    // 4. Maximum Open Positions Rule (Default: Max 2)
    if (openPositions.length >= 2) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Maximum open positions limit reached (${openPositions.length}/2).`,
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: false,
      }
    }

    // 5. Maximum Daily Trades Rule (Default: Max 5)
    if (accountState.todayTradesCount >= 5) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Daily trade frequency limit reached (${accountState.todayTradesCount}/5 trades today).`,
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: false,
      }
    }

    // 6. Maximum Daily Loss Circuit Breaker (Default: 2% of equity)
    const dailyLossPercent = (accountState.todayLossUSD / accountState.equity) * 100
    if (dailyLossPercent >= 2.0) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `DAILY LOSS CIRCUIT BREAKER: Account lost ${dailyLossPercent.toFixed(2)}% today (limit: 2.00%). TRADING HALTED.`,
        warnings: ["Daily loss limit breached"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    }

    // 7. Maximum Weekly Loss Circuit Breaker (Default: 5% of equity)
    const weeklyLossPercent = (accountState.weekLossUSD / accountState.equity) * 100
    if (weeklyLossPercent >= 5.0) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `WEEKLY LOSS CIRCUIT BREAKER: Account lost ${weeklyLossPercent.toFixed(2)}% this week (limit: 5.00%). TRADING PAUSED.`,
        warnings: ["Weekly loss limit breached"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    }

    // 8. Total Maximum Account Drawdown Circuit Breaker (Default: 10%)
    const drawdownPercent =
      accountState.peakEquity > 0
        ? ((accountState.peakEquity - accountState.equity) / accountState.peakEquity) * 100
        : 0

    if (drawdownPercent >= 10.0) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `EMERGENCY DRAWDOWN LOCK: Account reached ${drawdownPercent.toFixed(2)}% drawdown (limit: 10.00%). EMERGENCY RISK LOCK.`,
        warnings: ["Maximum Drawdown breached"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    }

    // 9. Consecutive-Loss Protection Rule (Section 14)
    // 1 loss: Normal risk (1%)
    // 2 consecutive losses: Cut risk to 0.5%
    // 3 consecutive losses: STOP NEW TRADES
    let adjustedRiskPercent = 1.0 // standard default

    if (accountState.consecutiveLosses >= 3) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `CONSECUTIVE LOSS HALT: 3 consecutive losses reached. Trading stopped for mandatory cooldown.`,
        warnings: ["Consecutive loss limit reached"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent: 0,
        circuitBreakerActive: true,
      }
    } else if (accountState.consecutiveLosses === 2) {
      adjustedRiskPercent = 0.50
      warnings.push("Consecutive loss protection: Risk reduced from 1.00% to 0.50%")
    }

    // 10. High-Impact News Filter Check (Section 22)
    if (isNewsBlackoutActive) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: "NEWS FILTER ACTIVE: High-impact USD economic event in progress. Trading blocked.",
        warnings: ["Economic news blackout active"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    // 11. Spread & Slippage Protection
    if (currentTick.spread > 2.50) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `SPREAD EXCEEDED: Current spread $${currentTick.spread.toFixed(2)} exceeds maximum tolerance $2.50.`,
        warnings: ["Excessive spread"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    // 12. Stop Loss & Take Profit Geometry Verification
    if (!proposal.proposedEntry || !proposal.stopLoss || !proposal.takeProfit) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: "Missing Stop Loss or Take Profit parameters in trade proposal.",
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    const priceDistance = Math.abs(proposal.proposedEntry - proposal.stopLoss)
    if (priceDistance <= 0.50) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Invalid Stop Loss distance ($${priceDistance.toFixed(2)}): Below minimum execution buffer.`,
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    // 13. Minimum 1:2 Risk/Reward Ratio Enforcement
    const profitDistance = Math.abs(proposal.takeProfit - proposal.proposedEntry)
    const calculatedRR = profitDistance / priceDistance

    if (calculatedRR < 2.0) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Minimum 1:2 Risk/Reward ratio required. (Calculated: 1:${calculatedRR.toFixed(2)}).`,
        warnings,
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    // 14. Dynamic Lot Size Calculation from Account Equity
    // Formula:
    // Risk Amount (USD) = Equity * (adjustedRiskPercent / 100)
    // Loss per 1.0 Lot = priceDistance * 100 oz
    // Lot Size = Risk Amount / (priceDistance * 100)
    const riskAmountUSD = (accountState.equity * (adjustedRiskPercent / 100))
    const lossPerLot = priceDistance * this.CONTRACT_SIZE_OUNCES
    let rawLots = riskAmountUSD / lossPerLot

    // Round to 2 decimal places (standard micro-lot precision 0.01)
    rawLots = Math.round(rawLots * 100) / 100
    // Enforce broker minimum lot size (0.01) and maximum safety cap per trade (5.00 lots)
    const finalLotSize = Math.max(0.01, Math.min(5.00, rawLots))

    // 15. Margin Availability Verification
    // Approximate margin requirement at 1:100 leverage for XAU/USD = (Lots * 100 * Entry) / 100 = Lots * Entry
    const requiredMargin = finalLotSize * proposal.proposedEntry
    if (requiredMargin > accountState.equity * 0.70) {
      return {
        allowed: false,
        lotSize: 0,
        riskAmountUSD: 0,
        rejectionReason: `Insufficient free margin for ${finalLotSize} lots. Margin required: $${requiredMargin.toFixed(2)}.`,
        warnings: ["Margin threshold breach"],
        consecutiveLosses: accountState.consecutiveLosses,
        adjustedRiskPercent,
        circuitBreakerActive: false,
      }
    }

    // ALL CHECKS PASSED DETERMINISTICALLY!
    return {
      allowed: true,
      lotSize: finalLotSize,
      riskAmountUSD: Math.round(riskAmountUSD * 100) / 100,
      warnings,
      consecutiveLosses: accountState.consecutiveLosses,
      adjustedRiskPercent,
      circuitBreakerActive: false,
    }
  }

  public static async isGlobalKillSwitchActive(): Promise<boolean> {
    if (isDbConnected()) {
      const settings = await prisma.riskSettings.findUnique({ where: { id: "global" } })
      return settings?.isGlobalKillSwitchActive || false
    } else {
      return memoryStore.riskSettings.isGlobalKillSwitchActive || false
    }
  }

  public static async setGlobalKillSwitch(active: boolean, adminId: string, reason: string): Promise<boolean> {
    if (isDbConnected()) {
      await prisma.riskSettings.update({
        where: { id: "global" },
        data: { isGlobalKillSwitchActive: active },
      })
      await prisma.adminAction.create({
        data: {
          adminId,
          actionType: active ? "KILL_SWITCH_ENGAGED" : "KILL_SWITCH_DISENGAGED",
          reason,
        },
      })
    } else {
      memoryStore.riskSettings.isGlobalKillSwitchActive = active
      memoryStore.auditLogs.unshift({
        actorId: adminId,
        action: active ? "KILL_SWITCH_ENGAGED" : "KILL_SWITCH_DISENGAGED",
        reason,
        createdAt: new Date().toISOString(),
      })
    }
    return active
  }
}
