# --- Stage 1: Base ---
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# --- Stage 2: Dépendances ---
FROM base AS deps
# Correction: bun.lock (sans 'b')
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Stage 3: Build ---
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- Stage 4: Production (Image finale) ---
FROM base AS runner
WORKDIR /usr/src/app
# Correction Warning: Ajout du '='
ENV NODE_ENV=production

# On supprime les lignes addgroup/adduser car l'user 'bun' existe déjà
# On utilise l'utilisateur 'bun' natif de l'image
USER bun

# On change le propriétaire des fichiers pour 'bun'
COPY --from=builder --chown=bun:bun /usr/src/app/dist ./dist
COPY --from=builder --chown=bun:bun /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /usr/src/app/package.json ./

EXPOSE 3000

CMD ["bun", "run", "dist/main.js"]