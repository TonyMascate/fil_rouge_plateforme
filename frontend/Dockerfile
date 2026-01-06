# --- Stage 1: Base ---
FROM oven/bun:1 AS base
WORKDIR /app

# --- Stage 2: Dépendances ---
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Stage 3: Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Désactivation de la télémétrie Next.js pour le build
ENV NEXT_TELEMETRY_DISABLED 1

# Si tu as besoin d'URLs d'API au build, déclare-les ici
# ARG NEXT_PUBLIC_API_URL
# ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN bun run build

# --- Stage 4: Production (Image finale) ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copie des assets publics
COPY --from=builder /app/public ./public

# Copie du mode Standalone (le serveur minimal généré par Next.js)
# Assure-toi d'avoir mis output: 'standalone' dans next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# NextJS en mode standalone génère un server.js à la racine
CMD ["bun", "server.js"]