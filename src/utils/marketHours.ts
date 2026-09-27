// TDR GOLD TREADER - Real Institutional Forex/Gold Market Hours & Weekend Holding Engine
// Reference: Exness XAU/USD Trading Hours Schedule

export interface MarketHoursInfo {
  isOpen: boolean
  isWeekend: boolean
  isDailyBreak: boolean
  status: "OPEN" | "WEEKEND_CLOSED" | "DAILY_BREAK"
  statusLabel: string
  nextEventLabel: string
  countdownText: string
  canExecuteInstantOrder: boolean
  reason: string
}

/**
 * Calculates current market status for XAU/USD (Gold).
 * 
 * Standard Institutional Market Hours (Exness / Interbank Gold):
 * - Opens: Sunday 22:00 UTC (Tokyo/Sydney Open)
 * - Closes: Friday 22:00 UTC (New York Close)
 * - Daily Maintenance/Rollover Break: Monday - Thursday 21:00 UTC to 22:00 UTC
 * - Weekend Closed: Friday 22:00 UTC through Sunday 22:00 UTC
 */
export function getMarketHoursInfo(forcedOverride?: boolean): MarketHoursInfo {
  if (forcedOverride === true) {
    return {
      isOpen: true,
      isWeekend: false,
      isDailyBreak: false,
      status: "OPEN",
      statusLabel: "SIMULATION (OVERRIDE ACTIVE)",
      nextEventLabel: "Weekend Simulation Active",
      countdownText: "00h 00m",
      canExecuteInstantOrder: true,
      reason: "Manual operator weekend simulation override is active.",
    }
  }

  const now = new Date()
  const day = now.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  const hour = now.getUTCHours()
  const minute = now.getUTCMinutes()
  const currentUtcMinutes = hour * 60 + minute

  let isOpen = true
  let isWeekend = false
  let isDailyBreak = false
  let status: "OPEN" | "WEEKEND_CLOSED" | "DAILY_BREAK" = "OPEN"
  let statusLabel = "MARKET OPEN"
  let nextEventLabel = "Closes Friday 22:00 UTC"
  let reason = "Gold market is actively trading with live institutional liquidity."
  let msUntilNextEvent = 0

  // 1. Check Weekend Closure
  // Friday after 22:00 UTC
  if (day === 5 && currentUtcMinutes >= 22 * 60) {
    isOpen = false
    isWeekend = true
    status = "WEEKEND_CLOSED"
  }
  // All day Saturday
  else if (day === 6) {
    isOpen = false
    isWeekend = true
    status = "WEEKEND_CLOSED"
  }
  // Sunday before 22:00 UTC
  else if (day === 0 && currentUtcMinutes < 22 * 60) {
    isOpen = false
    isWeekend = true
    status = "WEEKEND_CLOSED"
  }
  // 2. Check Daily Settlement Break (Mon-Thu 21:00 - 22:00 UTC)
  else if (day >= 1 && day <= 4 && currentUtcMinutes >= 21 * 60 && currentUtcMinutes < 22 * 60) {
    isOpen = false
    isDailyBreak = true
    status = "DAILY_BREAK"
  }

  // Calculate Countdown to Next Event
  if (isWeekend) {
    statusLabel = "MARKET CLOSED (WEEKEND)"
    nextEventLabel = "Re-opens Sunday 22:00 UTC"
    reason =
      "Gold (XAU/USD) market is offline for the weekend. Open positions are held by broker until market opens."

    // Target is next Sunday 22:00 UTC
    const targetSunday = new Date(now)
    let daysUntilSunday = (7 - day) % 7
    if (daysUntilSunday === 0 && currentUtcMinutes >= 22 * 60) {
      daysUntilSunday = 7
    }
    targetSunday.setUTCDate(now.getUTCDate() + daysUntilSunday)
    targetSunday.setUTCHours(22, 0, 0, 0)
    msUntilNextEvent = Math.max(0, targetSunday.getTime() - now.getTime())
  } else if (isDailyBreak) {
    statusLabel = "DAILY ROLLOVER BREAK"
    nextEventLabel = "Re-opens at 22:00 UTC"
    reason = "Daily 1-hour interbank settlement break. Resumes in minutes."

    const targetReopen = new Date(now)
    targetReopen.setUTCHours(22, 0, 0, 0)
    msUntilNextEvent = Math.max(0, targetReopen.getTime() - now.getTime())
  } else {
    // Market is open. Calculate time until Friday 22:00 UTC close
    statusLabel = "MARKET OPEN (LIVE)"
    nextEventLabel = "Closes Friday 22:00 UTC"

    const targetFriday = new Date(now)
    const daysUntilFriday = (5 - day + 7) % 7
    targetFriday.setUTCDate(now.getUTCDate() + daysUntilFriday)
    targetFriday.setUTCHours(22, 0, 0, 0)
    msUntilNextEvent = Math.max(0, targetFriday.getTime() - now.getTime())
  }

  const totalMinutes = Math.floor(msUntilNextEvent / (1000 * 60))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const mins = totalMinutes % 60

  const countdownText =
    days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`

  return {
    isOpen,
    isWeekend,
    isDailyBreak,
    status,
    statusLabel,
    nextEventLabel,
    countdownText,
    canExecuteInstantOrder: isOpen,
    reason,
  }
}

const WEEKEND_SIM_KEY = "tdr_weekend_sim_override"

export function isWeekendSimulationActive(): boolean {
  try {
    return localStorage.getItem(WEEKEND_SIM_KEY) === "true"
  } catch {
    return false
  }
}

export function setWeekendSimulationActive(active: boolean): void {
  try {
    localStorage.setItem(WEEKEND_SIM_KEY, active ? "true" : "false")
  } catch {}
}

