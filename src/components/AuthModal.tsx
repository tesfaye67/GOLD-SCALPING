// TDR GOLD TREADER - Site User Authentication (Sign In & Sign Up) & User Profile
import { useState, useEffect } from "react"
import {
  ShieldCheck,
  Lock,
  User,
  Envelope,
  CheckCircle,
  WarningCircle,
  X,
  SignOut,
  SignIn,
  UserPlus,
  Wallet,
  Database,
} from "@phosphor-icons/react"
import type { UserProfile } from "../types"
import {
  registerRealUser,
  loginRealUser,
  logoutCurrentUser,
  DEFAULT_ADMIN,
} from "../data/userStorage"

interface Props {
  isOpen: boolean
  onClose: () => void
  currentUser: UserProfile | null
  onUserLogin: (user: UserProfile) => void
  onUserLogout: () => void
  onOpenWallet: () => void
  initialMode?: "signin" | "signup" | "profile"
  theme?: "dark" | "light"
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onUserLogin,
  onUserLogout,
  onOpenWallet,
  initialMode,
  theme = "dark",
}: Props) {
  const [tab, setTab] = useState<"profile" | "signin" | "signup">(
    currentUser ? "profile" : initialMode || "signin"
  )

  useEffect(() => {
    if (isOpen) {
      if (currentUser) {
        setTab("profile")
      } else {
        setTab(initialMode || "signin")
      }
      setStatusMessage(null)
    }
  }, [isOpen, currentUser, initialMode])

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  if (!isOpen) return null

  const isLight = theme === "light"

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!fullName.trim() || !email.trim() || !password) {
      setStatusMessage({ text: "Please fill in all required registration fields.", type: "error" })
      return
    }

    if (password.length < 6) {
      setStatusMessage({ text: "Password must be at least 6 characters long.", type: "error" })
      return
    }

    if (password !== confirmPassword) {
      setStatusMessage({ text: "Passwords do not match.", type: "error" })
      return
    }

    try {
      const newUser = registerRealUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      })

      setStatusMessage({
        text: `Account created successfully! Welcome to TDR GOLD TREADER, ${newUser.fullName}.`,
        type: "success",
      })
      onUserLogin(newUser)
      setTimeout(() => {
        setStatusMessage(null)
        onClose()
      }, 1000)
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Registration failed.", type: "error" })
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!email.trim() || !password) {
      setStatusMessage({ text: "Please enter your email and password.", type: "error" })
      return
    }

    try {
      const user = loginRealUser(email.trim(), password)
      setStatusMessage({ text: `Welcome back, ${user.fullName}!`, type: "success" })
      onUserLogin(user)
      setEmail("")
      setPassword("")
      setTimeout(() => {
        setStatusMessage(null)
        onClose()
      }, 800)
    } catch (err: any) {
      setStatusMessage({ text: err.message || "Login failed.", type: "error" })
    }
  }

  const handleQuickAdminLogin = () => {
    try {
      const admin = loginRealUser(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password || "Admin@TDR2026!")
      setStatusMessage({ text: "Logged in as TDR Principal Administrator.", type: "success" })
      onUserLogin(admin)
      setTimeout(() => {
        setStatusMessage(null)
        onClose()
      }, 800)
    } catch (err: any) {
      setStatusMessage({ text: err.message, type: "error" })
    }
  }

  const handleLogout = () => {
    logoutCurrentUser()
    onUserLogout()
    setTab("signin")
    setStatusMessage({ text: "You have been signed out successfully.", type: "success" })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 transition-colors ${
          isLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-[#0D1117] border-amber-500/30 text-zinc-200"
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${
            isLight
              ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className={`flex items-center gap-3 mb-5 border-b pb-4 ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-amber-500/20">
            TDR
          </div>
          <div>
            <h2 className={`text-base font-bold tracking-wide ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
              {currentUser && tab === "profile"
                ? "User Profile & Dashboard"
                : tab === "signup"
                ? "Create Platform Account"
                : "Sign In to TDR GOLD TREADER"}
            </h2>
            <p className={`text-xs font-mono ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
              Institutional XAU/USD Platform Authentication
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mb-4 p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-500"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <WarningCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`flex border-b mb-5 text-xs font-mono ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
          {currentUser && (
            <button
              onClick={() => {
                setTab("profile")
                setStatusMessage(null)
              }}
              className={`pb-2 px-3 transition-colors ${
                tab === "profile"
                  ? "text-amber-500 border-b-2 border-amber-500 font-bold"
                  : isLight
                  ? "text-slate-500 hover:text-slate-800"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              My Profile
            </button>
          )}
          <button
            onClick={() => {
              setTab("signin")
              setStatusMessage(null)
            }}
            className={`pb-2 px-3 transition-colors ${
              tab === "signin"
                ? "text-amber-500 border-b-2 border-amber-500 font-bold"
                : isLight
                ? "text-slate-500 hover:text-slate-800"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab("signup")
              setStatusMessage(null)
            }}
            className={`pb-2 px-3 transition-colors ${
              tab === "signup"
                ? "text-amber-500 border-b-2 border-amber-500 font-bold"
                : isLight
                ? "text-slate-500 hover:text-slate-800"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Register Account
          </button>
        </div>

        {/* TAB 1: PROFILE & DASHBOARD OVERVIEW */}
        {tab === "profile" && currentUser && (
          <div className="space-y-4 font-mono text-xs">
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-[#161B22] border-zinc-800"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-zinc-100"}`}>
                    {currentUser.fullName}
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
                    {currentUser.email}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentUser.role === "ADMIN"
                      ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                      : "bg-blue-500/20 text-blue-500 border border-blue-500/40"
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>

              {/* Exness Account Connection Status */}
              <div className={`pt-2 border-t text-[11px] ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
                <span className={`block mb-0.5 ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
                  Exness MT5 Institutional Gateway
                </span>
                {currentUser.assignedExnessAccount ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold">
                    <Database className="w-4 h-4" />
                    <span>
                      Exness #{currentUser.assignedExnessAccount} ({currentUser.assignedExnessServer || "Exness-Real10"})
                    </span>
                  </div>
                ) : (
                  <div className="text-amber-500 flex items-center gap-1.5 font-bold">
                    <span>Demo Gateway active • Live Exness account available on request</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onClose()
                  onOpenWallet()
                }}
                className="py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-500 font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Wallet className="w-4 h-4" />
                USDT Wallet
              </button>

              <button
                onClick={handleLogout}
                className={`py-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition ${
                  isLight
                    ? "bg-slate-100 hover:bg-rose-50 border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-600"
                    : "bg-zinc-800 hover:bg-rose-600/20 border-zinc-700 hover:border-rose-500/40 text-zinc-300 hover:text-rose-400"
                }`}
              >
                <SignOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SIGN IN FORM */}
        {tab === "signin" && (
          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                Email Address
              </label>
              <div className="relative">
                <Envelope className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? "text-slate-400" : "text-zinc-500"}`} />
                <input
                  type="email"
                  placeholder="trader@tdrgold.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? "text-slate-400" : "text-zinc-500"}`} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
            >
              <SignIn className="w-4 h-4" />
              Sign In to Platform
            </button>

            {/* Quick Switch to Default Admin button */}
            <div className={`pt-3 border-t text-center ${isLight ? "border-slate-200" : "border-zinc-800"}`}>
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="text-[11px] font-mono text-amber-500 hover:text-amber-600 underline font-bold"
              >
                Log In as Administrator (admin@tdrgold.com)
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: SIGN UP / REGISTER FORM (SITE ACCOUNT) */}
        {tab === "signup" && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className={`p-2.5 rounded-xl border text-[11px] font-mono leading-relaxed ${
              isLight
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}>
              ✨ <strong>Personal Trader Account:</strong> Register to access real TradingView charts, AI price-action automated execution, and dedicated Demo & Live Exness accounts.
            </div>

            <div>
              <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                Full Name
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? "text-slate-400" : "text-zinc-500"}`} />
                <input
                  type="text"
                  placeholder="e.g. Tesfaye Dereje"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                Email Address
              </label>
              <div className="relative">
                <Envelope className={`w-4 h-4 absolute left-3 top-2.5 ${isLight ? "text-slate-400" : "text-zinc-500"}`} />
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Min 6 chars"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
              <div>
                <label className={`text-xs font-mono block mb-1 ${isLight ? "text-slate-700 font-semibold" : "text-zinc-400"}`}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono transition focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400"
                      : "bg-[#161B22] border border-zinc-700 text-zinc-100 placeholder-zinc-500"
                  }`}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-mono font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create My Platform Account
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
