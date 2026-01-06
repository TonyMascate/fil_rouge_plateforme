# --- Stage 1: Base ---
FROM oven/bun:1 AS base
WORKDIR /app

# --- Stage 2: Dépendances ---
FROM base AS deps
# Correction: bun.lock (sans 'b')
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Stage 3: Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Correction Warning: Ajout du '='
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# --- Stage 4: Production (Image finale) ---
FROM base AS runner
WORKDIR /app

# Correction Warning: Ajout du '=' partout
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# On supprime addgroup/adduser et on utilise 'bun'
USER bun

COPY --from=builder /app/public ./public

# On change le propriétaire pour 'bun'
# Assure-toi d'avoir output: "standalone" dans next.config.ts/mjs
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

EXPOSE 3000

CMD ["bun", "server.js"]