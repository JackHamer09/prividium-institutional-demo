# Build context: repo root
# Multi-stage Node build for Nuxt production app (single-chain)

# Stage 1: Build the Nuxt app
FROM node:22-alpine AS app-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source and build
COPY . ./
RUN pnpm build

# Stage 2: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=app-builder /app/.output ./.output

ENV PORT=3500
EXPOSE 3500

# NUXT_PUBLIC_* env vars are picked up at runtime by Nuxt
CMD ["node", ".output/server/index.mjs"]
