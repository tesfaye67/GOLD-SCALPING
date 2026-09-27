// TDR GOLD TREADER - Primary Backend Server (REST API & WebSockets)
import express, { Request, Response, NextFunction } from "express"
import http from "http"
import { WebSocketServer, WebSocket } from "ws"
import cors from "cors"
import { initDatabaseConnection, memoryStore, isDbConnected, prisma } from "./db"
import { AuthService } from "./services/authService"
import { LedgerService } from "./services/ledgerService"
import { MarketDataService } from "./services/marketDataService"
import { AIPricActionEngine } from "./services/aiEngine"
import { DeterministicRiskEngine } from "./services/riskEngine"
import { BrokerManager } from "./services/brokerAdapter"
import { NewsService } from "./services/newsService"
import type { Timeframe } from "./types"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// ─── Middleware: Auth & Role Guards ─────────────────────────────────────────

function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication token required." })
  }
  const token = authHeader.split(" ")[1]
  const user = AuthService.verifyToken(token)
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token." })
  }
  ;(req as any).user = user
  next()
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Access denied: Administrator privileges required." })
  }
  next()
}

// ─── Health & Status ────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    platform: "TDR GOLD TREADER",
    database: isDbConnected() ? "PostgreSQL (Prisma)" : "In-Memory Engine",
    marketFeed: MarketDataService.isDataStale() ? "STALE" : "LIVE",
    timestamp: new Date().toISOString(),
  })
})

// ─── Authentication Routes ──────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password, and full name are required." })
    }
    const session = await AuthService.register({ email, password, fullName, role })
    res.json(session)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email) {
      return res.status(400).json({ error: "Email address is required." })
    }
    const session = await AuthService.login(email, password)
    res.json(session)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

app.get("/api/auth/me", authenticateJWT, (req, res) => {
  res.json((req as any).user)
})

// ─── Wallet & Double-Entry Ledger Routes ────────────────────────────────────

app.get("/api/wallet/summary", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const summary = await LedgerService.getWalletSummary(userId)
    res.json(summary)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/wallet/ledger", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const entries = await LedgerService.getUserLedger(userId)
    res.json(entries)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/crypto-networks", async (req, res) => {
  if (isDbConnected()) {
    const networks = await prisma.cryptoNetwork.findMany({ where: { isEnabled: true } })
    res.json(networks)
  } else {
    res.json(memoryStore.cryptoNetworks.filter((n) => n.isEnabled))
  }
})

app.post("/api/deposits/submit", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { cryptoNetworkId, amount, txHash, proofUrl } = req.body
    const deposit = await LedgerService.submitDeposit({
      userId,
      cryptoNetworkId,
      amount: parseFloat(amount),
      txHash,
      proofUrl,
    })
    res.json(deposit)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/withdrawals/request", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { cryptoNetworkId, amount, destinationAddress } = req.body
    const withdrawal = await LedgerService.requestWithdrawal({
      userId,
      cryptoNetworkId,
      amount: parseFloat(amount),
      destinationAddress,
    })
    res.json(withdrawal)
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── Market & AI Engine Routes ──────────────────────────────────────────────

app.get("/api/market/tick", (req, res) => {
  res.json(MarketDataService.getCurrentTick())
})

app.get("/api/market/candles", (req, res) => {
  const tf = (req.query.tf as Timeframe) || "15m"
  res.json(MarketDataService.getCandles(tf))
})

app.get("/api/market/news", async (req, res) => {
  try {
    const events = await NewsService.getEvents()
    res.json(events)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/api/ai/signal", async (req, res) => {
  try {
    const candles4h = MarketDataService.getCandles("4h")
    const candles1h = MarketDataService.getCandles("1h")
    const candles15m = MarketDataService.getCandles("15m")
    const tick = MarketDataService.getCurrentTick()

    const signal = AIPricActionEngine.analyze(candles4h, candles1h, candles15m, tick)
    res.json(signal)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Trading & Execution Engine Routes ──────────────────────────────────────

app.get("/api/trading/account", authenticateJWT, async (req, res) => {
  const userId = (req as any).user.id
  const mode = (req.query.mode as "DEMO" | "LIVE") || "DEMO"
  const adapter = BrokerManager.getAdapter(userId, mode)
  const summary = await adapter.getAccount()
  res.json(summary)
})

app.get("/api/trading/positions", authenticateJWT, async (req, res) => {
  const userId = (req as any).user.id
  const mode = (req.query.mode as "DEMO" | "LIVE") || "DEMO"
  const adapter = BrokerManager.getAdapter(userId, mode)
  const positions = await adapter.getPositions()
  res.json(positions)
})

app.post("/api/trading/execute", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const mode = (req.body.mode as "DEMO" | "LIVE") || "DEMO"
    const proposal = req.body.proposal

    if (!proposal || !proposal.direction || proposal.direction === "NO_TRADE") {
      return res.status(400).json({ error: "Cannot execute an invalid or NO_TRADE signal." })
    }

    const adapter = BrokerManager.getAdapter(userId, mode)
    const accountSummary = await adapter.getAccount()
    const openPositions = await adapter.getPositions()
    const currentTick = MarketDataService.getCurrentTick()
    const newsStatus = await NewsService.isNewsBlackoutActive(30)

    // Run through Deterministic Risk Engine Gate
    const riskCheck = await DeterministicRiskEngine.evaluateTradeProposal(
      proposal,
      {
        equity: accountSummary.equity,
        balance: accountSummary.balance,
        peakEquity: accountSummary.balance,
        todayLossUSD: 0,
        todayTradesCount: 1,
        weekLossUSD: 0,
        consecutiveLosses: 0,
        openPositionsCount: openPositions.length,
        isLocked: false,
      },
      currentTick,
      openPositions,
      newsStatus.active
    )

    if (!riskCheck.allowed) {
      return res.status(422).json({
        success: false,
        error: riskCheck.rejectionReason,
        circuitBreakerActive: riskCheck.circuitBreakerActive,
      })
    }

    // Risk approved -> forward to Broker Adapter
    const orderResult = await adapter.placeOrder({
      symbol: "XAUUSD",
      side: proposal.direction,
      type: "MARKET",
      lots: riskCheck.lotSize,
      price: proposal.proposedEntry,
      sl: proposal.stopLoss,
      tp: proposal.takeProfit,
      comment: `TDR-AI [${proposal.confidence}]`,
    })

    res.json({
      success: true,
      riskEvaluation: riskCheck,
      execution: orderResult,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post("/api/trading/close/:id", authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user.id
    const mode = (req.query.mode as "DEMO" | "LIVE") || "DEMO"
    const positionId = req.params.id

    const adapter = BrokerManager.getAdapter(userId, mode)
    const result = await adapter.closeOrder(positionId)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin Panel Routes ─────────────────────────────────────────────────────

app.get("/api/admin/metrics", authenticateJWT, requireAdmin, async (req, res) => {
  let totalUsers = 2
  let pendingDepositsCount = 0
  let pendingDepositsAmount = 0
  let verifiedDepositsAmount = 0

  if (isDbConnected()) {
    totalUsers = await prisma.user.count()
    const pendingDeps = await prisma.deposit.findMany({ where: { status: "PENDING_VERIFICATION" } })
    pendingDepositsCount = pendingDeps.length
    pendingDepositsAmount = pendingDeps.reduce((sum, d) => sum + Number(d.amount), 0)

    const verifiedDeps = await prisma.ledgerTransaction.aggregate({
      where: { type: "DEPOSIT", status: "VERIFIED" },
      _sum: { amount: true },
    })
    verifiedDepositsAmount = Number(verifiedDeps._sum.amount || 0)
  } else {
    totalUsers = memoryStore.users.size
    const pending = memoryStore.deposits.filter((d) => d.status === "PENDING_VERIFICATION")
    pendingDepositsCount = pending.length
    pendingDepositsAmount = pending.reduce((sum, d) => sum + Number(d.amount), 0)
    verifiedDepositsAmount = memoryStore.ledger
      .filter((tx) => tx.type === "DEPOSIT" && tx.status === "VERIFIED")
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
  }

  const killSwitch = await DeterministicRiskEngine.isGlobalKillSwitchActive()

  res.json({
    totalUsers,
    pendingDepositsCount,
    pendingDepositsAmount,
    verifiedDepositsAmount,
    globalKillSwitch: killSwitch,
    marketDataStatus: MarketDataService.isDataStale() ? "STALE" : "LIVE",
    brokerStatus: "CONNECTED",
    timestamp: new Date().toISOString(),
  })
})

app.get("/api/admin/deposits/pending", authenticateJWT, requireAdmin, async (req, res) => {
  if (isDbConnected()) {
    const deps = await prisma.deposit.findMany({
      where: { status: "PENDING_VERIFICATION" },
      include: { user: true, cryptoNetwork: true },
      orderBy: { createdAt: "desc" },
    })
    res.json(deps)
  } else {
    const deps = memoryStore.deposits.filter((d) => d.status === "PENDING_VERIFICATION")
    res.json(deps)
  }
})

app.post("/api/admin/deposits/approve", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user.id
    const { depositId, notes } = req.body
    const result = await LedgerService.approveDeposit(depositId, adminId, notes)
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/admin/deposits/reject", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user.id
    const { depositId, reason } = req.body
    const result = await LedgerService.rejectDeposit(depositId, adminId, reason)
    res.json({ success: true, deposit: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

app.post("/api/admin/kill-switch", authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const adminId = (req as any).user.id
    const { active, reason } = req.body
    const state = await DeterministicRiskEngine.setGlobalKillSwitch(
      active,
      adminId,
      reason || "Manual toggle by administrator"
    )
    res.json({ success: true, isGlobalKillSwitchActive: state })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── WebSocket Server (Real-Time Price & Position Broadcasting) ─────────────

wss.on("connection", (ws: WebSocket) => {
  // Send immediate initial tick
  ws.send(JSON.stringify({ type: "TICK", data: MarketDataService.getCurrentTick() }))
})

MarketDataService.subscribe((tick) => {
  const payload = JSON.stringify({ type: "TICK", data: tick })
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload)
      } catch {}
    }
  })
})

// ─── Server Startup ─────────────────────────────────────────────────────────

async function startServer() {
  await initDatabaseConnection()
  await MarketDataService.init()

  server.listen(PORT, () => {
    console.log(`🚀 [TDR GOLD TREADER] Backend server running on http://localhost:${PORT}`)
    console.log(`📡 [TDR GOLD TREADER] WebSocket stream online on ws://localhost:${PORT}`)
  })
}

startServer().catch(console.error)
