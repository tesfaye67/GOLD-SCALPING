// TDR GOLD TREADER - Double-Entry Wallet, USDT Deposit & Withdrawal Modal
import { useState } from "react"
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  CheckCircle,
  WarningCircle,
  X,
  QrCode,
} from "@phosphor-icons/react"
import type { CryptoNetwork, DepositRecord, WithdrawalRecord, LedgerEntry, WalletSummary } from "../types"

interface Props {
  isOpen: boolean
  onClose: () => void
  walletSummary: WalletSummary
  cryptoNetworks: CryptoNetwork[]
  deposits: DepositRecord[]
  withdrawals: WithdrawalRecord[]
  ledger: LedgerEntry[]
  onSubmitDeposit: (data: { cryptoNetworkId: string; amount: number; txHash: string; proofUrl?: string }) => void
  onRequestWithdrawal: (data: { cryptoNetworkId: string; amount: number; destinationAddress: string }) => void
}

export function WalletModal({
  isOpen,
  onClose,
  walletSummary,
  cryptoNetworks,
  deposits,
  withdrawals,
  ledger,
  onSubmitDeposit,
  onRequestWithdrawal,
}: Props) {
  const [tab, setTab] = useState<"deposit" | "withdraw" | "ledger">("deposit")
  const [selectedNetworkId, setSelectedNetworkId] = useState(cryptoNetworks[0]?.id || "net_trc20")
  const [depositAmount, setDepositAmount] = useState("100")
  const [depositTxHash, setDepositTxHash] = useState("")
  const [depositProof, setDepositProof] = useState("")
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState("50")
  const [withdrawAddress, setWithdrawAddress] = useState("")

  if (!isOpen) return null

  // Filter only networks actively enabled in the administrator panel
  const enabledNetworks = cryptoNetworks.filter((n) => n.isEnabled)
  const activeNetwork = enabledNetworks.find((n) => n.id === selectedNetworkId) || enabledNetworks[0]

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeNetwork) {
      setStatusMessage({
        text: "Cryptocurrency deposits are currently paused by the administrator.",
        type: "error",
      })
      return
    }

    const amt = parseFloat(depositAmount)
    if (isNaN(amt) || amt < (activeNetwork?.minDeposit || 10)) {
      setStatusMessage({
        text: `Minimum deposit for ${activeNetwork?.network || "network"} is $${activeNetwork?.minDeposit || 10} USDT.`,
        type: "error",
      })
      return
    }

    if (!depositTxHash || depositTxHash.trim().length < 8) {
      setStatusMessage({ text: "Please enter a valid blockchain transaction hash (TXID).", type: "error" })
      return
    }

    onSubmitDeposit({
      cryptoNetworkId: activeNetwork.id,
      amount: amt,
      txHash: depositTxHash.trim(),
      proofUrl: depositProof.trim() || undefined,
    })

    setStatusMessage({
      text: "Deposit submitted! Status: PENDING VERIFICATION. Ledger will credit upon Administrator on-chain confirmation.",
      type: "success",
    })
    setDepositTxHash("")
    setDepositProof("")
  }

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeNetwork) {
      setStatusMessage({
        text: "Cryptocurrency withdrawals are currently paused by the administrator.",
        type: "error",
      })
      return
    }

    const amt = parseFloat(withdrawAmount)
    if (isNaN(amt) || amt <= 0) {
      setStatusMessage({ text: "Please specify a valid withdrawal amount.", type: "error" })
      return
    }

    if (amt > walletSummary.availableBalance) {
      setStatusMessage({
        text: `Insufficient available balance ($${walletSummary.availableBalance.toFixed(2)} USDT available).`,
        type: "error",
      })
      return
    }

    if (!withdrawAddress || withdrawAddress.trim().length < 15) {
      setStatusMessage({ text: "Please specify a valid destination wallet address.", type: "error" })
      return
    }

    onRequestWithdrawal({
      cryptoNetworkId: activeNetwork.id,
      amount: amt,
      destinationAddress: withdrawAddress.trim(),
    })

    setStatusMessage({
      text: "Withdrawal requested! Placed in UNDER REVIEW queue for administrator processing.",
      type: "success",
    })
    setWithdrawAddress("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl bg-[#0D1117] border border-amber-500/30 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#12161F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">TDR Institutional Wallet & Ledger</h2>
              <p className="text-xs text-zinc-400 font-mono">Real USDT Accounting Engine • Double-Entry Audited</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-4 bg-[#090C10] border-b border-zinc-800/80 text-xs font-mono">
          <div className="p-2.5 rounded bg-[#161B22] border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase">Verified Ledger Balance</span>
            <span className="text-sm font-bold text-amber-400">${walletSummary.verifiedBalance.toFixed(2)} USDT</span>
          </div>
          <div className="p-2.5 rounded bg-[#161B22] border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase">Available to Trade/Withdraw</span>
            <span className="text-sm font-bold text-emerald-400">${walletSummary.availableBalance.toFixed(2)} USDT</span>
          </div>
          <div className="p-2.5 rounded bg-[#161B22] border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase">Trading Allocation</span>
            <span className="text-sm font-bold text-blue-400">${walletSummary.tradingAllocation.toFixed(2)} USDT</span>
          </div>
          <div className="p-2.5 rounded bg-[#161B22] border border-zinc-800">
            <span className="text-zinc-500 block text-[10px] uppercase">Pending Approvals</span>
            <span className="text-sm font-bold text-yellow-400">
              ${(walletSummary.pendingDeposits + walletSummary.pendingWithdrawals).toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-[#12161F] px-4 text-xs font-mono">
          <button
            onClick={() => { setTab("deposit"); setStatusMessage(null) }}
            className={`py-2.5 px-4 flex items-center gap-1.5 transition ${
              tab === "deposit" ? "text-amber-400 border-b-2 border-amber-400 font-bold bg-amber-500/5" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            Deposit USDT
          </button>
          <button
            onClick={() => { setTab("withdraw"); setStatusMessage(null) }}
            className={`py-2.5 px-4 flex items-center gap-1.5 transition ${
              tab === "withdraw" ? "text-amber-400 border-b-2 border-amber-400 font-bold bg-amber-500/5" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            Withdraw USDT
          </button>
          <button
            onClick={() => { setTab("ledger"); setStatusMessage(null) }}
            className={`py-2.5 px-4 flex items-center gap-1.5 transition ${
              tab === "ledger" ? "text-amber-400 border-b-2 border-amber-400 font-bold bg-amber-500/5" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            Immutable Ledger ({ledger.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {statusMessage.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <WarningCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: DEPOSIT */}
          {tab === "deposit" && (
            <div className="space-y-4">
              {enabledNetworks.length === 0 ? (
                <div className="p-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center space-y-2 font-mono">
                  <WarningCircle className="w-8 h-8 mx-auto text-amber-400" />
                  <div className="font-bold text-sm">USDT Deposits Temporarily Paused</div>
                  <div className="text-xs text-zinc-400">
                    All cryptocurrency deposit gateways are currently deactivated in the administrator control panel. Please check back later or contact support.
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-mono uppercase text-zinc-400 block mb-1.5">
                      1. Select Cryptocurrency & Network (Active Gateways)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {enabledNetworks.map((net) => (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => setSelectedNetworkId(net.id)}
                          className={`p-2.5 rounded-lg border text-left transition font-mono ${
                            activeNetwork?.id === net.id
                              ? "bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50"
                              : "bg-[#161B22] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          <div className="text-xs font-bold">{net.symbol} ({net.network})</div>
                          <div className="text-[10px] text-zinc-500">Min: ${net.minDeposit} USDT</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Deposit Address Box */}
                  <div className="p-4 rounded-xl bg-[#161B22] border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-zinc-400">
                        Official Deposit Address ({activeNetwork?.network})
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {activeNetwork?.confirmationsRequired || 12} Confirmations
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D1117] border border-zinc-700/80 font-mono text-xs text-amber-300 break-all select-all">
                      <span>{activeNetwork?.depositAddress}</span>
                      <button
                        onClick={() => handleCopy(activeNetwork?.depositAddress || "")}
                        className="ml-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex-shrink-0"
                        title="Copy Address"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Send ONLY Tether USD (USDT) on {activeNetwork?.network} network to this address.</span>
                    </div>
                  </div>

                  {/* Deposit Submission Form */}
                  <form onSubmit={handleDepositSubmit} className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-mono text-zinc-400 block mb-1">Amount Sent (USDT)</label>
                        <input
                          type="number"
                          step="any"
                          min={activeNetwork?.minDeposit || 10}
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full bg-[#161B22] border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-mono text-zinc-400 block mb-1">Transaction Hash (TXID)</label>
                        <input
                          type="text"
                          placeholder="e.g. 0x9b4f2c..."
                          value={depositTxHash}
                          onChange={(e) => setDepositTxHash(e.target.value)}
                          className="w-full bg-[#161B22] border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Financial Safety Guard:</strong> Internal ledger credit occurs only after administrator on-chain verification. Never automatically credited.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs shadow-lg transition"
                    >
                      Submit Deposit for Verification
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 2: WITHDRAW */}
          {tab === "withdraw" && (
            <div>
              {enabledNetworks.length === 0 ? (
                <div className="p-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center space-y-2 font-mono">
                  <WarningCircle className="w-8 h-8 mx-auto text-amber-400" />
                  <div className="font-bold text-sm">USDT Withdrawals Temporarily Paused</div>
                  <div className="text-xs text-zinc-400">
                    All cryptocurrency payout gateways are currently deactivated in the administrator control panel.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-mono text-zinc-400 block mb-1.5">Select Payout Network</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {enabledNetworks.map((net) => (
                        <button
                          key={net.id}
                          type="button"
                          onClick={() => setSelectedNetworkId(net.id)}
                          className={`p-2.5 rounded-lg border text-left transition font-mono ${
                            activeNetwork?.id === net.id
                              ? "bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/50"
                              : "bg-[#161B22] border-zinc-800 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <div className="text-xs font-bold">{net.network}</div>
                          <div className="text-[10px] text-zinc-500">Min: ${net.minDeposit} USDT</div>
                        </button>
                      ))}
                    </div>
                  </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">
                  Withdrawal Amount (Available: ${walletSummary.availableBalance.toFixed(2)} USDT)
                </label>
                <input
                  type="number"
                  step="any"
                  max={walletSummary.availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-[#161B22] border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Destination Wallet Address ({activeNetwork?.network})</label>
                <input
                  type="text"
                  placeholder="Enter your external USDT destination address"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-[#161B22] border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300 flex items-start gap-2">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Withdrawal requests undergo multi-signature compliance review by administrators before on-chain broadcast.
                </span>
              </div>

                <button
                  type="submit"
                  disabled={walletSummary.availableBalance <= 0}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-bold text-xs shadow-lg transition"
                >
                  Request USDT Withdrawal
                </button>
              </form>
            )}
          </div>
        )}

          {/* TAB 3: IMMUTABLE LEDGER */}
          {tab === "ledger" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pb-1 border-b border-zinc-800">
                <span>Transaction Reference</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
              </div>

              <div className="divide-y divide-zinc-800/60 max-h-[360px] overflow-y-auto">
                {ledger.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-zinc-200 font-bold">{tx.reference}</div>
                      <div className="text-[10px] text-zinc-500">{new Date(tx.createdAt).toLocaleString()}</div>
                      {tx.notes && <div className="text-[10px] text-zinc-400 italic">{tx.notes}</div>}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === "DEPOSIT"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tx.type === "WITHDRAWAL"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {tx.type}
                    </span>

                    <span className={`font-bold ${tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.amount >= 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} {tx.currency}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        tx.status === "VERIFIED"
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
                          : "text-yellow-400 bg-yellow-500/10"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                ))}

                {ledger.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-xs font-mono">
                    No ledger transactions recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
