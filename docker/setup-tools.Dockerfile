# Build context: repo root
# Combined Foundry + Node.js toolbox for setup tasks (deposit, deploy, mint, seed)

# Stage 1: Grab foundry binaries
FROM ghcr.io/foundry-rs/foundry:v1.3.4 AS foundry

# Stage 2: Runtime with tools
FROM node:22-bookworm-slim

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl git ca-certificates postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy foundry binaries (cast, forge)
COPY --from=foundry /usr/local/bin/forge /usr/local/bin/forge
COPY --from=foundry /usr/local/bin/cast /usr/local/bin/cast

WORKDIR /workspace

# Copy contracts (with submodule libs)
COPY contracts/ ./contracts/
# Create contracts .env from example if needed
RUN cp -n ./contracts/.env.example ./contracts/.env 2>/dev/null || true

# Copy shell scripts
COPY scripts/mint.sh ./scripts/
RUN chmod +x ./scripts/mint.sh

# Copy prividium seed SQL file
COPY prividium-utils/dev/seed-permissions.sql ./prividium-utils/dev/seed-permissions.sql

WORKDIR /workspace
