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
DevAsign streamlines open-source workflows with advanced PR review, intelligent contributor feedback, and automatic bounty payouts upon merge.

## Key Features

- **Smart Merge**: Prioritize and merge PRs based on project impact and contributor reliability.
- **Feedback Loop**: Provide constructive, automated feedback to help contributors improve.
- **Security Scanning**: Identify and flag potential security vulnerabilities before they enter your codebase.
- **Custom Workflows**: Configure project-specific rules and thresholds for automated decisions.
- **Bounty Payouts**: Pay bounties to contributors once code passes test and PR merged.
- **Contributor Reward**: Automatically calculate and distribute rewards based on contribution quality and complexity.

## Prerequisites

Before setting up DevAsign locally, ensure you have the following installed:

#### Required Software
- **Node.js** (version 18.0 or higher)
- **npm** (version 8.0 or higher) or **yarn** (version 1.22 or higher)
- **Git** (latest version)

#### Development Tools (Recommended)
- **Docker** (version 20.0 or higher)
- **Docker Compose** (version 2.0 or higher)
- **VS Code** or your preferred IDE
- **Insomnia or Postman** or similar API testing tool

#### Required Accounts & Services
- **Firebase Project** - for authentication services
- **GitHub App** - for repository integration
- **PostgreSQL Database** - local or cloud-hosted
- **GroqCloud Account** - for the AI model API access
- **Google Cloud Platform (GCP)** - for Key Management Service (KMS) encryption

## Installation & Setup

### Method 1: Local Development Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/devasignhq/devasign-api.git
cd devasign-api
```

#### Step 2: Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

#### Step 3: Environment Configuration
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your `.env` file with the following variables:
```bash
# Environment Configuration
NODE_ENV=development
PORT=8080

# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5433/devasign_db"

# Firebase Configuration
FIREBASE_PROJECT_ID="project"
FIREBASE_PRIVATE_KEY="private-key"
FIREBASE_CLIENT_EMAIL="example@project.iam.gserviceaccount.com"

# GitHub Configuration
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="private-key"
GITHUB_WEBHOOK_SECRET="webhook-secret"

# AI Service Configuration
GROQ_API_KEY="groq-key"

# Stellar Configuration
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_NETWORK="testnet"
STELLAR_MASTER_PUBLIC_KEY="public-key"
STELLAR_MASTER_SECRET_KEY="secret-key"

# GCP KMS Configuration (for encryption)
GCP_PROJECT_ID="your-gcp-project-id"
GCP_LOCATION_ID="us-central1"
GCP_KEY_RING_ID="your-key-ring-id"
GCP_KEY_ID="your-key-id"

# Encryption Key (fallback if not using GCP KMS)
ENCRYPTION_KEY="encryption-key"

# Others
DEFAULT_SUBSCRIPTION_PACKAGE_ID="package-id"
CONTRIBUTOR_APP_URL="http://localhost:4001"
```

#### Step 4: Database Setup
1. Create a Docker PostgreSQL database:
```bash
docker run --name postgres-database -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=devasign_db -p 5433:5432 -d postgres
```

2. Generate Prisma client and run migrations:
```bash
# Generate Prisma client
npm run prisma-gen

# Run database migrations
npx prisma migrate dev --name initial_migration
```

#### Step 5: Start the Development Server
```bash
# Start the API server
npm run dev

# The server will be available at http://localhost:5000
```

### Method 2: Docker Development Setup

#### Step 1: Clone and Configure
```bash
git clone https://github.com/devasignhq/devasign-api.git
cd devasign-api
cp .env.example .env
```

#### Step 2: Configure Docker Environment
Create a `docker-compose.yml` file (if not present):
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@db:5433/devasign_db
    depends_on:
      - db
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  db:
    image: postgres:latest
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: devasign_db
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Step 3: Build and Run with Docker
```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d
```

#### Step 4: Run Database Migrations in Docker
```bash
# Execute migrations inside the container
docker-compose exec app npx prisma migrate dev --name initial_migration

# Generate Prisma client
docker-compose exec app npm run prisma-gen
```

<!-- ### Method 3: Production Docker Build

#### Step 1: Build Production Image
```bash
# Build the production Docker image
docker build -t devasign-api:latest .

# Or build with specific tag
docker build -t devasign-api:v1.0.0 .
```

#### Step 2: Run Production Container
```bash
# Run the production container
docker run -d --name devasign-api -p 8080:8080 --env-file .env.production devasign-api:latest
``` -->

## Configuration

#### Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and choose GitHub as your preferred sign-in method
3. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file and extract the required fields for your `.env`

#### GitHub App Integration
1. Go to developer settings on your GitHub account
2. Create and configure a new GitHub App with the following settings:
   - **Webhook URL**: `https://your-domain.com/api/webhook/github/pr-review` (for PR reviews)
   - **Webhook URL**: `https://your-domain.com/api/webhook/github/pr-merged` (for automatic payments)
   - **Webhook Events**: Subscribe to `pull_request` events
   - **Permissions**: 
     - Repository permissions: Read & Write access to pull requests, issues, and contents
     - Organization permissions: Read access to members
3. Generate a webhook secret and private key
4. Extract the required fields for your `.env`:
   - `GITHUB_APP_ID`: Your GitHub App ID
   - `GITHUB_APP_PRIVATE_KEY`: Your GitHub App private key
   - `GITHUB_WEBHOOK_SECRET`: Your webhook secret

For detailed webhook setup and automatic payment configuration, see [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)

#### GroqCloud Setup
1. Sign up at [GroqCloud](https://console.groq.com/)
2. Generate an API key from your dashboard
3. Add `GROQ_API_KEY` to your `.env` file

#### Stellar Master Account Setup
1. Create a Stellar account:
   - For testnet: Use [Stellar Laboratory](https://lab.stellar.org/account/create?$=network$id=testnet&label=Testnet&horizonUrl=https:////horizon-testnet.stellar.org&rpcUrl=https:////soroban-testnet.stellar.org&passphrase=Test%20SDF%20Network%20/;%20September%202015)
   - For mainnet: Use a Stellar wallet like [StellarTerm](https://stellarterm.com/)
2. Fund your testnet account using the [Friendbot](https://lab.stellar.org/account/fund/)
3. Add your public and secret keys to the `.env` file

#### Database Configuration
1. Set up PostgreSQL using Prisma-Postgres (recommended):
   - Sign up at [Prisma Data Platform](https://cloud.prisma.io/) or use local PostgreSQL
   - Create a new database instance
   - Configure your Prisma schema and run migrations
2. Alternative: Install PostgreSQL locally or use a cloud service
3. Update the `DATABASE_URL` in your `.env` file

#### GCP KMS Setup (for Encryption)
DevAsign uses Google Cloud KMS for secure encryption of sensitive data like wallet secrets.

1. **Create a GCP Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your project ID for the `.env` file

2. **Enable Cloud KMS API**:
   - Navigate to APIs & Services > Library
   - Search for "Cloud Key Management Service (KMS) API"
   - Click "Enable"

3. **Create a Key Ring and Key**

4. **Install Google Cloud SDK Shell and set up authentication**:
   - Download and install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
   - Authenticate using `gcloud auth login`
   - Set the project using `gcloud config set project your-project-id`

5. **Update your `.env` file**:
   ```bash
   GCP_PROJECT_ID="your-project-id"
   GCP_LOCATION_ID="us-central1"
   GCP_KEY_RING_ID="devasign-keyring"
   GCP_KEY_ID="devasign-encryption-key"

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPatterns=task.api.test
```

<!-- ## Contributing -->

## License

This project is licensed under the Apache 2.0 License. See [LICENSE](https://github.com/devasignhq/devasign-api/blob/main/LICENSE) for more details.

<!-- ## Repo Activity

<img width="100%" src="https://repobeats.axiom.co/api/embed/8b40a2517db299a027b4d1cd78441f14f1910db6.svg" /> -->

## Related Projects

- [DevAsign Project Maintainer App](https://github.com/devasignhq/app.devasign.com) - Frontend for project maintainer
- [DevAsign Contributor App](https://github.com/devasignhq/contributor.devasign.com) - Frontend for contributors
- [Soroban Task Escrow Contract](https://github.com/devasignhq/soroban-contract) - Task Escrow Management

<!-- ## Acknowledgments -->
