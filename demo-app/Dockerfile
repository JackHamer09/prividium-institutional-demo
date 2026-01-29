# Build context: repo root
# Multi-stage Node build for Nuxt production app

# Stage 1: Build the SDK
FROM node:22-alpine AS sdk-builder
WORKDIR /sdk
COPY sdk/package.json sdk/package-lock.json ./
RUN npm ci
COPY sdk/ ./
RUN npm run build

# Stage 2: Build the Nuxt app
FROM node:22-alpine AS app-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy built SDK to where the file: dependency expects it
COPY --from=sdk-builder /sdk /sdk

# Install dependencies
COPY demo-app/package.json demo-app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy app source and build
COPY demo-app/ ./
RUN pnpm build

# Stage 3: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=app-builder /app/.output ./.output

ENV PORT=3004
EXPOSE 3004

# NUXT_PUBLIC_* env vars are picked up at runtime by Nuxt
CMD ["node", ".output/server/index.mjs"]
