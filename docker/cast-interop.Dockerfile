# Build context: ./cast-interop (submodule root)
# Multi-stage Rust build for cast-interop binary

# Stage 1: Chef - prepare recipe for dependency caching
FROM rust:1.92-bookworm AS chef
RUN cargo install cargo-chef
WORKDIR /app
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Builder - build dependencies from recipe, then build the app
FROM rust:1.92-bookworm AS builder
RUN cargo install cargo-chef
WORKDIR /app
COPY --from=chef /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release

# Stage 3: Runtime - minimal image with just the binary
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/cast-interop /usr/local/bin/cast-interop
ENTRYPOINT ["cast-interop"]
