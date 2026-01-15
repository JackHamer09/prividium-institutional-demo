# Intraday Repo - Architecture

## Tech Stack

- **Framework**: Nuxt v4 (SPA mode, no SSR)
- **UI**: Tailwind CSS v4, @headlessui/vue
- **State Management**: Pinia (no persistence)
- **Web3**: @wagmi/core, viem
- **Utilities**: VueUse, date-fns, zod
- **Notifications**: Sonner
- **Fonts**: Inter (body), Onest (headings)

## Development Practices

- **Component Structure**: Template first, script at bottom using `<script lang="ts" setup>`
- **Styling**: Inline Tailwind classes preferred, `<style lang="scss" scoped>` for repeated patterns only
- **No localStorage**: All data fetched fresh from blockchain
- **DRY Principle**: Reusable composables and utility functions
- **Type Safety**: Full TypeScript, runtime validation with Zod

## Project Structure

```
app/
├── assets/
│   └── css/
│       └── main.css              # Global styles, Tailwind config
├── components/
│   ├── auth/
│   │   └── ConnectionView.vue    # Wallet connection screen
│   ├── common/
│   │   ├── Badge.vue             # Status badges
│   │   ├── Button.vue            # Reusable button
│   │   ├── Input.vue             # Form input
│   │   ├── LoadingSpinner.vue    # Loading indicator
│   │   ├── Modal.vue             # Modal dialog (Headless UI)
│   │   └── Select.vue            # Dropdown selector (Headless UI)
│   ├── layout/
│   │   ├── AccountDropdown.vue   # User account menu
│   │   └── Header.vue            # App header
│   └── repo/
│       ├── CreateOfferButton.vue # Opens create offer modal
│       ├── CreateOfferModal.vue  # New offer form
│       └── TokenBalances.vue     # Token balances display
├── composables/
│   ├── useBalances.ts            # Token balance management
│   ├── useRepoContract.ts        # Repo contract interactions
│   ├── useRpcStatus.ts           # RPC health monitoring
│   ├── useToast.ts               # Toast notifications wrapper
│   ├── useTokenContract.ts       # ERC20 token interactions
│   └── useWagmiConfig.ts         # Wagmi config access
├── config/
│   ├── chains.ts                 # Chain configurations (Sepolia)
│   ├── repo.ts                   # Repo constants (durations, fees)
│   └── tokens.ts                 # Token configurations
├── contracts/
│   └── intraday-repo.ts          # Contract ABIs and types
├── layouts/
│   └── default.vue               # Main layout (auth gate)
├── pages/
│   └── index.vue                 # Main repo page
├── plugins/
│   └── wagmi.client.ts           # Wagmi initialization
├── stores/
│   ├── balances.ts               # Token balances store
│   ├── repo.ts                   # Repo offers store
│   └── wallet.ts                 # Wallet connection store
├── utils/
│   ├── formatters.ts             # Formatting utilities
│   ├── repo-status.ts            # Offer status calculations
│   └── validation.ts             # Zod schemas
└── app.vue                       # Root component
```

## Key Components

### Wagmi Plugin (`plugins/wagmi.client.ts`)
Initializes @wagmi/core with Sepolia chain and injected wallet connector. Provides `$wagmiConfig` globally.

### Wallet Store (`stores/wallet.ts`)
Manages wallet connection state. Methods: `initialize()`, `connectWallet()`, `disconnectWallet()`, `cleanup()`.

### Repo Contract Composable (`composables/useRepoContract.ts`)
Contract interactions: `createOffer()`, `acceptOffer()`, `repayLoan()`, `claimCollateral()`, `cancelOffer()`.
Read functions: `getOpenOffers()`, `getLenderOffers()`, `getBorrowerOffers()`.

### Token Contract Composable (`composables/useTokenContract.ts`)
ERC20 interactions: `getBalance()`, `approve()`, `getAllowance()`, `ensureApproval()`.

### Status Calculator (`utils/repo-status.ts`)
Calculates offer display status from contract data. Handles: Open → Active → Grace Period → Past Due transitions.

## Environment Configuration

Required env vars (see `.env.example`):
- `NUXT_PUBLIC_SEPOLIA_RPC_URL`
- `NUXT_PUBLIC_INTRADAY_REPO_CONTRACT_ADDRESS`
- `NUXT_PUBLIC_USDC_ADDRESS`
- `NUXT_PUBLIC_TTBILL_ADDRESS`
- `NUXT_PUBLIC_SGD_ADDRESS`

Validated with Zod at runtime (`utils/validation.ts`).

## State Flow

1. **Connection**: User connects wallet → `WalletStore` updates → Layout switches from auth view to main content
2. **Data Loading**: Page mounts → Fetch offers & balances → Store in Pinia
3. **Real-time Updates**: 10-second polling refreshes offers
4. **Transactions**: Approval → Contract interaction → Success toast → Data refresh

## Design System

- **Colors**: Blue (primary actions), Green (positive status), Red (negative/urgent), Yellow (warnings), Slate (neutral)
- **Typography**: Onest for headings, Inter for body text
- **Spacing**: Consistent 4px/8px grid
- **Buttons**: Primary (blue), Secondary (slate), Danger (red), Ghost (transparent)
- **Status Badges**: Colored pills with appropriate semantic colors

## Contract Interaction Pattern

```typescript
// 1. Ensure approval if needed
const approved = await ensureApproval(tokenAddress, owner, spender, amount)
if (!approved) return

// 2. Execute contract call
const hash = await writeContract(config, { ... })
toast.loading('Processing...')

// 3. Wait for confirmation
await waitForTransactionReceipt(config, { hash })
toast.success('Success!')

// 4. Refresh data
await refreshOffers()
```

## Future Enhancements

- History table with filtering (status, role)
- Real-time countdown timers (1-second updates)
- Enhanced table components with sorting
- Cross-chain (interop) support
- Transaction history caching
- Error recovery patterns
