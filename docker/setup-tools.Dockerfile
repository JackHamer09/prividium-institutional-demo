# Build context: repo root
# Combined Foundry + Node.js toolbox for setup tasks (deposit, deploy, mint, bridge, seed)

# Stage 1: Grab foundry binaries
FROM ghcr.io/foundry-rs/foundry:v1.3.4 AS foundry

# Stage 2: Build SDK and install script dependencies
FROM node:22-bookworm-slim AS builder

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git ca-certificates postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy foundry binaries (cast, forge, anvil)
COPY --from=foundry /usr/local/bin/forge /usr/local/bin/forge
COPY --from=foundry /usr/local/bin/cast /usr/local/bin/cast

WORKDIR /workspace

# Build SDK first
COPY sdk/package.json sdk/package-lock.json ./sdk/
RUN cd sdk && npm ci
COPY sdk/ ./sdk/
RUN cd sdk && npm run build

# Install scripts dependencies
COPY scripts/package.json scripts/package-lock.json* ./scripts/
RUN cd scripts && npm install
COPY scripts/ ./scripts/

# Copy contracts (with submodule libs)
COPY contracts/ ./contracts/
# Create contracts .env from example if needed
RUN cp -n ./contracts/.env.example ./contracts/.env 2>/dev/null || true

# Copy shell scripts
COPY scripts/deposit.sh scripts/mint.sh ./scripts/

# Copy prividium seed SQL files
COPY prividium-utils/dev/seed-permissions-l2a.sql prividium-utils/dev/seed-permissions-l2b.sql ./prividium-utils/dev/

WORKDIR /workspace
