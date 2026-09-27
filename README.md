# TDR GOLD TREADER 🏛️
### Production-Ready Multi-User AI XAU/USD Trading Platform

![Instrument](https://img.shields.io/badge/Instrument-XAU%2FUSD%20(Gold)-gold)
![Technology](https://img.shields.io/badge/Stack-Next.js%20%7C%20Node.js%20%7C%20PostgreSQL%20%7C%20Docker-blue)
![Safety](https://img.shields.io/badge/Risk%20Engine-Deterministic%20Circuit%20Breakers-emerald)
![Broker](https://img.shields.io/badge/Broker-Exness%20%2F%20MT5%20Gateway-orange)

**TDR GOLD TREADER** is an institutional-grade, self-hostable, multi-user algorithmic trading platform engineered around **ONE trading instrument only: XAU/USD (Gold)**.

The system combines real **TradingView** chart technology, live market data feeds, a multi-timeframe **Price-Action AI Engine** (4H context → 1H POI → 15M confirmation), and an independent **Deterministic Risk Engine** that strictly governs execution.

---

## 🏛️ Core Principles & Financial Safety Rules

1. **No Fabricated Balances or Trades**:
   Demo mode is strictly separated from Live mode. Live mode interfaces exclusively with authorized broker APIs (Exness / MT5). Real deposits are verified through on-chain blockchain transaction hashes before ledger credit.
2. **Deterministic Risk Authority**:
   The AI produces trade *proposals* only. The AI has **zero** authority over funds. An independent Risk Engine enforces maximum risk per trade (1%), daily loss limits (2%), weekly loss limits (5%), maximum total drawdown (10%), consecutive loss cooldowns, and the Admin Global Kill Switch.
3. **Double-Entry Immutable Accounting**:
   User wallet balances are calculated dynamically from verified double-entry ledger transactions (`DEPOSIT`, `WITHDRAWAL`, `TRADE_PROFIT`, `TRADE_LOSS`, `FEE`, `ADJUSTMENT`). Raw balance values are never mutated without an immutable ledger audit trail.
4. **No Guaranteed Return Claims**:
   All AI signals represent technical price-action confluence analysis. Risk is governed by statistical position sizing.

---

## 🔄 Architecture & Data Flow

```
USER INTERFACE / DASHBOARD
           │
           ▼
DOUBLE-ENTRY USDT WALLET & LEDGER
           │
           ▼
REAL TRADINGVIEW XAU/USD TERMINAL
           │
           ▼
AI PRICE-ACTION ENGINE (4H → 1H → 15M)
           │
           ├── [Condition Failed / Spread High / News / R:R < 1:2] ──► NO TRADE
           │
           ▼ [Trade Proposal Generated]
DETERMINISTIC RISK ENGINE (Circuit Breakers & Hard Rules)
           │
           ├── [Max Risk > 1% | Daily Loss > 2% | Drawdown > 10%] ──► EXECUTION BLOCKED
           │
           ▼ [Approved with Exact Lot Size]
AUTHORIZED BROKER ADAPTER (Exness / Paper Simulation)
           │
           ▼
LIVE POSITION SYNCHRONIZATION & MONITORING
```

---

## 📦 System Requirements

- **Local Laptop / Server**:
  - Windows 10/11, macOS, or Linux
  - **Docker & Docker Compose** (for multi-container deployment) OR **Node.js (>= 18)**
  - 4 GB RAM minimum

---

## 🚀 Quick Start: Run Locally with Docker Compose

The complete project can be booted up with a single command:

```bash
# 1. Clone or extract the project repository
cd "GOLD SCALPING"

# 2. Copy the environment configuration template
cp .env.example .env

# 3. Boot all containers (PostgreSQL, Redis, Backend, Frontend)
docker compose up -d

# 4. Initialize Database Schema & Seed Data
docker compose exec backend npx prisma db push
docker compose exec backend npx tsx prisma/seed.ts
```

Open your browser at:
- **Trading Terminal**: `http://localhost:3000`
- **Backend REST & WebSockets**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/api/health`

---

## 💻 Alternative: Run Directly on Your Laptop (Without Docker)

You can also run the platform directly using your installed Node.js environment:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Launch the Terminal
```bash
npm run dev
```

Open `http://localhost:3000` in your web browser.

> [!NOTE]
> When running standalone without an active PostgreSQL instance, the platform operates using its built-in in-memory transactional ledger engine, allowing you to test all user, admin, deposit, and trading features immediately.

---

## 🔐 Default Credentials & Role Switcher

The platform comes pre-seeded with two accounts for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@tdrgold.com` | `Admin@TDR2026!` | Full Admin Panel, Deposit Approvals, Global Kill Switch, Risk Settings |
| **USER** | `trader@tdrgold.com` | `Trader@TDR2026!` | Trading Terminal, USDT Deposit/Withdrawal, Ledger, Demo Trading |

Click on the **User Profile Pill** in the top navigation header to switch between accounts instantly or toggle Two-Factor Authentication (2FA).

---

## 💰 USDT Deposit & Verification Workflow

1. User clicks the **USDT Wallet Pill** in the header.
2. Selects crypto network:
   - **USDT (TRC20)** — Tron network (19 confirmations)
   - **USDT (ERC20)** — Ethereum network (12 confirmations)
   - **USDT (BEP20)** — BNB Smart Chain (15 confirmations)
3. The platform displays the configured official deposit address, dynamic QR code, and minimum deposit amount ($10 USDT).
4. User broadcasts the payment and submits the on-chain Transaction Hash (TXID).
5. Deposit status is set to: **`PENDING VERIFICATION`**.
6. The Administrator navigates to **Admin Portal → Deposits**, reviews the transaction hash on-chain, and clicks **Verify & Credit Ledger**.
7. The double-entry ledger is atomically credited with a verified transaction, instantly increasing the user's available balance.

---

## 📈 Multi-Timeframe AI Price-Action Engine

The AI analyzes XAU/USD using institutional price action principles:

- **4H Macro Context**:
  - Identifies macro trend direction.
  - Computes 50% Equilibrium and categorizes current price into **Premium** vs **Discount** zones.
- **1H Point of Interest (POI)**:
  - Detects institutional **Order Blocks** (unmitigated impulsive origin candles).
  - Maps **Fair Value Gaps (FVG)** and liquidity pools.
- **15M Execution Confirmation**:
  - Looks for **Liquidity Sweeps** (Buy-Side BSL or Sell-Side SSL sweep wicks).
  - Validates **Change of Character (CHOCH)** and displacement candle momentum.
- **NO TRADE Logic**:
  - The AI explicitly outputs `NO_TRADE` when conditions are ranging, spread is excessive (> $2.50), market data is stale (> 5s), economic news is imminent, or Risk/Reward is less than 1:2.

---

## 🛡️ Deterministic Risk Engine & Circuit Breakers

The risk engine runs as an independent safety barrier prior to broker order transmission:

| Parameter | Default | Action on Breach |
| :--- | :--- | :--- |
| **Max Risk per Trade** | 1.00% of Equity | Dynamic lot size calculated automatically |
| **Max Daily Loss** | 2.00% of Equity | **TRADING HALTED** for remainder of session |
| **Max Weekly Loss** | 5.00% of Equity | **TRADING PAUSED** for remainder of week |
| **Max Account Drawdown** | 10.00% from Peak | **EMERGENCY RISK LOCK** (Requires manual Admin reset) |
| **Consecutive Losses** | 3 Losses | 2 losses → Risk cut to 0.5%; 3 losses → Mandatory Cooldown |
| **Minimum Risk / Reward** | 1:2.0 | Trades with R:R < 1:2 are rejected |
| **Max Open Positions** | 2 | Subsequent proposals rejected |
| **Global Kill Switch** | Admin Toggle | One-click emergency halt of all new AI trades |

### Lot Size Formula:
$$\text{Lot Size} = \frac{\text{Account Equity} \times \text{Risk \%}}{|\text{Entry} - \text{Stop Loss}| \times 100 \text{ oz}}$$

---

## 🔌 Exness & Broker Adapter Architecture

The platform uses a modular adapter pattern:
- `PaperBrokerAdapter`: Provides realistic simulation for **DEMO** accounts without financial risk.
- `ExnessBrokerAdapter`: Handles authenticated connections to official Exness MT5 servers / partner gateway APIs.

### Linking an Exness Account:
1. Administrator navigates to **Admin Portal → Broker Gateway**.
2. Inputs Exness MT5 Server (e.g. `Exness-Real10`), Login ID, and authorized API Token.
3. Tests connection and assigns the broker account to a platform user.

---

## 💾 Database Backup & Restore

### Linux / macOS:
```bash
# Create a compressed backup
./scripts/backup-restore.sh backup

# Restore from a backup file
./scripts/backup-restore.sh restore ./backups/tdr_gold_backup_YYYYMMDD.sql.gz
```

### Windows (PowerShell / Command Prompt):
```cmd
REM Create a backup
.\scripts\backup-restore.bat backup

REM Restore from a backup
.\scripts\backup-restore.bat restore .\backups\tdr_gold_backup_YYYYMMDD.sql
```

---

## ☁️ Migration from Local Laptop to VPS / Cloud Server

To move TDR GOLD TREADER to a production VPS (e.g. DigitalOcean, AWS EC2, Hetzner, Linode):

1. **Provision Ubuntu 22.04+ VPS** with Docker & Docker Compose installed.
2. **Clone the repository** onto the server.
3. **Configure `.env`** with production secrets, domain name, and PostgreSQL passwords.
4. **Deploy with Production Compose**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
5. **Attach Reverse Proxy / SSL**:
   Use Nginx or Caddy to point your domain (e.g. `trading.yourdomain.com`) with automated Let's Encrypt SSL certificates to port `3000`.

---

## 📄 License & Compliance

*TDR GOLD TREADER is proprietary financial software designed for institutional and private trading operations. Operators must ensure compliance with local financial jurisdictions, anti-money laundering (AML), and know-your-customer (KYC) regulations.*
