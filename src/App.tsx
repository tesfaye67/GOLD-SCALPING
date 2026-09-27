// TDR GOLD TREADER - Production Multi-User AI XAU/USD Platform with User Dashboards & Exness Gateway
import { useState, useEffect, useCallback } from "react"
import { Toaster, toast } from "sonner"
import type {
  MarketTick,
  Timeframe,
  PaperAccount,
  TradePosition,
  TradeJournalEntry,
  AISignal,
  BrokerMode,
  SMCAnalysis,
  DataIntegrityState,
  TimezoneKey,
  UserProfile,
  WalletSummary,
  CryptoNetwork,
  DepositRecord,
  WithdrawalRecord,
  LedgerEntry,
  RiskSettings,
  BrokerConnectionState,
  EconomicEvent,
} from "./types"
import {
  initMarketFeed,
  subscribeToTicks,
  getCurrentTick,
  loadAccount,
  savePositions,
  resetPaperAccount,
  getCandles,
  detectSMCStructures,
  getDataIntegrityState,
} from "./data/marketService"
import {
  getCurrentUser,
  getAllUsers,
  getUserWallet,
  saveUserWallet,
  getUserLedger,
  saveUserLedger,
  getUserDeposits,
  saveUserDeposits,
  getAllPendingDepositsAcrossUsers,
  getUserWithdrawals,
  saveUserWithdrawals,
  getAllPendingWithdrawalsAcrossUsers,
  getUserPositions,
  saveUserPositions,
  getUserTrades,
  saveUserTrades,
  assignExnessAccountToUser,
  getStoredTheme,
  saveStoredTheme,
  getStoredCryptoNetworks,
  saveStoredCryptoNetworks,
  setCurrentUserSession,
  logoutCurrentUser,
  saveAllUsers,
  DEFAULT_EXNESS_ACCOUNT,
  DEFAULT_EXNESS_SERVER,
} from "./data/userStorage"
import { MarketHeader } from "./components/MarketHeader"
import { TradingViewChart } from "./components/TradingViewChart"
import { TradingPanel } from "./components/TradingPanel"
import { TerminalDock } from "./components/TerminalDock"
import { WalletModal } from "./components/WalletModal"
import { AdminPanel } from "./components/AdminPanel"
import { AuthModal } from "./components/AuthModal"
import { TradingAccountModal } from "./components/TradingAccountModal"
import { AICopilotDrawer } from "./components/AICopilotDrawer"
import { PublicLanding } from "./components/PublicLanding"
import { ChartLine, Lightning, ListBullets } from "@phosphor-icons/react"
import { DEFAULT_TIMEZONE } from "./utils/timezone"
import { getMarketHoursInfo, isWeekendSimulationActive } from "./utils/marketHours"

export default function App() {
  // ─── Market & Tick Feed ───────────────────────────────────────────────────
  const [tick, setTick] = useState<MarketTick>(getCurrentTick())
  const [prevPrice, setPrevPrice] = useState(tick.price)
  const [timeframe, setTimeframe] = useState<Timeframe>("15m")
  const [timezone, setTimezone] = useState<TimezoneKey>(DEFAULT_TIMEZONE)
  const [smcAnalysis, setSmcAnalysis] = useState<SMCAnalysis | null>(null)
  const [integrity, setIntegrity] = useState<DataIntegrityState>(getDataIntegrityState())

  // ─── Theme State (Dark vs Light) ──────────────────────────────────────────
  const [theme, setTheme] = useState<"dark" | "light">(getStoredTheme())

  useEffect(() => {
    saveStoredTheme(theme)
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.remove("dark")
      document.documentElement.classList.add("light")
    }
  }, [theme])

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  // ─── Multi-User State & Active Session ────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getCurrentUser())
  const [allUsers, setAllUsers] = useState<UserProfile[]>(getAllUsers())

  // Load active user's scoped wallet (Strict rule: brand new users start at $0.00!)
  const [walletSummary, setWalletSummary] = useState<WalletSummary>(() => {
    const user = getCurrentUser()
    return user ? getUserWallet(user.id) : {
      walletId: "wal_guest",
      userId: "guest",
      currency: "USDT",
      verifiedBalance: 0.00,
      pendingDeposits: 0.00,
      pendingWithdrawals: 0.00,
      tradingAllocation: 0.00,
      availableBalance: 0.00,
    }
  })

  // Load user's scoped trading positions & records
  const [positions, setPositions] = useState<TradePosition[]>(() => {
    const user = getCurrentUser()
    return user ? getUserPositions(user.id) : []
  })

  const [closedTrades, setClosedTrades] = useState<TradeJournalEntry[]>(() => {
    const user = getCurrentUser()
    return user ? getUserTrades(user.id) : []
  })

  const [ledger, setLedger] = useState<LedgerEntry[]>(() => {
    const user = getCurrentUser()
    return user ? getUserLedger(user.id) : []
  })

  const [deposits, setDeposits] = useState<DepositRecord[]>(() => {
    const user = getCurrentUser()
    return user ? getUserDeposits(user.id) : []
  })

  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => {
    const user = getCurrentUser()
    return user ? getUserWithdrawals(user.id) : []
  })

  const [authInitialMode, setAuthInitialMode] = useState<"signin" | "signup">("signin")
  const [mobileTab, setMobileTab] = useState<"chart" | "trade" | "positions">("chart")

  // Synchronize user-scoped state when currentUser changes
  const switchUserData = useCallback((user: UserProfile | null) => {
    setCurrentUser(user)
    setAllUsers(getAllUsers())
    if (user) {
      setCurrentUserSession(user.id)
      const w = getUserWallet(user.id)
      setWalletSummary(w)
      setPositions(getUserPositions(user.id))
      setClosedTrades(getUserTrades(user.id))
      setLedger(getUserLedger(user.id))
      setDeposits(getUserDeposits(user.id))
      setWithdrawals(getUserWithdrawals(user.id))
      if (user.accountType === "DEMO") {
        setBrokerMode("DEMO")
        const bal = user.demoBalance || 10000
        setAccount({
          balance: bal,
          equity: bal,
          marginUsed: 0,
          freeMargin: bal,
        })
      } else if (user.accountType === "LIVE") {
        setBrokerMode("LIVE")
        const bal = w.availableBalance || 0
        setAccount({
          balance: bal,
          equity: bal,
          marginUsed: 0,
          freeMargin: bal,
        })
      }
    } else {
      logoutCurrentUser()
      setPositions([])
      setClosedTrades([])
      setLedger([])
      setDeposits([])
      setWithdrawals([])
      setWalletSummary({
        walletId: "wal_guest",
        userId: "guest",
        currency: "USDT",
        verifiedBalance: 0.00,
        pendingDeposits: 0.00,
        pendingWithdrawals: 0.00,
        tradingAllocation: 0.00,
        availableBalance: 0.00,
      })
      setAccount({
        balance: 10000,
        equity: 10000,
        marginUsed: 0,
        freeMargin: 10000,
      })
    }
  }, [])

  // ─── Broker Mode & Account State ──────────────────────────────────────────
  const [brokerMode, setBrokerMode] = useState<BrokerMode>("DEMO")
  const [account, setAccount] = useState<PaperAccount>(loadAccount())

  // Dynamic Broker Mode Switcher with Exact Balance Accounting
  const handleSwitchBrokerMode = useCallback((mode: BrokerMode) => {
    setBrokerMode(mode)
    if (mode === "LIVE") {
      const liveBal = walletSummary.availableBalance || 0
      setAccount({
        balance: liveBal,
        equity: liveBal,
        marginUsed: 0,
        freeMargin: liveBal,
      })
      if (liveBal === 0) {
        toast.info("Switched to LIVE: Real verified wallet balance is $0.00. Submit a USDT deposit to fund your account.")
      } else {
        toast.success(`Switched to LIVE: Trading with $${liveBal.toFixed(2)} USDT verified capital.`)
      }
    } else {
      const demoBal = currentUser?.demoBalance || 10000
      setAccount({
        balance: demoBal,
        equity: demoBal,
        marginUsed: 0,
        freeMargin: demoBal,
      })
      toast.info(`Switched to DEMO: Virtual practice capital is $${demoBal.toFixed(2)} USD.`)
    }
  }, [walletSummary.availableBalance, currentUser?.demoBalance])

  const [cryptoNetworks, setCryptoNetworks] = useState<CryptoNetwork[]>(() => getStoredCryptoNetworks())

  const handleUpdateCryptoNetwork = (updatedNet: CryptoNetwork) => {
    setCryptoNetworks((prev) => {
      const next = prev.map((n) => (n.id === updatedNet.id ? updatedNet : n))
      saveStoredCryptoNetworks(next)
      return next
    })
    toast.success(`Network ${updatedNet.name} address & parameters saved!`)
  }

  const handleAddCryptoNetwork = (newNet: CryptoNetwork) => {
    setCryptoNetworks((prev) => {
      const next = [...prev, newNet]
      saveStoredCryptoNetworks(next)
      return next
    })
    toast.success(`Registered new crypto gateway ${newNet.name}!`)
  }

  const handleDeleteCryptoNetwork = (netId: string) => {
    setCryptoNetworks((prev) => {
      const next = prev.filter((n) => n.id !== netId)
      saveStoredCryptoNetworks(next)
      return next
    })
    toast.info("Crypto gateway removed.")
  }

  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxRiskPerTrade: 1.00,
    maxDailyLossPercent: 2.00,
    maxWeeklyLossPercent: 5.00,
    maxTotalDrawdownPercent: 10.00,
    maxOpenPositions: 2,
    maxTradesPerDay: 5,
    minRiskReward: 2.00,
    consecutiveLossLimit: 3,
    isGlobalKillSwitchActive: false,
    newsFilterEnabled: true,
    newsWindowMinutes: 30,
    maxSpreadAllowed: 2.50,
  })

  const [brokerState] = useState<BrokerConnectionState>({
    id: "exness_01",
    name: "Exness MT5 Real Gateway",
    brokerType: "EXNESS",
    server: DEFAULT_EXNESS_SERVER,
    login: DEFAULT_EXNESS_ACCOUNT,
    status: "CONNECTED",
    balance: 10000.00,
    equity: 10000.00,
    lastSyncAt: Date.now(),
  })

  const [newsEvents] = useState<EconomicEvent[]>([
    {
      id: "news_1",
      title: "US FOMC Interest Rate Decision",
      country: "USD",
      impact: "HIGH",
      scheduledTime: Date.now() + 1000 * 60 * 60 * 36,
      forecast: "5.25%",
      previous: "5.50%",
      blocksTrading: true,
    },
    {
      id: "news_2",
      title: "US Non-Farm Payrolls (NFP)",
      country: "USD",
      impact: "HIGH",
      scheduledTime: Date.now() + 1000 * 60 * 60 * 96,
      forecast: "165K",
      previous: "142K",
      blocksTrading: true,
    },
    {
      id: "news_3",
      title: "US Consumer Price Index (CPI YoY)",
      country: "USD",
      impact: "HIGH",
      scheduledTime: Date.now() + 1000 * 60 * 60 * 160,
      forecast: "2.6%",
      previous: "2.9%",
      blocksTrading: true,
    },
  ])

  // ─── Modal Open States ────────────────────────────────────────────────────
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [tradingAccountModalOpen, setTradingAccountModalOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)

  // ─── Update Demo Trading Account Capital & Leverage ──────────────────────
  const handleUpdateDemoBalance = (newBalance: number, leverage: number) => {
    setAccount((prev) => ({
      ...prev,
      balance: newBalance,
      equity: newBalance,
      freeMargin: newBalance,
      marginUsed: 0,
    }))
    if (currentUser) {
      const updatedUser: UserProfile = {
        ...currentUser,
        demoBalance: newBalance,
        demoLeverage: leverage,
      }
      setCurrentUser(updatedUser)
      const all = getAllUsers().map((u) => (u.id === currentUser.id ? updatedUser : u))
      saveAllUsers(all)
    }
  }

  // ─── Market Feeds & Ticks ─────────────────────────────────────────────────
  useEffect(() => {
    initMarketFeed()
    const unsub = subscribeToTicks((newTick) => {
      setPrevPrice((prev) => {
        setTick(newTick)
        return prev
      })
    })
    return unsub
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const candles = getCandles(timeframe)
      setSmcAnalysis(detectSMCStructures(candles))
      setIntegrity(getDataIntegrityState())
    }, 4000)
    return () => clearInterval(id)
  }, [timeframe])

  // ─── Trade Execution Logic ────────────────────────────────────────────────
  const handleExecuteSignal = useCallback(
    (signal: AISignal) => {
      if (!currentUser) {
        setAuthModalOpen(true)
        toast.info("Please Sign In or Create an Account to execute trades.")
        return
      }

      // Check Global Kill Switch
      if (riskSettings.isGlobalKillSwitchActive) {
        toast.error("ADMIN GLOBAL KILL SWITCH ENGAGED: All new trade executions suspended.")
        return
      }

      // Check Market Hours (Strict Real Broker Rule: Closed market prohibits new orders)
      const hours = getMarketHoursInfo(isWeekendSimulationActive())
      if (!hours.isOpen) {
        toast.error(`Market Closed: Real broker rules prohibit opening orders while interbank gold is offline (${hours.countdownText}).`)
        return
      }

      // Check Data Integrity
      if (!integrity.tradingEnabled) {
        toast.error("Execution blocked: " + (integrity.circuitBreakerReason || "Data integrity check failed"))
        return
      }

      // Check Max Positions
      if (positions.length >= riskSettings.maxOpenPositions) {
        toast.error(`Risk limit: Maximum open positions reached (${positions.length}/${riskSettings.maxOpenPositions}).`)
        return
      }

      // If LIVE mode selected but no Exness account assigned, warn user
      if (brokerMode === "LIVE" && !currentUser.assignedExnessAccount) {
        toast.error("No Exness Account Assigned: Please request your Administrator to assign your Exness account.")
        return
      }

      const side = signal.direction === "long" ? "buy" : "sell"
      const slDist = Math.max(1.0, Math.abs(signal.entry - signal.sl))
      const riskAmount = account.equity * (riskSettings.maxRiskPerTrade / 100)
      const rawLots = riskAmount / (slDist * 100)
      const size = Math.max(0.01, Math.min(5.0, Math.round(rawLots * 100) / 100))
      const margin = (size * 100 * signal.entry) / 100

      const pos: TradePosition = {
        id: crypto.randomUUID(),
        side: side as "buy" | "sell",
        entryPrice: signal.entry,
        size,
        leverage: 100,
        sl: signal.sl,
        tp: signal.tp1,
        pnl: 0,
        pnlPercent: 0,
        openedAt: Date.now(),
        margin,
        brokerPositionId:
          brokerMode === "LIVE" && currentUser.assignedExnessAccount
            ? `EXN_${currentUser.assignedExnessAccount}_${Date.now().toString().slice(-4)}`
            : `DEMO_${Date.now().toString().slice(-4)}`,
      }

      const newPositions = [...positions, pos]
      setPositions(newPositions)
      saveUserPositions(currentUser.id, newPositions)

      setAccount((prev) => ({
        ...prev,
        marginUsed: prev.marginUsed + margin,
        freeMargin: Math.max(0, prev.freeMargin - margin),
      }))

      toast.success(
        `AI Trade Executed (${brokerMode}): ${side.toUpperCase()} ${size} lots @ $${signal.entry.toFixed(2)} [SL: $${signal.sl.toFixed(2)} | TP: $${signal.tp1.toFixed(2)}]`
      )
    },
    [currentUser, account, positions, integrity, riskSettings, brokerMode]
  )

  const handleClosePosition = useCallback(
    (id: string) => {
      if (!currentUser) return
      const pos = positions.find((p) => p.id === id)
      if (!pos) return

      const exitPrice = pos.side === "buy" ? tick.bid : tick.ask
      const pnl =
        pos.side === "buy"
          ? (exitPrice - pos.entryPrice) * pos.size * 100
          : (pos.entryPrice - exitPrice) * pos.size * 100

      const pnlPercent = (pnl / (pos.margin || 100)) * 100

      const journalEntry: TradeJournalEntry = {
        id: `trd_${Date.now()}`,
        symbol: "XAU/USD",
        side: pos.side,
        size: pos.size,
        entryPrice: pos.entryPrice,
        exitPrice,
        pnl,
        pnlPercent,
        durationSeconds: Math.floor((Date.now() - pos.openedAt) / 1000),
        reason: "Position closed by trader / target exit",
        aiSetup: "Confluence Execution",
        sl: pos.sl,
        tp: pos.tp,
        closedAt: Date.now(),
      }

      const newTrades = [journalEntry, ...closedTrades]
      setClosedTrades(newTrades)
      saveUserTrades(currentUser.id, newTrades)

      const newPositions = positions.filter((p) => p.id !== id)
      setPositions(newPositions)
      saveUserPositions(currentUser.id, newPositions)

      setAccount((prev) => ({
        ...prev,
        balance: prev.balance + pnl,
        equity: prev.equity + pnl,
        marginUsed: Math.max(0, prev.marginUsed - pos.margin),
        freeMargin: prev.freeMargin + pos.margin + pnl,
      }))

      toast.info(`Position closed: Net P/L ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`)
    },
    [currentUser, positions, closedTrades, tick]
  )

  const handleUpdatePositionSLTP = useCallback(
    (id: string, sl: number, tp: number) => {
      if (!currentUser) return
      const updated = positions.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            sl: sl > 0 ? sl : undefined,
            tp: tp > 0 ? tp : undefined,
          }
        }
        return p
      })
      setPositions(updated)
      saveUserPositions(currentUser.id, updated)
      toast.success(
        `Updated SL/TP on position: ${sl > 0 ? `SL: $${sl.toFixed(2)}` : "No SL"} | ${tp > 0 ? `TP: $${tp.toFixed(2)}` : "No TP"}`
      )
    },
    [currentUser, positions]
  )

  // ─── Deposit Submission (Real User) ───────────────────────────────────────
  const handleSubmitDeposit = (data: {
    cryptoNetworkId: string
    amount: number
    txHash: string
    proofUrl?: string
  }) => {
    if (!currentUser) {
      setAuthModalOpen(true)
      return
    }

    const net = cryptoNetworks.find((n) => n.id === data.cryptoNetworkId && n.isEnabled)
    if (!net) {
      toast.error("Selected deposit gateway is currently disabled by administrator.")
      return
    }

    const newDep: DepositRecord = {
      id: `dep_${Date.now()}`,
      userId: currentUser.id,
      walletId: walletSummary.walletId,
      cryptoNetworkId: data.cryptoNetworkId,
      networkName: net ? net.network : "USDT",
      amount: data.amount,
      currency: "USDT",
      txHash: data.txHash,
      proofUrl: data.proofUrl,
      status: "PENDING_VERIFICATION",
      createdAt: Date.now(),
    }

    const updated = [newDep, ...deposits]
    setDeposits(updated)
    saveUserDeposits(currentUser.id, updated)

    const updatedWallet = {
      ...walletSummary,
      pendingDeposits: walletSummary.pendingDeposits + data.amount,
    }
    setWalletSummary(updatedWallet)
    saveUserWallet(currentUser.id, updatedWallet)

    toast.success("Deposit submitted! Status: PENDING VERIFICATION. Admin will verify on-chain before crediting balance.")
  }

  // ─── Withdrawal Request (Real User) ───────────────────────────────────────
  const handleRequestWithdrawal = (data: {
    cryptoNetworkId: string
    amount: number
    destinationAddress: string
  }) => {
    if (!currentUser) {
      setAuthModalOpen(true)
      return
    }

    const net = cryptoNetworks.find((n) => n.id === data.cryptoNetworkId && n.isEnabled)
    if (!net) {
      toast.error("Selected withdrawal gateway is currently disabled by administrator.")
      return
    }
    const newWdr: WithdrawalRecord = {
      id: `wdr_${Date.now()}`,
      userId: currentUser.id,
      walletId: walletSummary.walletId,
      cryptoNetworkId: data.cryptoNetworkId,
      networkName: net ? net.network : "USDT",
      amount: data.amount,
      currency: "USDT",
      destinationAddress: data.destinationAddress,
      status: "PENDING",
      createdAt: Date.now(),
    }

    const updated = [newWdr, ...withdrawals]
    setWithdrawals(updated)
    saveUserWithdrawals(currentUser.id, updated)

    const updatedWallet = {
      ...walletSummary,
      availableBalance: Math.max(0, walletSummary.availableBalance - data.amount),
      pendingWithdrawals: walletSummary.pendingWithdrawals + data.amount,
    }
    setWalletSummary(updatedWallet)
    saveUserWallet(currentUser.id, updatedWallet)

    if (brokerMode === "LIVE") {
      setAccount((prev) => ({
        ...prev,
        balance: Math.max(0, prev.balance - data.amount),
        equity: Math.max(0, prev.equity - data.amount),
        freeMargin: Math.max(0, prev.freeMargin - data.amount),
      }))
    }

    toast.success("Withdrawal requested! Placed in administrative review queue.")
  }

  // ─── Admin Approvals ──────────────────────────────────────────────────────
  const handleApproveDeposit = (depositId: string, notes?: string) => {
    const allPending = getAllPendingDepositsAcrossUsers()
    const dep = allPending.find((d) => d.id === depositId)
    if (!dep) return

    // Update target user's deposits
    const userDeps = getUserDeposits(dep.userId).map((d) =>
      d.id === depositId ? { ...d, status: "APPROVED" as const, adminNotes: notes } : d
    )
    saveUserDeposits(dep.userId, userDeps)

    // Credit target user's double-entry ledger
    const ledgerEntry: LedgerEntry = {
      id: `tx_${Date.now()}`,
      userId: dep.userId,
      walletId: dep.walletId,
      amount: dep.amount,
      currency: "USDT",
      type: "DEPOSIT",
      status: "VERIFIED",
      reference: `DEP-${dep.id.slice(-6)}`,
      approvedBy: currentUser?.id || "ADMIN",
      notes: notes || `Verified on-chain USDT deposit: ${dep.txHash.slice(0, 12)}...`,
      createdAt: Date.now(),
    }
    const userLedger = [ledgerEntry, ...getUserLedger(dep.userId)]
    saveUserLedger(dep.userId, userLedger)

    // Update target user's wallet balance
    const targetWallet = getUserWallet(dep.userId)
    const newTargetWallet: WalletSummary = {
      ...targetWallet,
      verifiedBalance: targetWallet.verifiedBalance + dep.amount,
      availableBalance: targetWallet.availableBalance + dep.amount,
      pendingDeposits: Math.max(0, targetWallet.pendingDeposits - dep.amount),
    }
    saveUserWallet(dep.userId, newTargetWallet)

    // If active user is the target, refresh local state
    if (currentUser?.id === dep.userId) {
      setDeposits(userDeps)
      setLedger(userLedger)
      setWalletSummary(newTargetWallet)
      if (brokerMode === "LIVE") {
        setAccount((prev) => ({
          ...prev,
          balance: prev.balance + dep.amount,
          equity: prev.equity + dep.amount,
          freeMargin: prev.freeMargin + dep.amount,
        }))
      }
    }

    toast.success(`Deposit of $${dep.amount.toFixed(2)} USDT approved! Target user's ledger credited.`)
  }

  const handleRejectDeposit = (depositId: string, reason: string) => {
    const allPending = getAllPendingDepositsAcrossUsers()
    const dep = allPending.find((d) => d.id === depositId)
    if (!dep) return

    const userDeps = getUserDeposits(dep.userId).map((d) =>
      d.id === depositId ? { ...d, status: "REJECTED" as const, adminNotes: reason } : d
    )
    saveUserDeposits(dep.userId, userDeps)

    const targetWallet = getUserWallet(dep.userId)
    const newTargetWallet = {
      ...targetWallet,
      pendingDeposits: Math.max(0, targetWallet.pendingDeposits - dep.amount),
    }
    saveUserWallet(dep.userId, newTargetWallet)

    if (currentUser?.id === dep.userId) {
      setDeposits(userDeps)
      setWalletSummary(newTargetWallet)
    }

    toast.error("Deposit rejected by administrator.")
  }

  const handleApproveWithdrawal = (withdrawalId: string, txHash: string) => {
    const allPending = getAllPendingWithdrawalsAcrossUsers()
    const wdr = allPending.find((w) => w.id === withdrawalId)
    if (!wdr) return

    const userWdrs = getUserWithdrawals(wdr.userId).map((w) =>
      w.id === withdrawalId ? { ...w, status: "COMPLETED" as const, txHash } : w
    )
    saveUserWithdrawals(wdr.userId, userWdrs)

    const ledgerEntry: LedgerEntry = {
      id: `tx_${Date.now()}`,
      userId: wdr.userId,
      walletId: wdr.walletId,
      amount: -Math.abs(wdr.amount),
      currency: "USDT",
      type: "WITHDRAWAL",
      status: "VERIFIED",
      reference: `WDR-${wdr.id.slice(-6)}`,
      approvedBy: currentUser?.id || "ADMIN",
      notes: `USDT payout confirmed: ${txHash}`,
      createdAt: Date.now(),
    }
    const userLedger = [ledgerEntry, ...getUserLedger(wdr.userId)]
    saveUserLedger(wdr.userId, userLedger)

    const targetWallet = getUserWallet(wdr.userId)
    const newTargetWallet: WalletSummary = {
      ...targetWallet,
      verifiedBalance: Math.max(0, targetWallet.verifiedBalance - wdr.amount),
      pendingWithdrawals: Math.max(0, targetWallet.pendingWithdrawals - wdr.amount),
    }
    saveUserWallet(wdr.userId, newTargetWallet)

    if (currentUser?.id === wdr.userId) {
      setWithdrawals(userWdrs)
      setLedger(userLedger)
      setWalletSummary(newTargetWallet)
    }

    toast.success(`Withdrawal of $${wdr.amount.toFixed(2)} USDT confirmed! Ledger debited.`)
  }

  // ─── Admin Assign Exness Account ──────────────────────────────────────────
  const handleAssignExness = (userId: string, accountNum: string, server: string) => {
    const updatedUser = assignExnessAccountToUser(userId, accountNum, server)
    setAllUsers(getAllUsers())
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updatedUser)
    }
    toast.success(`Exness Account #${accountNum} (${server}) assigned to ${updatedUser.fullName}!`)
  }

  // Compute pending items across all users for Admin
  const pendingDepositsForAdmin = getAllPendingDepositsAcrossUsers()
  const pendingWithdrawalsForAdmin = getAllPendingWithdrawalsAcrossUsers()

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden transition-colors ${
      theme === "light" ? "bg-[#F4F6F9] text-zinc-800" : "bg-[#0B0E14] text-zinc-200"
    }`}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === "light" ? "#FFFFFF" : "#161b22",
            border: theme === "light" ? "1px solid #E2E8F0" : "1px solid #374151",
            color: theme === "light" ? "#0F172A" : "#e4e4e7",
          },
        }}
      />

      {/* Global Kill Switch Banner */}
      {riskSettings.isGlobalKillSwitchActive && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-between shadow-lg">
          <span>⚠️ ADMIN GLOBAL EMERGENCY KILL SWITCH IS ENGAGED — ALL NEW AI TRADING IS SUSPENDED.</span>
          {currentUser?.role === "ADMIN" && (
            <button
              onClick={() => setRiskSettings((prev) => ({ ...prev, isGlobalKillSwitchActive: false }))}
              className="px-2 py-0.5 rounded bg-white text-rose-700 font-bold hover:bg-zinc-100 transition"
            >
              DISENGAGE
            </button>
          )}
        </div>
      )}

      {/* If guest/unauthenticated: Render Public Landing & Educational Portal */}
      {!currentUser ? (
        <div className="flex-1 overflow-y-auto">
          <PublicLanding
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenLogin={() => {
              setAuthInitialMode("signin")
              setAuthModalOpen(true)
            }}
            onOpenRegister={() => {
              setAuthInitialMode("signup")
              setAuthModalOpen(true)
            }}
            tick={tick}
          />
        </div>
      ) : (
        <>
          {/* Header Bar */}
          <MarketHeader
            tick={tick}
            account={account}
            prevPrice={prevPrice}
            brokerMode={brokerMode}
            onToggleBrokerMode={handleSwitchBrokerMode}
            onOpenTradingAccount={() => setTradingAccountModalOpen(true)}
            timezone={timezone}
            onTimezoneChange={setTimezone}
            currentUser={currentUser}
            walletSummary={walletSummary}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onOpenWallet={() => setWalletModalOpen(true)}
            onOpenAdmin={() => setAdminPanelOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSignOut={() => switchUserData(null)}
            isDataStale={!integrity.tradingEnabled}
          />

          {/* Mobile & Tablet Segmented Tab Switcher (lg:hidden) */}
          <div className={`lg:hidden flex items-center justify-around border-b px-2 py-1.5 font-mono text-xs z-20 flex-shrink-0 gap-1.5 ${
            theme === "light" ? "bg-white border-slate-200" : "bg-[#0D1117] border-zinc-800"
          }`}>
            <button
              onClick={() => setMobileTab("chart")}
              className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs ${
                mobileTab === "chart"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs"
                  : theme === "light" ? "text-slate-600 hover:text-slate-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ChartLine className="w-4 h-4" />
              <span>Chart</span>
            </button>

            <button
              onClick={() => setMobileTab("trade")}
              className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs ${
                mobileTab === "trade"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs"
                  : theme === "light" ? "text-slate-600 hover:text-slate-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Lightning className="w-4 h-4" />
              <span>Trade ({brokerMode})</span>
            </button>

            <button
              onClick={() => setMobileTab("positions")}
              className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs relative ${
                mobileTab === "positions"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/40 shadow-xs"
                  : theme === "light" ? "text-slate-600 hover:text-slate-900" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ListBullets className="w-4 h-4" />
              <span>Positions</span>
              {positions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-extrabold ml-1">
                  {positions.length}
                </span>
              )}
            </button>
          </div>

          {/* Main Terminal Workspace */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left/Center Area: Real TradingView Chart + Bottom Terminal Dock */}
            <div className={`flex-1 p-1 sm:p-2 min-w-0 flex flex-col gap-2 overflow-hidden ${
              mobileTab === "trade" ? "hidden lg:flex" : "flex"
            }`}>
              {/* Real TradingView Chart Component */}
              <div className={`min-h-0 ${
                mobileTab === "positions" ? "hidden lg:block lg:flex-1" : "flex-1"
              }`}>
                <TradingViewChart
                  tick={tick}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  smcAnalysis={smcAnalysis}
                  theme={theme}
                />
              </div>

              {/* Bottom Dock: User Open Positions, Journal, News Calendar, User Ledger */}
              <div className={`${
                mobileTab === "chart" ? "hidden lg:block" : mobileTab === "positions" ? "flex-1 flex flex-col min-h-0" : "block"
              }`}>
                <TerminalDock
                  positions={positions}
                  closedTrades={closedTrades}
                  newsEvents={newsEvents}
                  ledger={ledger}
                  timezone={timezone}
                  onClosePosition={handleClosePosition}
                  onUpdatePositionSLTP={handleUpdatePositionSLTP}
                  theme={theme}
                  className={mobileTab === "positions" ? "h-full flex-1" : "h-64"}
                />
              </div>
            </div>

            {/* Right Sidebar: Trading Panel & Order Entry */}
            <div className={`border-l overflow-hidden flex flex-col ${
              mobileTab === "trade"
                ? "flex-1 w-full"
                : "hidden lg:flex lg:w-[320px] xl:w-[360px] flex-shrink-0"
            } ${
              theme === "light" ? "border-slate-200 bg-white" : "border-zinc-800/60 bg-[#0B0E14]"
            }`}>
              <TradingPanel
                tick={tick}
                account={account}
                onAccountChange={setAccount}
                positions={positions}
                onPositionsChange={setPositions}
                integrity={integrity}
                brokerMode={brokerMode}
                onBrokerModeChange={handleSwitchBrokerMode}
                onUpdatePositionSLTP={handleUpdatePositionSLTP}
                theme={theme}
                onOpenTradingAccount={() => setTradingAccountModalOpen(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        walletSummary={walletSummary}
        cryptoNetworks={cryptoNetworks}
        deposits={deposits}
        withdrawals={withdrawals}
        ledger={ledger}
        onSubmitDeposit={handleSubmitDeposit}
        onRequestWithdrawal={handleRequestWithdrawal}
      />

      <AdminPanel
        isOpen={adminPanelOpen}
        onClose={() => setAdminPanelOpen(false)}
        users={allUsers}
        pendingDeposits={pendingDepositsForAdmin}
        pendingWithdrawals={pendingWithdrawalsForAdmin}
        riskSettings={riskSettings}
        brokerState={brokerState}
        cryptoNetworks={cryptoNetworks}
        onApproveDeposit={handleApproveDeposit}
        onRejectDeposit={handleRejectDeposit}
        onApproveWithdrawal={handleApproveWithdrawal}
        onToggleKillSwitch={(active) => setRiskSettings((prev) => ({ ...prev, isGlobalKillSwitchActive: active }))}
        onUpdateRiskSettings={(s) => setRiskSettings((prev) => ({ ...prev, ...s }))}
        onToggleUserStatus={(uId) => toast.info(`User status toggled: ${uId}`)}
        onUpdateCryptoNetwork={handleUpdateCryptoNetwork}
        onAddCryptoNetwork={handleAddCryptoNetwork}
        onDeleteCryptoNetwork={handleDeleteCryptoNetwork}
        onAssignExnessAccount={handleAssignExness}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserLogin={switchUserData}
        onUserLogout={() => switchUserData(null)}
        onOpenWallet={() => setWalletModalOpen(true)}
        initialMode={authInitialMode}
        theme={theme}
      />

      {/* In-Terminal Trading Account Manager (Demo vs Live Exness) */}
      <TradingAccountModal
        isOpen={tradingAccountModalOpen}
        onClose={() => setTradingAccountModalOpen(false)}
        currentUser={currentUser}
        brokerMode={brokerMode}
        onSelectBrokerMode={handleSwitchBrokerMode}
        account={account}
        onUpdateDemoBalance={handleUpdateDemoBalance}
        onOpenWallet={() => setWalletModalOpen(true)}
        theme={theme}
      />

      {/* AI Price-Action Copilot Drawer */}
      <AICopilotDrawer
        tick={tick}
        timeframe={timeframe}
        open={copilotOpen}
        onToggle={() => setCopilotOpen(!copilotOpen)}
        onExecuteSignal={handleExecuteSignal}
        theme={theme}
        currentUser={currentUser}
        walletSummary={walletSummary}
        deposits={deposits}
        onOpenDeposit={() => setWalletModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    </div>
  )
}
