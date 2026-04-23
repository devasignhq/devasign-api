<br/>
<div align="center">
  <a href="https://www.devasign.com" style="display: block; margin: 0 auto;">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./public/devasign-white.png">
      <source media="(prefers-color-scheme: light)" srcset="./public/devasign-black.png">
      <img alt="DevAsign Logo" src="./public/devasign-white.png" height="80" style="display: block; margin: 0 auto;">
    </picture>
  </a>
<br/>

<br/>
</div>
<br/>

<div align="center">
    <a href="https://github.com/devasignhq/devasign-api?tab=Apache-2.0-1-ov-file">
  <img src="https://img.shields.io/github/license/devasignhq/devasign-api" alt="License">
<a href="https://GitHub.com/devasignhq/devasign-api/graphs/contributors">
  <img src="https://img.shields.io/github/contributors/devasignhq/devasign-api" alt="GitHub Contributors">
</a>
<a href="https://devasign.com">
  <img src="https://img.shields.io/badge/Visit-devasign.com-orange" alt="Visit devasign.com">
</a>
</div>
<div>
  <p align="center">
    <a href="https://x.com/devasign">
      <img src="https://img.shields.io/badge/Follow%20on%20X-000000?style=for-the-badge&logo=x&logoColor=white" alt="Follow on X" />
    </a>
    <a href="https://www.linkedin.com/company/devasign">
      <img src="https://img.shields.io/badge/Follow%20on%20LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="Follow on LinkedIn" />
    </a>
  </p>
</div>


<div align="center">
  
  **Join our stargazers :)** 

  <a href="https://github.com/devasignhq/maintainer-app">
    <img src="https://img.shields.io/github/stars/devasignhq?style=social&label=Star&maxAge=2592000" alt="GitHub stars">
  </a>

  <br/>
  </div>
  <br/>
  </div>

## What is DevAsign?

DevAsign streamlines open-source workflows with AI-powered PR review, intelligent contributor feedback, and automatic bounty payouts via the Stellar blockchain. It integrates directly with GitHub as a GitHub App, providing a seamless experience for project maintainers and contributors.

## Key Features

- **AI-Powered PR Analysis** — Automated pull request reviews using Google Gemini, with intelligent context from indexed repositories.
- **X402 Payment Protocol** — Pay-per-use PR analysis for public repos via the [X402](https://www.x402.org/) HTTP payment standard on the Stellar network.
- **Bounty Management** — Create tasks from GitHub issues, fund bounties with USDC via Soroban smart contracts, and automatically pay contributors on merge.
- **Stellar Wallet Integration** — Built-in wallet management with GCP KMS-encrypted secrets, USDC/XLM swaps, withdrawals, and top-up tracking.
- **GitHub Webhook Processing** — Real-time processing of `installation`, `push`, `pull_request`, and `issue_comment` events via Google Cloud Tasks for async execution.
- **Feature Flags** — Runtime feature gating with Statsig.
- **Real-Time Updates** — WebSocket support via Socket.IO for live task and activity feeds.
<!-- - **KYC Verification** — Contributor identity verification via Sumsub integration. -->

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20, TypeScript (ESM via `NodeNext`) |
| **Framework** | Express.js |
| **Database** | PostgreSQL via Prisma ORM (Prisma Accelerate for production) |
| **Authentication** | Firebase Admin SDK |
| **AI** | Google Gemini (`gemini-3.1-pro-preview`) |
| **Blockchain** | Stellar SDK, Soroban smart contracts, x402 payment protocol |
| **Cloud** | Google Cloud Run, Cloud Tasks, Cloud KMS |
| **Testing** | Vitest, Supertest |
| **Feature Flags** | Statsig |
| **Containerization** | Docker (multi-stage Alpine build) |
<!-- | **KYC** | Sumsub | -->

## Prerequisites

#### Required Software
- **Node.js** (v20+)
- **npm** (v8+)
- **Git**

#### Development Tools (Recommended)
- **Docker** (v20+) & **Docker Compose** (v2+)
- **Google Cloud SDK** — for KMS and Cloud Tasks
- **Antigravity** or preferred IDE

#### Required Accounts & Services
- **Firebase** — Authentication (GitHub sign-in)
- **GitHub App** — Repository integration & webhook events
- **PostgreSQL** — Local or cloud-hosted (Prisma Accelerate for production)
- **Google Cloud Platform** — KMS encryption, Cloud Run, Cloud Tasks
- **Stellar Account** — Testnet or mainnet master wallet
- **Statsig** — Feature flag management
<!-- - **Sumsub** — KYC/identity verification -->

## Installation & Setup

### Method 1: Local Development

#### 1. Clone the Repository
```bash
git clone https://github.com/devasignhq/devasign-api.git
cd devasign-api
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Configuration
```bash
cp .env.example .env
```

Configure your `.env` file — see [`.env.example`](.env.example) for all required variables:


#### 4. Database Setup
```bash
# Local PostgreSQL via Docker
docker run --name postgres-database -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=devasign_db -p 5433:5432 -d postgres

# Generate Prisma client
npm run prisma-gen

# Run database migrations
npx prisma migrate dev --name initial_migration
```

#### 5. Start the Development Server
```bash
npm run dev
# Server runs at http://localhost:5000 (development)
```

### Method 2: Docker

#### 1. Clone and Configure
```bash
git clone https://github.com/devasignhq/devasign-api.git
cd devasign-api
cp .env.docker .env
# Edit .env with your credentials
```

#### 2. Build and Run
```bash
docker build -t devasign-api .
docker run -d --name devasign-api -p 8080:8080 --env-file .env devasign-api
```

The production Docker image uses a multi-stage build (Node.js 20 Alpine) with a non-root user for security.

## Configuration Guides

### Firebase Setup
1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with GitHub sign-in
3. Generate a service account key: **Project Settings > Service Accounts > Generate new private key**
4. Extract `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_CLIENT_EMAIL` into `.env`

### GitHub App Setup
1. Go to **GitHub Developer Settings > GitHub Apps > New GitHub App**
2. Configure:
   - **Webhook URL**: `https://your-domain.com/webhook/github`
   - **Webhook Events**: `installation`, `installation_repositories`, `pull_request`, `push`, `issue_comment`
   - **Repository Permissions**: Read & Write (pull requests, issues, contents)
   - **Organization Permissions**: Read (members)
3. Generate a webhook secret and private key
4. Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_WEBHOOK_SECRET` in `.env`

### Stellar Setup
1. Create a Stellar account:
   - **Testnet**: Use [Stellar Laboratory](https://lab.stellar.org/account/create?$=network$id=testnet)
   - **Mainnet**: Use a Stellar wallet like [StellarTerm](https://stellarterm.com/)
2. Fund your testnet account using the [Friendbot](https://lab.stellar.org/account/fund/)
3. Set `STELLAR_MASTER_PUBLIC_KEY`, `STELLAR_MASTER_SECRET_KEY`, and contract IDs in `.env`

### GCP KMS Setup
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Cloud Key Management Service (KMS) API**
3. Create a Key Ring and Key
4. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project your-project-id
   ```
5. Set `GCP_PROJECT_ID`, `GCP_LOCATION_ID`, `GCP_KEY_RING_ID`, `GCP_KEY_ID` in `.env`

<!-- ### Sumsub Setup
1. Sign up at [Sumsub](https://sumsub.com/) and create an application
2. Configure a verification level (e.g., `id-and-liveness`)
3. Set up a webhook endpoint for verification status updates
4. Set `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_WEBHOOK_SECRET`, and `SUMSUB_LEVEL_NAME` in `.env` -->

## Testing

Tests use [Vitest](https://vitest.dev/) with unit and integration test suites:

```bash
# Run all tests
npm test --fileParallelism=false

# Run in watch mode
npm run test:watch --fileParallelism=false

# Run specific test file
npm test -- integration/api/user/index.api.test.ts

# Run with coverage
npm run test:coverage --fileParallelism=false
```

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](https://github.com/devasignhq/devasign-api/blob/main/LICENSE) for more details.

## Related Projects

- [DevAsign App](https://github.com/devasignhq/apps) — Frontend for project maintainers and contributors
- [Soroban Task Escrow Contract](https://github.com/devasignhq/soroban-contract) — Task escrow smart contract on Stellar
