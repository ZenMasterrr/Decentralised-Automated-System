# System Architecture Design
## Decentralized Workflow Automation Platform (DTeams)

**Author**: Abhishek Pandey  
**Project**: Decentralised Automated System

---

## 1. High-Level System Architecture

### 1.1 Three-Tier Hybrid Architecture

The system implements a **Hybrid Decentralized Architecture** combining blockchain immutability with traditional backend flexibility.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│    Next.js Frontend (React 19 + TailwindCSS + wagmi)            │
│                     Port: 3000                                   │
└────────────────────┬─────────────────────────────────────────────┘
                     │ HTTPS/WebSocket
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
┌─────────────────────┐  ┌──────────────────────────┐
│  BLOCKCHAIN LAYER   │  │   APPLICATION LAYER      │
│  Ethereum Sepolia   │  │   Node.js Backend        │
│  Smart Contracts    │  │   Express.js API         │
│  ZapV2.sol          │  │   Port: 3002            │
│  Keeper Network     │  │   PostgreSQL + Prisma    │
└─────────────────────┘  └──────────────────────────┘
         │                        │
         └───────────┬────────────┘
                     ▼
         ┌───────────────────────┐
         │   EXTERNAL SERVICES   │
         │   - Google APIs       │
         │   - SendGrid          │
         │   - Chainlink         │
         │   - IPFS (future)     │
         └───────────────────────┘
```

---

## 2. Detailed Component Architecture

### 2.1 Frontend Architecture (Client Layer)

```
Next.js Application (Port 3000)
│
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # Landing page
│   ├── dashboard/page.tsx        # User workflows dashboard
│   ├── create-zap/page.tsx       # Workflow builder UI
│   ├── create-zap-web3/page.tsx  # Blockchain workflow creator
│   ├── login/page.tsx            # Authentication
│   └── signup/page.tsx
│
├── components/                   # Reusable React components
│   ├── Appbar.tsx               # Navigation header
│   ├── ZapList.tsx              # Workflow list component
│   ├── WalletButton.tsx         # Web3 wallet connection
│   ├── WebhookTrigger.tsx       # Trigger configuration
│   ├── EmailActionForm.tsx      # Action forms
│   └── ui/                      # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── select.tsx
│
├── lib/                         # Utilities & configurations
│   ├── wagmi.ts                 # Web3 configuration
│   ├── api/client.ts            # HTTP API client
│   └── utils.ts                 # Helper functions
│
└── State Management
    ├── React Hooks (useState, useEffect)
    ├── wagmi Hooks (useAccount, useWriteContract)
    └── Valtio (Global state)
```

**Key Technologies**:
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 19 with TailwindCSS
- **Web3 Integration**: wagmi v2 + viem + RainbowKit
- **Component Library**: shadcn/ui (Radix UI primitives)

---

### 2.2 Backend Architecture (Application Layer)

```
Express.js Backend (Port 3002)
│
├── src/
│   ├── index.ts                    # Main entry point
│   │   ├── Express app initialization
│   │   ├── Middleware setup (CORS, body-parser)
│   │   ├── Route registration
│   │   └── Database connection
│   │
│   ├── routes/                     # API endpoints
│   │   ├── auth.routes.ts          # POST /signup, /google
│   │   ├── zap.routes.ts           # CRUD /zaps, /zaps/list
│   │   ├── webhook.routes.ts       # POST /webhook/:id
│   │   └── test-zap.routes.ts      # GET /test-zap/:id
│   │
│   ├── triggers/                   # Background monitors
│   │   ├── gmail-monitor.ts        # Poll Gmail API (30s interval)
│   │   ├── price-monitor.ts        # Monitor Chainlink price feeds
│   │   └── scheduler.ts            # Cron-based time triggers
│   │
│   ├── lib/
│   │   └── prisma.ts               # Database client singleton
│   │
│   └── types/
│       └── prisma.d.ts             # TypeScript type definitions
│
└── prisma/
    ├── schema.prisma               # Database schema
    ├── seed.ts                     # Seed data
    └── migrations/                 # Database migrations
```

**API Endpoints**:
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/google` - Google OAuth
- `POST /api/v1/zaps` - Create workflow
- `GET /api/v1/zaps/list` - List user workflows
- `POST /api/v1/webhook/:webhookId` - Webhook trigger
- `GET /api/v1/test-zap/:id` - Manual workflow test

---

### 2.3 Smart Contract Architecture (Blockchain Layer)

```
contracts/
│
├── ZapV2.sol                    # Main workflow contract (297 lines)
│   ├── Structs
│   │   ├── ZapData              # Workflow metadata
│   │   ├── Trigger              # Trigger configuration
│   │   ├── Action               # Action configuration
│   │   └── KeeperInfo           # Keeper statistics
│   │
│   ├── State Variables
│   │   ├── mapping(uint256 => ZapData) zaps
│   │   ├── mapping(address => KeeperInfo) keepers
│   │   ├── uint256 rewardPool
│   │   └── uint256 minKeeperStake (0.1 ETH)
│   │
│   ├── Core Functions
│   │   ├── mintZap()            # Create workflow NFT
│   │   ├── execute()            # Execute workflow
│   │   └── toggleZapStatus()    # Enable/disable workflow
│   │
│   ├── Keeper Functions
│   │   ├── registerKeeper()     # Stake ETH
│   │   ├── unregisterKeeper()   # Withdraw stake
│   │   └── fundRewardPool()     # Add execution rewards
│   │
│   └── Inherits
│       ├── ERC721URIStorage     # NFT standard
│       └── Ownable              # Access control
│
├── ZapOracle.sol                # Price feed oracle
│   └── Chainlink-compatible interface
│
└── Listener.sol                 # Event monitoring
    └── On-chain event triggers
```

**Smart Contract Flow**:
1. User calls `mintZap()` → Creates ERC-721 NFT with workflow config
2. Keeper monitors triggers off-chain
3. Keeper calls `execute()` → Executes actions on-chain
4. Smart contract transfers reward from pool to keeper

---

### 2.4 Database Architecture

```
PostgreSQL Database (Port 5433) via Prisma ORM

┌─────────────┐         ┌─────────────┐
│    User     │1      * │     Zap     │
│─────────────│─────────│─────────────│
│ id (PK)     │         │ id (PK)     │
│ address     │         │ userId (FK) │
│ email       │         │ name        │
│ googleToken │         │ status      │
└─────────────┘         └─────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Trigger    │1    *│   Action    │1    *│   ZapRun    │
│─────────────│      │─────────────│      │─────────────│
│ id (PK)     │      │ id (PK)     │      │ id (PK)     │
│ zapId (FK)  │      │ zapId (FK)  │      │ zapId (FK)  │
│ type        │      │ type        │      │ status      │
│ metadata    │      │ metadata    │      │ createdAt   │
└─────────────┘      │ sortingOrder│      └─────────────┘
                     └─────────────┘              │
                                                  │
                                        ┌─────────▼──────────┐
                                        │   ZapRunOutbox     │
                                        │────────────────────│
                                        │ zapRunId (FK)      │
                                        │ processed (bool)   │
                                        └────────────────────┘
```

**Key Tables**:
- **User**: Wallet address, OAuth tokens
- **Zap**: Workflow definition
- **Trigger**: Condition monitoring (Gmail, Price, Webhook)
- **Action**: Tasks to execute (Email, Webhook, On-chain)
- **ZapRun**: Execution history
- **ZapRunOutbox**: Event queue for reliable processing

---

## 3. Data Flow Architecture

### 3.1 Workflow Creation Flow

```
1. User (Frontend)
   │
   ├─→ Clicks "Create Workflow"
   │
   ├─→ Configures Trigger (Gmail/Price/Webhook)
   │
   ├─→ Adds Actions (Email/Webhook/On-chain)
   │
   └─→ Submits form
       │
       ▼
2. Backend API
   │
   ├─→ Validates workflow configuration
   │
   ├─→ Stores in PostgreSQL (Zap table)
   │
   └─→ Returns workflow ID
       │
       ▼
3. Blockchain (Optional for Web3 workflows)
   │
   ├─→ User signs MetaMask transaction
   │
   ├─→ ZapV2.mintZap() called
   │
   └─→ NFT minted on Ethereum Sepolia
```

### 3.2 Workflow Execution Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     TRIGGER DETECTION                         │
└────────────┬─────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬─────────────────┐
    │                 │              │                 │
    ▼                 ▼              ▼                 ▼
┌─────────┐  ┌──────────────┐  ┌─────────┐  ┌──────────────┐
│ Gmail   │  │ Price Feed   │  │ Webhook │  │ Scheduled    │
│ Monitor │  │ Monitor      │  │ Endpoint│  │ Time Trigger │
└────┬────┘  └──────┬───────┘  └────┬────┘  └──────┬───────┘
     │              │               │              │
     │ Poll every   │ Check price   │ HTTP POST    │ Cron job
     │ 30 seconds   │ threshold     │ received     │ interval
     │              │               │              │
     └──────────────┴───────────────┴──────────────┘
                    │
                    ▼
     ┌──────────────────────────────┐
     │  Trigger Condition Met        │
     │  Create ZapRun in database    │
     └──────────────┬────────────────┘
                    │
                    ▼
     ┌──────────────────────────────┐
     │     ACTION EXECUTION          │
     └──────────────┬────────────────┘
                    │
       ┌────────────┴────────────┬──────────────────┐
       │                         │                  │
       ▼                         ▼                  ▼
┌─────────────┐       ┌──────────────┐      ┌─────────────┐
│ Email Action│       │Webhook Action│      │On-chain     │
│ (SendGrid)  │       │(HTTP POST)   │      │Action       │
└─────────────┘       └──────────────┘      │(ethers.js)  │
                                             └─────────────┘
                                                    │
                                                    ▼
                                     ┌──────────────────────┐
                                     │ Keeper submits tx to │
                                     │ ZapV2.execute()      │
                                     │ Earns reward (0.001Ξ)│
                                     └──────────────────────┘
```

---

## 4. Security Architecture

### 4.1 Authentication & Authorization

```
┌─────────────────────────────────────────────────────────┐
│              Multi-Layer Authentication                  │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│ Wallet Auth │  │ OAuth 2.0   │
│ (MetaMask)  │  │ (Google)    │
└──────┬──────┘  └──────┬──────┘
       │                │
       │ Sign message   │ Access token
       │ with private   │ + Refresh token
       │ key            │
       │                │
       └────────┬───────┘
                ▼
     ┌──────────────────────┐
     │  JWT Token Generated │
     │  Stored in httpOnly  │
     │  cookie / localStorage│
     └──────────────────────┘
```

### 4.2 Smart Contract Security

- **Access Control**: OpenZeppelin Ownable pattern
- **Reentrancy Protection**: Checks-Effects-Interactions pattern
- **Stake-based Registration**: Prevents sybil attacks on keeper network
- **Atomic Execution**: All actions succeed or entire transaction reverts

### 4.3 API Security

- **CORS**: Whitelist frontend origin
- **Input Validation**: Sanitize all user inputs
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **Rate Limiting**: (Planned) Throttle requests per IP
- **JWT Expiration**: Short-lived tokens with refresh mechanism

---

## 5. Deployment Architecture

### 5.1 Development Environment

```
┌──────────────────────────────────────────────────────┐
│            Local Development Setup                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Frontend:  localhost:3000  (npm run dev)           │
│  Backend:   localhost:3002  (npm run dev)           │
│  Database:  localhost:5433  (Docker PostgreSQL)     │
│  Blockchain: Sepolia Testnet (via Infura/Alchemy)   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 5.2 Production Architecture (Recommended)

```
┌────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                    │
└────────────────────────────────────────────────────────────┘

Frontend: Vercel (Automatic Next.js deployment)
├── CDN edge caching
├── Automatic SSL
└── Global distribution

Backend: Railway / Heroku / DigitalOcean
├── Node.js runtime
├── PM2 process manager
└── Environment variables

Database: Managed PostgreSQL
├── AWS RDS / Supabase / Neon
├── Automated backups
└── Connection pooling

Blockchain: Ethereum Mainnet (or L2)
├── Deploy via Hardhat
├── Verify on Etherscan
└── Fund keeper reward pool

Keeper Nodes: VPS (Multiple instances)
├── DigitalOcean Droplets
├── Monitor triggers 24/7
└── Compete for execution rewards
```

---

## 6. Scalability Architecture

### 6.1 Current Limitations

- **Polling-based triggers**: 30-60 second latency
- **Single backend instance**: No horizontal scaling
- **Centralized trigger monitoring**: Backend is bottleneck

### 6.2 Scaling Strategy (Future)

```
┌────────────────────────────────────────────────────────┐
│             HORIZONTAL SCALING ARCHITECTURE             │
└────────────────────────────────────────────────────────┘

Load Balancer (Nginx/HAProxy)
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
Backend-1  Backend-2  Backend-3  Backend-N
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
         ▼
   Redis Cache (Shared state)
         │
         ▼
 PostgreSQL Cluster (Master-Replica)

Keeper Network: Fully decentralized P2P
├── libp2p for communication
├── Gossipsub for event propagation
└── No central coordinator
```

---

## 7. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 19, TailwindCSS | User interface |
| **Web3** | wagmi v2, viem, RainbowKit | Blockchain interaction |
| **Backend** | Node.js, Express.js, TypeScript | API server |
| **Database** | PostgreSQL, Prisma ORM | Data persistence |
| **Smart Contracts** | Solidity 0.8.20, Hardhat | Blockchain logic |
| **Blockchain** | Ethereum Sepolia Testnet | Decentralized execution |
| **Authentication** | MetaMask, Google OAuth2 | User authentication |
| **External APIs** | Google Gmail API, SendGrid | Integrations |
| **Deployment** | Docker, Vercel, Railway | Infrastructure |

---

## 8. Architecture Diagrams Legend

```
Symbols Used:
┌──────┐   Component/Module
│      │
└──────┘

   │       Unidirectional flow
   ▼

   ├──     Branching
   └──

   *       One-to-many relationship
   1       One-to-one relationship
```

---

**Document Version**: 1.0  
**Last Updated**: November 8, 2025  
**Author**: Abhishek Pandey  
**Project Repository**: https://github.com/ZenMasterrr/Decentralised-Automated-System
