# # --- Stage 1: Base ---
# FROM oven/bun:1 AS base
# WORKDIR /app

# # --- Stage 2: Dépendances ---
# FROM base AS deps
# # Correction: bun.lock (sans 'b')
# COPY package.json bun.lock ./
# RUN bun install --frozen-lockfile

# # --- Stage 3: Build ---
# FROM base AS builder
# COPY --from=deps /app/node_modules ./node_modules
# COPY . .

# # Correction Warning: Ajout du '='
# ENV NEXT_TELEMETRY_DISABLED=1

# RUN bun run build

# # --- Stage 4: Production (Image finale) ---
# FROM base AS runner
# WORKDIR /app

# # Correction Warning: Ajout du '=' partout
# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1
# ENV PORT=3000

# # On supprime addgroup/adduser et on utilise 'bun'
# USER bun

# COPY --from=builder /app/public ./public

# # On change le propriétaire pour 'bun'
# # Assure-toi d'avoir output: "standalone" dans next.config.ts/mjs
# COPY --from=builder --chown=bun:bun /app/.next/standalone ./
# COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

# EXPOSE 3000

# CMD ["bun", "server.js"]

# VERSION 2
# apps/web/Dockerfile

# --- 1. LE DÉCOUPEUR ---
FROM oven/bun:1 AS pruner
WORKDIR /app
RUN bun add -g turbo
COPY . .
# ⚠️ Remplace 'web' par le "name" dans apps/web/package.json
RUN turbo prune --scope=web --docker

# --- 2. L'INSTALLATEUR ---
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run turbo run build --filter=web

# --- 3. L'IMAGE FINALE ---
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

USER bun

# Configuration spéciale Next.js Standalone
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=bun:bun /app/apps/web/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
# Attention au chemin ici, on lance depuis la racine du standalone
CMD ["bun", "apps/web/server.js"]