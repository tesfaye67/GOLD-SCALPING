import type { TimezoneKey, TimezoneOption } from "../types"

export const TIMEZONES: TimezoneOption[] = [
  { key: "Africa/Addis_Ababa", label: "Addis Ababa", offset: "UTC+3" },
  { key: "UTC", label: "UTC", offset: "UTC+0" },
  { key: "America/New_York", label: "New York", offset: "UTC-5" },
  { key: "Europe/London", label: "London", offset: "UTC+0" },
  { key: "Asia/Tokyo", label: "Tokyo", offset: "UTC+9" },
  { key: "Broker", label: "Broker Server", offset: "EET" },
]

export const DEFAULT_TIMEZONE: TimezoneKey = "Africa/Addis_Ababa"

/**
 * Format a timestamp into the selected timezone string.
 * Uses Intl.DateTimeFormat for correct offset handling — no manual math.
 */
export function formatInTimezone(
  timestamp: number,
  tz: TimezoneKey,
  opts: { date?: boolean; time?: boolean; seconds?: boolean } = {}
): string {
  const resolved = tz === "Broker" ? "Africa/Addis_Ababa" : tz
  const { date = true, time = true, seconds = false } = opts
  const d = new Date(timestamp)

  const parts: string[] = []

  if (date) {
    parts.push(
      d.toLocaleDateString("en-GB", {
        timeZone: resolved,
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    )
  }

  if (time) {
    parts.push(
      d.toLocaleTimeString("en-GB", {
        timeZone: resolved,
        hour: "2-digit",
        minute: "2-digit",
        second: seconds ? "2-digit" : undefined,
        hour12: false,
      })
    )
  }

  return parts.join(" ")
}

/**
 * Get the UTC offset label for a timezone key.
 */
export function getOffsetLabel(tz: TimezoneKey): string {
  if (tz === "Broker") return "EET (UTC+3)"
  const found = TIMEZONES.find((t) => t.key === tz)
  return found ? found.offset : "UTC+0"
}

/**
 * Return the display label for a timezone key.
 */
export function getTimezoneLabel(tz: TimezoneKey): string {
  const found = TIMEZONES.find((t) => t.key === tz)
  return found ? `${found.label} (${found.offset})` : tz
}

/**
 * Convert a Date to the hour in a given timezone (0-23).
 */
export function getHourInTimezone(date: Date, tz: TimezoneKey): number {
  const resolved = tz === "Broker" ? "Africa/Addis_Ababa" : tz
  const str = date.toLocaleTimeString("en-GB", {
    timeZone: resolved,
    hour: "2-digit",
    hour12: false,
  })
  return parseInt(str, 10)
}
