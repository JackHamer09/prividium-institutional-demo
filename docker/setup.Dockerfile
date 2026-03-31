FROM node:22-slim

WORKDIR /app

COPY setup/package.json setup/pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY setup/ ./
COPY contracts/out/ ./contracts/

ENV CONTRACTS_DIR=/app/contracts

ENTRYPOINT ["node", "entrypoint.mjs"]
# CMD should be "deploy" or "seed" — set in docker-compose
