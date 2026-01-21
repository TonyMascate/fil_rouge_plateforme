# # --- Stage 1: Base ---
# FROM oven/bun:1 AS base
# WORKDIR /usr/src/app

# # --- Stage 2: Dépendances ---
# FROM base AS deps
# # Correction: bun.lock (sans 'b')
# COPY package.json bun.lock ./
# RUN bun install --frozen-lockfile

# # --- Stage 3: Build ---
# FROM base AS builder
# COPY --from=deps /usr/src/app/node_modules ./node_modules
# COPY . .
# RUN bun run build

# # --- Stage 4: Production (Image finale) ---
# FROM base AS runner
# WORKDIR /usr/src/app
# # Correction Warning: Ajout du '='
# ENV NODE_ENV=production

# # On supprime les lignes addgroup/adduser car l'user 'bun' existe déjà
# # On utilise l'utilisateur 'bun' natif de l'image
# USER bun

# # On change le propriétaire des fichiers pour 'bun'
# COPY --from=builder --chown=bun:bun /usr/src/app/dist ./dist
# COPY --from=builder --chown=bun:bun /usr/src/app/node_modules ./node_modules
# COPY --from=builder --chown=bun:bun /usr/src/app/package.json ./

# EXPOSE 3000

# CMD ["bun", "run", "dist/main.js"]

# VERSION 2

# apps/api/Dockerfile

# --- 1. LE DÉCOUPEUR ---
FROM oven/bun:1 AS pruner
WORKDIR /app
RUN bun add -g turbo
COPY . .
# ⚠️ Remplace 'api' ci-dessous par le "name" dans apps/api/package.json
RUN turbo prune --scope=api --docker

# --- 2. L'INSTALLATEUR ---
FROM oven/bun:1 AS builder
WORKDIR /app

# On copie les fichiers de config isolés par le découpeur
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile

# On copie le code source
COPY --from=pruner /app/out/full/ .

# On build l'API
RUN bun run turbo run build --filter=api

# --- 3. L'IMAGE FINALE ---
FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production
USER bun

# On récupère le dossier dist créé
COPY --from=builder --chown=bun:bun /app/apps/api/dist ./dist
# On récupère les dépendances
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "dist/main.js"]