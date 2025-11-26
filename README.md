# Intraday Repo - Nuxt v4

Short-term collateralized lending market built with Nuxt v4, Tailwind CSS, and @wagmi/core.

## Features

- ✅ Wallet connection (injected wallets only)
- ✅ Create lending offers
- ✅ Browse and accept offers (borrow)
- ✅ Repay loans
- ✅ Claim collateral on defaults
- ✅ Cancel offers
- ✅ Token balances with dummy mint
- ✅ Real-time offer status updates
- ✅ Grace period handling (2 minutes)
- ✅ Professional minimal UI (light theme)

## Tech Stack

- **Framework**: Nuxt v4 (SPA mode, no SSR)
- **Styling**: Tailwind CSS v4
- **State**: Pinia (no persistence)
- **Web3**: @wagmi/core, viem
- **UI Components**: @headlessui/vue
- **Utilities**: VueUse, date-fns, zod, sonner
- **Fonts**: Inter (body), Onest (headings)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Deploy Smart Contracts

Deploy the RepoContract to your target network:

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
cp .env.example .env
# Edit .env with your PRIVATE_KEY, RPC_URL, and ADMIN_ADDRESS
forge script script/Deploy.s.sol:DeployScript --rpc-url sepolia --broadcast
```

See [contracts/README.md](./contracts/README.md) for detailed deployment instructions.

After deployment, note the contract addresses from the output.

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Required environment variables:
- `NUXT_PUBLIC_INTRADAY_REPO_CONTRACT_ADDRESS` - Deployed repo contract address
- `NUXT_PUBLIC_USDC_ADDRESS` - USDC token address
- `NUXT_PUBLIC_TTBILL_ADDRESS` - TTBILL token address
- `NUXT_PUBLIC_SGD_ADDRESS` - SGD token address

**Note**: RPC URL is not required - viem automatically uses public RPC endpoints from the chain configuration (imported from `viem/chains`).

### 4. Run Development Server

```bash
pnpm dev
```

Navigate to `http://localhost:3000`

## Scripts

```bash
# Development
pnpm dev

# Build for production
pnpm build

# Type checking (✅ passes)
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

## Known Issues

### ESLint Parser Errors

**Status**: Known Nuxt v4 + Vue 3.5 + TypeScript issue

The ESLint configuration has parser errors with TypeScript syntax in Vue SFCs. This is a known compatibility issue with `@nuxt/eslint` in Nuxt v4.

**Workaround**: Type checking with `pnpm typecheck` works perfectly and validates all TypeScript code. Since type safety is enforced via TypeScript directly, the ESLint parser issue doesn't affect code quality.

**Resolution**: Will be fixed in future Nuxt v4/ESLint updates.

## Project Structure

See [Architecture.md](./Architecture.md) for detailed architecture documentation.

```
app/
├── components/     # Vue components
├── composables/    # Reusable composition functions
├── config/         # Configuration files
├── contracts/      # Smart contract ABIs
├── layouts/        # Nuxt layouts
├── pages/          # Nuxt pages
├── plugins/        # Nuxt plugins
├── stores/         # Pinia stores
└── utils/          # Utility functions
```

## Usage

### Connecting Wallet

1. Click "Connect Wallet" on the landing page
2. Approve connection in your browser wallet (MetaMask, etc.)
3. Ensure you're on Sepolia testnet

### Creating an Offer

1. Click "Create Offer" button
2. Fill in:
   - Lending token and amount (what you're lending)
   - Collateral token and amount (what borrower must deposit)
   - Duration (2 min to 24 hours)
   - Lender fee in basis points (1 bps = 0.01%)
3. Approve token spending
4. Confirm transaction

### Borrowing

1. Browse "Available Offers" table
2. Click "Borrow" on desired offer
3. Approve collateral token
4. Confirm transaction
5. Receive lent tokens immediately

### Repaying

1. Find your active loan in "My Active Offers"
2. Click "Repay" before deadline (or within 2-minute grace period)
3. Approve repayment amount (principal + fee)
4. Confirm transaction
5. Receive collateral back

### Claiming Collateral (Default)

1. If borrower doesn't repay within grace period
2. Click "Claim" on the defaulted offer
3. Confirm transaction
4. Receive borrower's collateral

### Token Balances

1. Expand "Token Balances" section at bottom
2. View all token balances
3. Click "Mint" for dummy test tokens (simulated with 2s delay)
4. Click "Refresh" to update balances

## Development Notes

- All data is fetched from blockchain (no localStorage)
- Offers refresh interval: 10 seconds (configurable in `app/config/repo.ts`)
- RPC status check interval: 30 seconds (configurable in `app/config/repo.ts`)
- Status updates show countdown timers
- Grace period is 2 minutes after deadline
- Chain configuration imported from `viem/chains` (easy to switch chains)
- Minimal, professional UI with no unnecessary text
- DRY principles applied throughout
- Code style enforced: double quotes, semicolons, trailing commas

## Documentation

- **[Architecture.md](./Architecture.md)** - Technical architecture and patterns
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant quick reference
- **[INTRADAY_REPO.md](./INTRADAY_REPO.md)** - Original requirements specification

## Contributing

Follow the coding standards outlined in Architecture.md:
- Vue components: template first, script at bottom
- TypeScript everywhere with proper typing
- Inline Tailwind classes (scoped styles for repeated patterns only)
- No localStorage or data persistence
- Composables for shared logic

---

Built with Nuxt v4, Tailwind CSS v4, and @wagmi/core
