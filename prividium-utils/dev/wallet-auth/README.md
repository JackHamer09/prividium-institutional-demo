# Wallet Auth Seed Data

This directory contains seed data for crypto-native authentication testing.

## Overview

The `seed-wallet-auth.sql` script seeds the database with test users for development and E2E testing.

## Test Users

The seed script creates three users with their associated wallets:

| User    | Display Name | Wallet Address                               | Roles |
| ------- | ------------ | -------------------------------------------- | ----- |
| Admin   | Admin User   | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | admin |
| Regular | Regular User | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | user  |
| Test    | Test User    | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | user  |

## Wallet Addresses

All wallet addresses are derived from the E2E test mnemonic:

```
test test test test test test test test test test test junk
```

These are the standard Hardhat/Anvil test accounts (accounts 0-2).

## Usage

The seed script is automatically run after database migrations when you run:

```bash
yarn dev        # For development
yarn dev:e2e    # For E2E testing
```

You can also run it manually:

```bash
cd apps/permissions-api
yarn db:seed        # For development
yarn db:seed:e2e    # For E2E testing
```

## Notes

- The script is idempotent - it uses `ON CONFLICT DO NOTHING` clauses so it can be run multiple times safely
- The script assumes migrations have already been run and tables exist
