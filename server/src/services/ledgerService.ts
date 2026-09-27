// TDR GOLD TREADER - Double-Entry Wallet & Ledger Accounting Service
import { prisma, isDbConnected, memoryStore } from "../db"
import type { LedgerType, LedgerStatus, DepositStatus, WithdrawalStatus } from "../types"
import * as crypto from "crypto"

export interface LedgerEntryDTO {
  id: string
  userId: string
  walletId: string
  amount: number
  currency: string
  type: LedgerType
  status: LedgerStatus
  reference: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
  createdAt: string
}

export interface WalletSummary {
  walletId: string
  userId: string
  currency: string
  verifiedBalance: number
  pendingDeposits: number
  pendingWithdrawals: number
  tradingAllocation: number
  availableBalance: number
}

export class LedgerService {
  /**
   * Calculate verified wallet balance by summing all VERIFIED ledger transactions.
   * Never relies on an unverified raw balance field.
   */
  public static async calculateVerifiedBalance(userId: string): Promise<number> {
    if (isDbConnected()) {
      const result = await prisma.ledgerTransaction.aggregate({
        where: {
          userId,
          status: "VERIFIED",
        },
        _sum: {
          amount: true,
        },
      })
      return Number(result._sum.amount || 0)
    } else {
      const sum = memoryStore.ledger
        .filter((tx) => tx.userId === userId && tx.status === "VERIFIED")
        .reduce((acc, tx) => acc + Number(tx.amount), 0)
      return Math.round(sum * 100) / 100
    }
  }

  /**
   * Get comprehensive wallet summary with ledger-derived balances.
   */
  public static async getWalletSummary(userId: string): Promise<WalletSummary> {
    const verifiedBalance = await this.calculateVerifiedBalance(userId)

    let pendingDeposits = 0
    let pendingWithdrawals = 0
    let tradingAllocation = 0
    let walletId = `wal_${userId}`

    if (isDbConnected()) {
      const wallet = await prisma.wallet.findUnique({ where: { userId } })
      if (wallet) {
        walletId = wallet.id
        tradingAllocation = Number(wallet.tradingAllocation)
      }

      const depSum = await prisma.deposit.aggregate({
        where: { userId, status: "PENDING_VERIFICATION" },
        _sum: { amount: true },
      })
      pendingDeposits = Number(depSum._sum.amount || 0)

      const withSum = await prisma.withdrawal.aggregate({
        where: { userId, status: { in: ["PENDING", "UNDER_REVIEW", "PROCESSING"] } },
        _sum: { amount: true },
      })
      pendingWithdrawals = Number(withSum._sum.amount || 0)
    } else {
      const wallet = memoryStore.wallets.get(userId)
      if (wallet) {
        walletId = wallet.id
        tradingAllocation = Number(wallet.tradingAllocation || 0)
      }

      pendingDeposits = memoryStore.deposits
        .filter((d) => d.userId === userId && d.status === "PENDING_VERIFICATION")
        .reduce((sum, d) => sum + Number(d.amount), 0)

      pendingWithdrawals = memoryStore.withdrawals
        .filter((w) => w.userId === userId && ["PENDING", "UNDER_REVIEW", "PROCESSING"].includes(w.status))
        .reduce((sum, w) => sum + Number(w.amount), 0)
    }

    const availableBalance = Math.max(0, verifiedBalance - pendingWithdrawals - tradingAllocation)

    return {
      walletId,
      userId,
      currency: "USDT",
      verifiedBalance,
      pendingDeposits,
      pendingWithdrawals,
      tradingAllocation,
      availableBalance,
    }
  }

  /**
   * Submit a new USDT deposit.
   * State immediately becomes PENDING_VERIFICATION.
   * NEVER creates ledger credit automatically.
   */
  public static async submitDeposit(params: {
    userId: string
    cryptoNetworkId: string
    amount: number
    txHash: string
    proofUrl?: string
  }) {
    if (params.amount < 10) {
      throw new Error("Minimum deposit requirement is $10.00 USDT.")
    }

    if (!params.txHash || params.txHash.length < 10) {
      throw new Error("A valid blockchain transaction hash (TXID) is required.")
    }

    const depositRecord = {
      id: `dep_${crypto.randomUUID().slice(0, 8)}`,
      userId: params.userId,
      walletId: `wal_${params.userId}`,
      cryptoNetworkId: params.cryptoNetworkId,
      amount: params.amount,
      currency: "USDT",
      txHash: params.txHash.trim(),
      proofUrl: params.proofUrl,
      status: "PENDING_VERIFICATION" as DepositStatus,
      createdAt: new Date().toISOString(),
    }

    if (isDbConnected()) {
      return await prisma.deposit.create({
        data: {
          id: depositRecord.id,
          userId: depositRecord.userId,
          walletId: depositRecord.walletId,
          cryptoNetworkId: depositRecord.cryptoNetworkId,
          amount: depositRecord.amount,
          currency: depositRecord.currency,
          txHash: depositRecord.txHash,
          proofUrl: depositRecord.proofUrl,
          status: depositRecord.status,
        },
      })
    } else {
      memoryStore.deposits.unshift(depositRecord)
      return depositRecord
    }
  }

  /**
   * Admin approves a deposit.
   * ONLY here is the ledger credited atomically!
   */
  public static async approveDeposit(depositId: string, adminId: string, adminNotes?: string) {
    if (isDbConnected()) {
      return await prisma.$transaction(async (tx) => {
        const deposit = await tx.deposit.findUnique({ where: { id: depositId } })
        if (!deposit) throw new Error("Deposit record not found")
        if (deposit.status !== "PENDING_VERIFICATION") {
          throw new Error(`Deposit cannot be approved in status '${deposit.status}'`)
        }

        // 1. Update deposit status
        const updatedDeposit = await tx.deposit.update({
          where: { id: depositId },
          data: {
            status: "APPROVED",
            reviewedBy: adminId,
            reviewedAt: new Date(),
            adminNotes: adminNotes || "Deposit verified on-chain by administrator",
          },
        })

        // 2. Create immutable double-entry ledger credit
        const ref = `DEP-${deposit.id}`
        const ledgerEntry = await tx.ledgerTransaction.create({
          data: {
            userId: deposit.userId,
            walletId: deposit.walletId,
            amount: deposit.amount,
            currency: deposit.currency,
            type: "DEPOSIT",
            status: "VERIFIED",
            reference: ref,
            approvedBy: adminId,
            approvedAt: new Date(),
            notes: `Verified on-chain USDT deposit: ${deposit.txHash}`,
          },
        })

        // 3. Log audit event
        await tx.auditLog.create({
          data: {
            actorId: adminId,
            userId: deposit.userId,
            action: "APPROVE_DEPOSIT",
            targetEntity: "Deposit",
            entityId: deposit.id,
            detailsJson: JSON.stringify({ amount: deposit.amount, txHash: deposit.txHash, ledgerId: ledgerEntry.id }),
          },
        })

        return { deposit: updatedDeposit, ledgerEntry }
      })
    } else {
      const dep = memoryStore.deposits.find((d) => d.id === depositId)
      if (!dep) throw new Error("Deposit not found")
      if (dep.status !== "PENDING_VERIFICATION") {
        throw new Error(`Deposit cannot be approved in status '${dep.status}'`)
      }

      dep.status = "APPROVED"
      dep.reviewedBy = adminId
      dep.reviewedAt = new Date().toISOString()
      dep.adminNotes = adminNotes || "Deposit verified on-chain by administrator"

      const ledgerEntry = {
        id: `tx_${crypto.randomUUID().slice(0, 8)}`,
        userId: dep.userId,
        walletId: dep.walletId,
        amount: dep.amount,
        currency: "USDT",
        type: "DEPOSIT" as LedgerType,
        status: "VERIFIED" as LedgerStatus,
        reference: `DEP-${dep.id}`,
        approvedBy: adminId,
        approvedAt: new Date().toISOString(),
        notes: `Verified on-chain USDT deposit: ${dep.txHash}`,
        createdAt: new Date().toISOString(),
      }
      memoryStore.ledger.unshift(ledgerEntry)

      return { deposit: dep, ledgerEntry }
    }
  }

  /**
   * Admin rejects a deposit with reason.
   */
  public static async rejectDeposit(depositId: string, adminId: string, reason: string) {
    if (isDbConnected()) {
      return await prisma.deposit.update({
        where: { id: depositId },
        data: {
          status: "REJECTED",
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes: reason,
        },
      })
    } else {
      const dep = memoryStore.deposits.find((d) => d.id === depositId)
      if (!dep) throw new Error("Deposit not found")
      dep.status = "REJECTED"
      dep.reviewedBy = adminId
      dep.reviewedAt = new Date().toISOString()
      dep.adminNotes = reason
      return dep
    }
  }

  /**
   * User requests a withdrawal.
   * Checks available balance against ledger before allowing submission.
   */
  public static async requestWithdrawal(params: {
    userId: string
    cryptoNetworkId: string
    amount: number
    destinationAddress: string
  }) {
    const summary = await this.getWalletSummary(params.userId)
    if (params.amount > summary.availableBalance) {
      throw new Error(`Insufficient available balance ($${summary.availableBalance.toFixed(2)} USDT available)`)
    }

    if (params.amount < 20) {
      throw new Error("Minimum withdrawal amount is $20.00 USDT")
    }

    const withdrawal = {
      id: `wdr_${crypto.randomUUID().slice(0, 8)}`,
      userId: params.userId,
      walletId: summary.walletId,
      cryptoNetworkId: params.cryptoNetworkId,
      amount: params.amount,
      currency: "USDT",
      destinationAddress: params.destinationAddress.trim(),
      status: "PENDING" as WithdrawalStatus,
      createdAt: new Date().toISOString(),
    }

    if (isDbConnected()) {
      return await prisma.withdrawal.create({
        data: withdrawal,
      })
    } else {
      memoryStore.withdrawals.unshift(withdrawal)
      return withdrawal
    }
  }

  /**
   * Admin approves withdrawal and submits on-chain tx hash.
   * Debits the ledger atomically with negative amount.
   */
  public static async approveWithdrawal(withdrawalId: string, adminId: string, txHash: string) {
    if (!txHash) throw new Error("Broadcast transaction hash is required for completed withdrawal.")

    if (isDbConnected()) {
      return await prisma.$transaction(async (tx) => {
        const wdr = await tx.withdrawal.findUnique({ where: { id: withdrawalId } })
        if (!wdr) throw new Error("Withdrawal record not found")
        if (wdr.status === "COMPLETED" || wdr.status === "REJECTED") {
          throw new Error("Withdrawal has already been processed")
        }

        const updatedWdr = await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: "COMPLETED",
            txHash,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        })

        // Ledger debit (negative amount)
        const ref = `WDR-${wdr.id}`
        const ledgerEntry = await tx.ledgerTransaction.create({
          data: {
            userId: wdr.userId,
            walletId: wdr.walletId,
            amount: -Math.abs(Number(wdr.amount)),
            currency: wdr.currency,
            type: "WITHDRAWAL",
            status: "VERIFIED",
            reference: ref,
            approvedBy: adminId,
            approvedAt: new Date(),
            notes: `USDT Withdrawal payout confirmed: ${txHash}`,
          },
        })

        return { withdrawal: updatedWdr, ledgerEntry }
      })
    } else {
      const wdr = memoryStore.withdrawals.find((w) => w.id === withdrawalId)
      if (!wdr) throw new Error("Withdrawal not found")
      wdr.status = "COMPLETED"
      wdr.txHash = txHash
      wdr.reviewedBy = adminId
      wdr.reviewedAt = new Date().toISOString()

      const ledgerEntry = {
        id: `tx_${crypto.randomUUID().slice(0, 8)}`,
        userId: wdr.userId,
        walletId: wdr.walletId,
        amount: -Math.abs(Number(wdr.amount)),
        currency: "USDT",
        type: "WITHDRAWAL" as LedgerType,
        status: "VERIFIED" as LedgerStatus,
        reference: `WDR-${wdr.id}`,
        approvedBy: adminId,
        approvedAt: new Date().toISOString(),
        notes: `USDT Withdrawal payout confirmed: ${txHash}`,
        createdAt: new Date().toISOString(),
      }
      memoryStore.ledger.unshift(ledgerEntry)

      return { withdrawal: wdr, ledgerEntry }
    }
  }

  /**
   * Admin manual ledger adjustment with mandatory audit note.
   */
  public static async adminAdjustment(params: {
    userId: string
    adminId: string
    amount: number
    reason: string
  }) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error("An explicit audit reason is mandatory for admin ledger adjustments.")
    }

    const ref = `ADJ-${crypto.randomUUID().slice(0, 8)}`

    if (isDbConnected()) {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } })
        if (!wallet) throw new Error("User wallet not found")

        const entry = await tx.ledgerTransaction.create({
          data: {
            userId: params.userId,
            walletId: wallet.id,
            amount: params.amount,
            currency: "USDT",
            type: "ADJUSTMENT",
            status: "VERIFIED",
            reference: ref,
            approvedBy: params.adminId,
            approvedAt: new Date(),
            notes: params.reason,
          },
        })

        await tx.adminAction.create({
          data: {
            adminId: params.adminId,
            targetUserId: params.userId,
            actionType: "MANUAL_ADJUSTMENT",
            reason: params.reason,
            metadataJson: JSON.stringify({ amount: params.amount, reference: ref }),
          },
        })

        return entry
      })
    } else {
      const entry = {
        id: `tx_${crypto.randomUUID().slice(0, 8)}`,
        userId: params.userId,
        walletId: `wal_${params.userId}`,
        amount: params.amount,
        currency: "USDT",
        type: "ADJUSTMENT" as LedgerType,
        status: "VERIFIED" as LedgerStatus,
        reference: ref,
        approvedBy: params.adminId,
        approvedAt: new Date().toISOString(),
        notes: params.reason,
        createdAt: new Date().toISOString(),
      }
      memoryStore.ledger.unshift(entry)
      return entry
    }
  }

  /**
   * Fetch immutable ledger transactions for a user.
   */
  public static async getUserLedger(userId: string): Promise<LedgerEntryDTO[]> {
    if (isDbConnected()) {
      const entries = await prisma.ledgerTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
      return entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        walletId: e.walletId,
        amount: Number(e.amount),
        currency: e.currency,
        type: e.type,
        status: e.status,
        reference: e.reference || "",
        approvedBy: e.approvedBy || undefined,
        approvedAt: e.approvedAt?.toISOString(),
        notes: e.notes || undefined,
        createdAt: e.createdAt.toISOString(),
      }))
    } else {
      return memoryStore.ledger
        .filter((e) => e.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }
}
