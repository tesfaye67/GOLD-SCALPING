// TDR GOLD TREADER - Economic News Calendar & Blackout Filter Service
import { memoryStore, isDbConnected, prisma } from "../db"

export interface EconomicEventDTO {
  id: string
  title: string
  country: string
  impact: "HIGH" | "MEDIUM" | "LOW"
  scheduledTime: string
  actual?: string
  forecast?: string
  previous?: string
  blocksTrading: boolean
}

export class NewsService {
  /**
   * Retrieves high-impact economic news events relevant to XAU/USD.
   */
  public static async getEvents(): Promise<EconomicEventDTO[]> {
    if (isDbConnected()) {
      const events = await prisma.newsEvent.findMany({
        orderBy: { scheduledTime: "asc" },
      })
      return events.map((e) => ({
        id: e.id,
        title: e.title,
        country: e.country,
        impact: e.impact,
        scheduledTime: e.scheduledTime.toISOString(),
        actual: e.actual || undefined,
        forecast: e.forecast || undefined,
        previous: e.previous || undefined,
        blocksTrading: e.blocksTrading,
      }))
    } else {
      return memoryStore.newsEvents.sort(
        (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      )
    }
  }

  /**
   * Evaluates whether a high-impact news blackout window is currently active.
   * If an event is scheduled within +/- blackoutWindowMinutes, returns true.
   */
  public static async isNewsBlackoutActive(blackoutWindowMinutes = 30): Promise<{ active: boolean; eventTitle?: string }> {
    const events = await this.getEvents()
    const now = Date.now()
    const windowMs = blackoutWindowMinutes * 60 * 1000

    for (const ev of events) {
      if (ev.impact === "HIGH" && ev.blocksTrading) {
        const eventTime = new Date(ev.scheduledTime).getTime()
        const diffMs = Math.abs(now - eventTime)

        if (diffMs <= windowMs) {
          return { active: true, eventTitle: ev.title }
        }
      }
    }

    return { active: false }
  }
}
