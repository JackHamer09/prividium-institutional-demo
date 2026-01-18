# Intraday Repo

Short-term collateralized lending market built on [Prividium](https://zksync.io/prividium) - a privacy-preserving blockchain infrastructure.

Lenders create offers specifying loan terms (amount, collateral, duration, fee). Borrowers accept offers by depositing collateral and receiving funds. Loans must be repaid before deadline (plus 2-minute grace period) or lenders can claim collateral.

## Quick Start (Local)

### Prerequisites:

- Prividium Docker Images access - described [here](https://github.com/matter-labs/local-prividium?tab=readme-ov-file#1-authenticate-with-docker-registry)
- [Rust](https://www.rust-lang.org/tools/install) - recommended version ~`1.92`
- [Forge](https://github.com/foundry-rs/foundry) - version `1.3.4`
- [Node.js](https://nodejs.org/en/download/) - recommended version `22.x`
- [Docker](https://docs.docker.com/get-docker/) - to run Prividium services
- [Homebrew](https://brew.sh/) - to install `process-compose` for easy local setup
- Demo was tested on macOS ARM system

### Setup

```bash
# Clone repo with submodules
git clone --recurse-submodules https://github.com/JackHamer09/prividium-institutional-demo

# Install `process-compose`
# a process orchestration tool for easy local setup
brew install f1bonacc1/tap/process-compose

# Copy environment config
# has working default values out-of-the-box
cp .env.example .env
```

### Start

```bash
process-compose up
```

1. Wait for all services to start and commands to complete

    - The process list is scrollable, use navigation buttons to see all processes

1. Continue to Prividium and apps by checking sections [Links](#links) and [Demo](#demo) below

- **Navigation**: Arrow keys to switch between processes, mouse can also be used
- **Quit**: Press `F10` to stop all processes and exit
- **Note:** Chain data is not persisted between restarts, except Prividium related data (users, contracts, permissions, etc).

## Links:

- Intraday Repo App - [localhost:3004](http://localhost:3004)
- **Chain 1**
  - Prividium User Panel - [localhost:3001](http://localhost:3001)
  - Prividium Admin Panel - [localhost:3000](http://localhost:3000)
  - Block Explorer - [localhost:3010](http://localhost:3010)
- **Chain 2**
  - Prividium User Panel - [localhost:3301](http://localhost:3301)
  - Prividium Admin Panel - [localhost:3300](http://localhost:3300)
  - Block Explorer - [localhost:3310](http://localhost:3310)

---

## Demo:

### Prerequisites:

- You will need 2 separate browsers or Chrome browser [profiles](https://support.google.com/chrome/answer/2364824),
  to simulate 2 users.
- [MetaMask](https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) wallet browser extension installed in both browsers/profiles.

### Steps:
1. **Login to Prividium User Panel:**
    - Open [Prividium User Panel - Chain 1](http://localhost:3001) in Browser/Profile 1
    - Click on OIDC login button
    - Use credentials:
      - Email: `admin@local.dev`
      - Password: `password`
      - Confirm login
    - Repeat the same for [Prividium User Panel - Chain 2](http://localhost:3301) in Browser/Profile 2
1. **Setup MetaMask for both chains:**
    - Open MetaMask extension
    - Click on account dropdown
    - `Add Wallet` -> `Import an account`
    - Use private key (Anvil #0 account): `0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110`
    - Repeat for both browsers/profiles
1. **Add Prividium chains to MetaMask:**
    - Go to [User Panel - Chain 1](http://localhost:3001)
    - In the `Network Configuration` section, click `Add to Network to Wallet` -> Confirm in MetaMask
    - Repeat for [User Panel - Chain 2](http://localhost:3301)
1. **Login to Intraday Repo App:**
    - Open [Intraday Repo App](http://localhost:3004) in Browser/Profile 1
    - Login with Prividium
    - Connect previously imported MetaMask account
    - Repeat for Browser/Profile 2
1. **Start using the app!**
    - Create lending offers, accept them, repay loans, and claim collateral if needed.

---

## Permissions

1. Login to
    - [Prividium Admin Panel - Chain 1](http://localhost:3000)
    - [Prividium Admin Panel - Chain 2](http://localhost:3300)
1. Go to `Contracts` page to view and manage permissions that are setup for each chain.

---

## Useful Scripts

### Mint Tokens

Mint test tokens to any address (only works with [TestnetERC20Token](./contracts/src/TestnetERC20Token.sol) contracts deployed on local chain):

```bash
./scripts/mint.sh <TO_ADDRESS> <TOKEN_ADDRESS> <AMOUNT> <PRIVATE_KEY> <RPC_URL>
```

**Decimal reference:**

- USDC: 6 decimals (1 USDC = 1000000)
- TTBILL: 18 decimals (1 TTBILL = 1000000000000000000)
- SGD: 18 decimals (1 SGD = 1000000000000000000)

**Example (mint 1000 USDC on chain 1):**

```bash
./scripts/mint.sh 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 1000000000 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 http://localhost:3050
```

### Deposit ETH (L1 to L2)

Deposit ETH from L1 to L2 via the bridge contract. The script automatically fetches the Bridgehub contract address from L2:

```bash
./scripts/deposit.sh <CHAIN_ID> <TO_ADDRESS> <AMOUNT_IN_WEI> <PRIVATE_KEY> <L1_RPC> <L2_RPC>
```

**Example (deposit 1000 ETH to chain 1):**

```bash
./scripts/deposit.sh 6565 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000000000000000 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 http://127.0.0.1:8545 http://127.0.0.1:3050
```

## Tests

Contract tests only. See [contracts/README.md](./contracts/README.md).

## License

MIT
