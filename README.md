# Intraday Repo

Short-term collateralized lending market built on [Prividium](https://github.com/matter-labs/zksync-prividium) - a privacy-preserving blockchain infrastructure.

Lenders create offers specifying loan terms (amount, collateral, duration, fee). Borrowers accept offers by depositing collateral and receiving funds. Loans must be repaid before deadline (plus 2-minute grace period) or lenders can claim collateral.

## Quick Start (Local)

Start the entire development environment with a single command:

```bash
# Clone repo with submodules
git clone --recurse-submodules https://github.com/JackHamer09/prividium-institutional-demo

# Install `process-compose`
# a process orchestration tool for easy local setup
brew install f1bonacc1/tap/process-compose

# Copy environment config
cp .env.example .env

# Start everything
process-compose up -L debug.log
```

This starts all services with a TUI showing logs for each process:
- **Navigation**: Arrow keys to switch between processes, mouse can also be used
- **Quit**: Press `F10` to stop all processes and exit

**What gets started:**
| Process | Description | Port |
|---------|-------------|------|
| zkos-build | Compiles zksync-os-server | - |
| interop-build | Compiles cast-interop | - |
| zkos-cleanup | Removes old chain databases | - |
| anvil | L1 simulation | 8545 |
| chain1 | L2 sequencer (main) | 3050 |
| chain2 | L2 sequencer (secondary) | 3051 |
| interop-relay | Cross-chain message relay | - |
| prividium-pull | Pulls Docker images | - |
| prividium | Admin panels, block explorers | 3000-3310 |
| deposit | Bridges ETH from L1 to L2 | - |
| contracts-deploy | Deploys smart contracts | - |
| fund-repo | Sends 100 ETH to repo contract | - |
| mint-* | Mints test tokens | - |
| sdk-build | Builds the SDK | - |
| demo-app | Frontend dev server | 3004 |

**Note:** Chain data is not persisted between restarts, except Prividium data (users, contracts, permissions, etc).

## Links:
- [Demo App](http://localhost:3004)
- **Chain 1**
  - [Prividium User Panel](http://localhost:3001)
  - [Prividium Admin Panel](http://localhost:3000)
  - [Block Explorer](http://localhost:3010)
- **Chain 2**
  - [Prividium User Panel](http://localhost:3301)
  - [Prividium Admin Panel](http://localhost:3300)
  - [Block Explorer](http://localhost:3310)

## Scripts

Helper scripts are located in the `scripts/` folder.

### Mint Tokens

Mint test tokens to any address (only works with TestnetERC20Token):

```bash
./scripts/mint.sh <TO_ADDRESS> <TOKEN_ADDRESS> <AMOUNT> <PRIVATE_KEY> <RPC_URL>
```

**Decimal reference:**
- USDC: 6 decimals (1 USDC = 1000000)
- TTBILL: 18 decimals (1 TTBILL = 1000000000000000000)
- SGD: 18 decimals (1 SGD = 1000000000000000000)

**Example (mint 1000 USDC):**

```bash
./scripts/mint.sh 0xRecipient 0xUSDCAddress 1000000000 abc123...def http://localhost:3050
```

### Deposit ETH (L1 to L2)

Deposit ETH from L1 to L2 via the bridge contract. The script automatically fetches the Bridgehub contract address from L2:

```bash
./scripts/deposit.sh <CHAIN_ID> <TO_ADDRESS> <AMOUNT_IN_WEI> <PRIVATE_KEY> <L1_RPC> <L2_RPC>
```

**Example (deposit 1000 ETH to local chain):**

```bash
./scripts/deposit.sh 6565 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 1000000000000000000000 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 http://127.0.0.1:8545 http://127.0.0.1:3050
```

## Tests

Contract tests only. See [contracts/README.md](./contracts/README.md).

## License

MIT
