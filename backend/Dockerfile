# --- Stage 1: Base ---
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# --- Stage 2: Dépendances ---
FROM base AS deps
# On copie uniquement les fichiers de gestion de paquets pour profiter du cache Docker
COPY package.json bun.lockb ./
# Installation propre et rapide
RUN bun install --frozen-lockfile

# --- Stage 3: Build ---
FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# Compile le TypeScript en JavaScript (dossier /dist)
RUN bun run build

# --- Stage 4: Production (Image finale) ---
FROM base AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# On crée un utilisateur non-root pour la sécurité (Bonne pratique DevOps)
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# On récupère uniquement le build et les modules nécessaires
COPY --from=builder --chown=nestjs:nestjs /usr/src/app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /usr/src/app/package.json ./

USER nestjs

# Port par défaut de NestJS
EXPOSE 3000

# Lancement optimisé avec Bun
CMD ["bun", "run", "dist/main.js"]