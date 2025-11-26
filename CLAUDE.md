# CLAUDE.md - AI Assistant Guide

## Project Overview

**Intraday Repo**: Short-term collateralized lending market built with Nuxt v4.

See [Architecture.md](./Architecture.md) for full technical details.

## Quick Reference

### Stack
- Nuxt v4 (SPA), Tailwind CSS v4, Pinia, @wagmi/core, viem, @headlessui/vue

### Component Style
```vue
<template>
  <!-- Template first -->
</template>

<script lang="ts" setup>
// Script at bottom
</script>

<style lang="scss" scoped>
// Only for repeated patterns
</style>
```

### Key Patterns

**Wallet Connection:**
```typescript
const walletStore = useWalletStore()
await walletStore.connectWallet()
```

**Contract Interaction:**
```typescript
const { createOffer } = useRepoContract()
await ensureApproval(token, owner, spender, amount)
await createOffer({ ... })
```

**Token Balances:**
```typescript
const { refreshBalances } = useBalances()
await refreshBalances()
```

### Common Tasks

**Add new component:**
- Common UI: `components/common/`
- Repo-specific: `components/repo/`
- Layout: `components/layout/`

**Add new composable:**
- Place in `composables/`
- Auto-imported by Nuxt
- Use `useWagmiConfig()` for wagmi access

**Add new config:**
- Chains: `config/chains.ts`
- Tokens: `config/tokens.ts`
- Constants: `config/repo.ts`

**Styling:**
- Prefer inline Tailwind classes
- Use `@apply` in `<style scoped>` for repeated patterns
- Colors: blue (primary), green (success), red (danger), yellow (warning)

### Development

```bash
# Install
pnpm install

# Dev
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Build
pnpm build
```

### Environment

Copy `.env.example` to `.env` and fill in:
- RPC URL
- Contract addresses (Repo + 3 tokens)

### Important Notes

- **No localStorage**: Everything from blockchain
- **No SSR**: Client-side only
- **Single chain**: Sepolia testnet
- **Injected wallets only**: No WalletConnect/modals
- **Pinia**: No persistence across refreshes
- **Real-time**: Polling for offers

### File Locations

- **Contracts/ABIs**: `app/contracts/`
- **Config**: `app/config/`
- **Composables**: `app/composables/`
- **Components**: `app/components/`
- **Stores**: `app/stores/`
- **Utils**: `app/utils/`
- **Pages**: `app/pages/`

### Status Calculation

Offers transition: `Open` → `Active` → `Grace Period` (2min) → `Past Due`

Use `calculateOfferStatus()` from `utils/repo-status.ts`.

### Common Utilities

```typescript
// Formatting
formatTokenAmount(amount, decimals)
formatAddress(address)
formatBps(bps)
formatCountdown(seconds)

// Config
calculateFeeAmount(amount, bps, decimals)

// Status
calculateOfferStatus(offer, currentTime)
```

