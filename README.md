# Intraday Repo

Short-term collateralized lending market built on [Prividium](https://zksync.io/prividium) - a privacy-preserving blockchain infrastructure.

Lenders create offers specifying loan terms (amount, collateral, duration, fee). Borrowers accept offers by depositing collateral and receiving funds. Loans must be repaid before deadline (plus 2-minute grace period) or lenders can claim collateral.

## Quick Start (Local)

### Prerequisites:

- [Git](https://git-scm.com/downloads) (or e.g. [GitHub Desktop](https://desktop.github.com/))
- [Docker](https://www.docker.com/products/docker-desktop)
- Prividium Docker Images access (provided by the MatterLabs team):
```bash
DOCKER_USERNAME=matterlabs_enterprise+your_username
DOCKER_PASSWORD=super_secret_provided_by_matterlabs

docker login -u=$DOCKER_USERNAME -p=$DOCKER_PASSWORD quay.io
```

### Setup

```bash
# Clone repo with submodules
git clone --recurse-submodules https://github.com/JackHamer09/prividium-institutional-demo -b single-chain
```

### Start

```bash
docker compose -f ./prividium-utils/docker-compose.yaml up -d
```

1. Wait for all services to start — init containers (deposit, deploy, mint) will run automatically in order
1. Continue by checking section [Demo](#demo) below

- **Note:** Chain data is not persisted between restarts. To run again you will firstly need to reset the environment:

```bash
docker compose -f ./prividium-utils/docker-compose.yaml down -v
```

---

## Demo:

### Prerequisites:

- You will need 2 separate browsers or Chrome browser [profiles](https://support.google.com/chrome/answer/2364824),
  to simulate 2 users.
- [MetaMask](https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn) wallet browser extension installed in both browsers/profiles.

### Steps:

1. **Setup MetaMask with demo accounts:**
   - **Browser/Profile 1 (user1):**
     - Open MetaMask -> Account dropdown -> `Add Wallet` -> `Import an account`
     - Use private key: `0x93dd39ca8b2666c9bf1cee643f18df4fef6ca96668302978675af1d717459706`
   - **Browser/Profile 2 (user2):**
     - Open MetaMask -> Account dropdown -> `Add Wallet` -> `Import an account`
     - Use private key: `0x6a657d9f98808f0d551411319b851b35e9ef6fca68f38ccc9b92871ec61e1efb`
1. **Login to Prividium User Panel:**
   - **Browser/Profile 1:**
     - Open [Prividium User Panel](http://localhost:3001)
     - Click on `Sign in with Keycloak` button
     - Use credentials: `user1@local.dev` / `password`
   - **Browser/Profile 2:**
     - Open [Prividium User Panel](http://localhost:3001)
     - Click on `Sign in with Keycloak` button
     - Use credentials: `user2@local.dev` / `password`
1. **Add Prividium chain to MetaMask:**
   - Go to [User Panel - Wallets](http://localhost:3001/wallets) page
   - In the `Network Configuration` section, click `Add Network to Wallet` -> Confirm in MetaMask
1. **Login to Intraday Repo App:**
   - Open [Intraday Repo App](http://localhost:3500) in both browsers
   - Login with Prividium (user1 in Browser 1, user2 in Browser 2)
   - Connect the corresponding MetaMask account
1. **Start using the app!**
   - Create lending offers, accept them, repay loans, and claim collateral if needed.

---

## Links:

- Intraday Repo App - [localhost:3500](http://localhost:3500)
- Prividium User Panel - [localhost:3001](http://localhost:3001)
- Prividium Admin Panel - [localhost:3000](http://localhost:3000)
- Block Explorer - [localhost:3010](http://localhost:3010)
- Keycloak - [localhost:5080](http://localhost:5080)
- L2 RPC - [localhost:5050](http://localhost:5050)
- L1 RPC (Anvil) - [localhost:5010](http://localhost:5010)

---

## Permissions

1. Login to Admin Panel with credentials: `admin@local.dev` / `password`
   - _Note: Use a separate browser/profile or logout from demo user first via Prividium User Panel._
   - [Prividium Admin Panel](http://localhost:3000)
1. Go to `Contracts` page to view and manage permissions.

---

## Useful Scripts

### Mint Tokens

Mint test tokens to any address (only works with [TestnetERC20Token](./contracts/src/TestnetERC20Token.sol) contracts deployed on local chain):

```bash
./scripts/mint.sh <TO_ADDRESS> <TOKEN_ADDRESS> <AMOUNT> <PRIVATE_KEY> <RPC_URL>
```

**Decimal reference:**

- USDC: 6 decimals (1 USDC = 1000000)
- TUST: 18 decimals (1 TUST = 1000000000000000000)
- SGD: 18 decimals (1 SGD = 1000000000000000000)

**Example (mint 1000 USDC):**

```bash
./scripts/mint.sh 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 1000000000 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 http://localhost:5050
```

### Deposit ETH (L1 to L2)

Deposit ETH from L1 to L2 via the bridge contract. The script automatically fetches the Bridgehub contract address from L2:

```bash
./scripts/deposit.sh <TO_ADDRESS> <AMOUNT_IN_WEI> <PRIVATE_KEY> <L1_RPC> <L2_RPC>
```

**Example (deposit 1000 ETH):**

```bash
./scripts/deposit.sh 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000000000000000 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 http://localhost:5010 http://localhost:5050
```

---

## Local Development

For developing the frontend locally (outside Docker):

```bash
cp .env.example .env
# Update .env with contract addresses and Prividium config
pnpm install
pnpm dev
```

See [contracts/README.md](./contracts/README.md) for contract deployment instructions.

---

## Tests

Contract tests only. See [contracts/README.md](./contracts/README.md).

## License

MIT
