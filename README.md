# Intraday Repo

Short-term collateralized lending market built on [Prividium](https://github.com/matter-labs/zksync-prividium) - a privacy-preserving blockchain infrastructure.

Lenders create offers specifying loan terms (amount, collateral, duration, fee). Borrowers accept offers by depositing collateral and receiving funds. Loans must be repaid before deadline (plus 2-minute grace period) or lenders can claim collateral.

## Setup

### 1. Prividium Environment

Set up the [Prividium](https://github.com/matter-labs/zksync-prividium) environment.

### 1.1 Register App in Admin Panel

In the Prividium admin panel, create an App Integration with:
- **Whitelisted Origin**: `[app-domain]` (e.g., `http://localhost:3000`)
- **Whitelisted Callback URL**: `[app-domain]/auth/callback` (e.g., `http://localhost:3000/auth/callback`)

Note the generated OAuth Client ID for use in `.env` configuration.

### 2. Deploy Contracts

See [contracts/README.md](./contracts/README.md) for deployment instructions.

After deployment, note the addresses for:
- IntradayRepo contract
- 3 ERC20 tokens (USDC, TTBILL, SGD)

### 3. Whitelist Contracts in Prividium Admin Panel

In the Prividium admin panel, whitelist the following contracts and their functions:

- **IntradayRepo Contract** (ABI: [app/abi/IntradayRepo.ts](./app/abi/IntradayRepo.ts))
- **3 Token Contracts** (standard ERC20)

### 4. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your deployed contract addresses and Prividium configuration.

#### ZKsync SSO (Optional)

To enable ZKsync SSO authentication alongside browser wallets, set the SSO auth server URL:

```bash
NUXT_PUBLIC_ZKSYNC_SSO_AUTH_SERVER_URL=http://localhost:3002/confirm
```

### 5. Run Frontend

```bash
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000`

## Tests

Contract tests only. See [contracts/README.md](./contracts/README.md).

## License

MIT
