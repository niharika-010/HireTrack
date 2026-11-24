# Multi-stage Dockerfile for deploying the HireTrack Loco.rs backend on Render

# Stage 1: Build the optimized Rust release binary
FROM rust:1-slim-bookworm AS builder

WORKDIR /app

# Install native build dependencies required by Rust crates
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests and source code
COPY Cargo.toml Cargo.lock ./
COPY migration ./migration
COPY src ./src
COPY config ./config

# Compile the Loco.rs CLI/server binary in release mode
RUN cargo build --release --bin hiretrack_backend-cli

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary and Loco YAML configuration directory
COPY --from=builder /app/target/release/hiretrack_backend-cli /app/hiretrack_backend-cli
COPY --from=builder /app/config /app/config

# Create persistent resume storage directory (can be backed by a Render Disk)
RUN mkdir -p /app/storage/resumes

ENV LOCO_ENV=production
ENV PORT=5150

EXPOSE 5150

CMD ["/app/hiretrack_backend-cli", "start"]
