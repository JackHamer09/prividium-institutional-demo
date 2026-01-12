# RepoContract - Foundry Deployment

Native Ethereum smart contracts for the Intraday Repo application.

## Prerequisites

Install Foundry:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Setup

1. Install dependencies:

```bash
forge install
```

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `PRIVATE_KEY` - Deployer private key (without 0x prefix)
- `RPC_URL` - Network RPC endpoint (e.g., Sepolia)
- `ADMIN_ADDRESS` - Admin address for contract management
- `DEPLOY_TEST_TOKENS` - Set to `true` to deploy test tokens

## Build

Compile contracts:

```bash
forge build
```

## Deploy

```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url [PRIVIDIUM_SEQUENCER_RPC_URL] --broadcast
```

The script will output deployed contract addresses. Copy these addresses to your app's `.env` file:

```
RepoContract deployed at: 0x...
USDC deployed at: 0x...     (if DEPLOY_TEST_TOKENS=true)
TTBILL deployed at: 0x...   (if DEPLOY_TEST_TOKENS=true)
SGD deployed at: 0x...      (if DEPLOY_TEST_TOKENS=true)
```

## Test

Run tests:

```bash
forge test
```

## Contract Overview

**RepoContract** - Native Ethereum intraday lending with collateral:
- Create lending offers (lend tokens, require collateral)
- Accept offers (provide collateral, receive tokens)
- Repay loans (return tokens + fee, get collateral back)
- Claim collateral on default (after grace period)
- Admin functions (set grace period, change admin)

**TestnetERC20Token** - ERC20 token for testing with mint function
