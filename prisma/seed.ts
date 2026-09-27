// TDR GOLD TREADER - Database Seed Script
import { PrismaClient } from "@prisma/client"
import * as crypto from "crypto"

const prisma = new PrismaClient()

// Secure SHA256/HMAC password hashing fallback
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

async function main() {
  console.log("⚡ [TDR GOLD TREADER] Seeding database...")

  // 1. Seed Global Risk Settings
  const riskSettings = await prisma.riskSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
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
    },
  })
  console.log("✓ Risk settings configured: 1% risk, 2% daily loss limit, 10% max DD")

  // 2. Seed Wallet Configuration
  await prisma.walletConfiguration.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      depositInstructions: "Please send only USDT to the selected network address. After transaction broadcast, submit the TXID hash. An admin will verify the on-chain confirmation before ledger credit.",
      minDepositDefault: 10.00,
      withdrawalFeePercent: 0.50,
    },
  })
  console.log("✓ Wallet configuration seeded")

  // 3. Seed Crypto Networks (USDT on TRC20, ERC20, BEP20)
  const networks = [
    {
      name: "Tether USD (TRC20)",
      symbol: "USDT",
      network: "TRC20",
      depositAddress: "TYDsvH9v3fN4kKz8M2uK9zZp5q6w8nQ1xY",
      minDeposit: 10.00,
      confirmationsRequired: 19,
      isEnabled: true,
    },
    {
      name: "Tether USD (ERC20)",
      symbol: "USDT",
      network: "ERC20",
      depositAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      minDeposit: 25.00,
      confirmationsRequired: 12,
      isEnabled: true,
    },
    {
      name: "Tether USD (BEP20)",
      symbol: "USDT",
      network: "BEP20",
      depositAddress: "0x3892A24F3169f4C436BE151817478051E84B89c8",
      minDeposit: 10.00,
      confirmationsRequired: 15,
      isEnabled: true,
    },
  ]

  for (const net of networks) {
    await prisma.cryptoNetwork.upsert({
      where: { symbol_network: { symbol: net.symbol, network: net.network } },
      update: { depositAddress: net.depositAddress, isEnabled: net.isEnabled },
      create: net,
    })
  }
  console.log("✓ Supported crypto networks (TRC20, ERC20, BEP20) seeded")

  // 4. Seed Default Admin User
  const adminEmail = "admin@tdrgold.com"
  const adminPasswordHash = hashPassword("Admin@TDR2026!")
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      fullName: "TDR Principal Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
      twoFactorEnabled: false,
    },
  })
  console.log(`✓ Admin user ready: ${admin.email}`)

  // 5. Seed Default Trader User
  const traderEmail = "trader@tdrgold.com"
  const traderPasswordHash = hashPassword("Trader@TDR2026!")
  const trader = await prisma.user.upsert({
    where: { email: traderEmail },
    update: {},
    create: {
      email: traderEmail,
      fullName: "Tesfaye Dereje",
      passwordHash: traderPasswordHash,
      role: "USER",
      status: "ACTIVE",
      isEmailVerified: true,
      twoFactorEnabled: false,
    },
  })

  // Seed Trader Wallet & Initial Demo Trading Account
  const traderWallet = await prisma.wallet.upsert({
    where: { userId: trader.id },
    update: {},
    create: {
      userId: trader.id,
      currency: "USDT",
      cachedBalance: 500.00,
      tradingAllocation: 500.00,
    },
  })

  // Create initial ledger credit for verified seed funds
  const existingLedger = await prisma.ledgerTransaction.findFirst({
    where: { userId: trader.id, reference: "SEED-INIT-001" },
  })
  if (!existingLedger) {
    await prisma.ledgerTransaction.create({
      data: {
        userId: trader.id,
        walletId: traderWallet.id,
        amount: 500.00,
        currency: "USDT",
        type: "DEPOSIT",
        status: "VERIFIED",
        reference: "SEED-INIT-001",
        approvedBy: admin.id,
        approvedAt: new Date(),
        notes: "Initial platform test allocation verified by Admin",
      },
    })
  }

  // Create Demo Trading Account with $10,000 virtual capital
  const existingAccount = await prisma.tradingAccount.findFirst({
    where: { userId: trader.id, accountType: "DEMO" },
  })
  if (!existingAccount) {
    await prisma.tradingAccount.create({
      data: {
        userId: trader.id,
        accountType: "DEMO",
        balance: 10000.00,
        equity: 10000.00,
        usedMargin: 0.00,
        freeMargin: 10000.00,
        currency: "USD",
        maxDrawdown: 0.00,
        dailyDrawdown: 0.00,
      },
    })
  }
  console.log(`✓ Trader user ready: ${trader.email} (Wallet: $500 USDT, Demo Trading: $10,000 USD)`)

  // 6. Seed High-Impact USD Economic Events
  const events = [
    {
      title: "US FOMC Interest Rate Decision",
      country: "USD",
      impact: "HIGH" as const,
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days ahead
      forecast: "5.25%",
      previous: "5.50%",
      blocksTrading: true,
    },
    {
      title: "US Non-Farm Payrolls (NFP)",
      country: "USD",
      impact: "HIGH" as const,
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // 5 days ahead
      forecast: "165K",
      previous: "142K",
      blocksTrading: true,
    },
    {
      title: "US Consumer Price Index (CPI YoY)",
      country: "USD",
      impact: "HIGH" as const,
      scheduledTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9), // 9 days ahead
      forecast: "2.6%",
      previous: "2.9%",
      blocksTrading: true,
    },
  ]

  for (const ev of events) {
    const existing = await prisma.newsEvent.findFirst({ where: { title: ev.title } })
    if (!existing) {
      await prisma.newsEvent.create({ data: ev })
    }
  }
  console.log("✓ High-impact economic events seeded (FOMC, NFP, CPI)")

  console.log("🚀 [TDR GOLD TREADER] Database seeding completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
