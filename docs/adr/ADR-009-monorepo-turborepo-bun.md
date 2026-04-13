# ADR-009 — Monorepo & Build System : Turborepo + Bun

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon projet comprend deux applications (`apps/api`, `apps/web`) et un package partagé (`packages/shared`) contenant les types, schémas de validation et constantes communs. Je dois choisir une stratégie monorepo pour gérer ces workspaces, optimiser les builds, et simplifier le développement local et le CI/CD.

---

## Options considérées

### Orchestrateur de build monorepo

| Critère                        | Turborepo                     | Nx                            | Lerna                         | Scripts npm workspaces seuls  |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Courbe d'apprentissage         | Faible                        | Élevée                        | Moyenne                       | Nulle                         |
| Cache de build                 | Local + remote (Vercel)       | Local + remote (Nx Cloud)     | Limité                        | Non                           |
| Parallélisation des tâches     | Automatique (DAG)             | Automatique                   | Manuel                        | Non                           |
| Intégration Docker             | `turbo prune` (natif)         | Nécessite config              | Manuel                        | Manuel                        |
| Configuration                  | `turbo.json` (minimal)        | `nx.json` + `project.json`    | `lerna.json`                  | `package.json` workspaces     |
| Taille du tooling              | Légère                        | Lourde                        | Moyenne                       | Nulle                         |

### Package manager / Runtime

| Critère                        | Bun                           | npm                           | pnpm                          | Yarn                          |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Vitesse d'installation         | Très rapide (natif)           | Lente                         | Rapide                        | Rapide                        |
| Runtime JS                     | Oui (remplace Node)           | Non                           | Non                           | Non                           |
| Compatibilité Node.js          | Haute (>95%)                  | Native                        | Native                        | Native                        |
| Workspaces monorepo            | Oui                           | Oui                           | Oui (symlinks)                | Oui                           |
| Exécution de scripts           | Rapide (built-in)             | Via node                      | Via node                      | Via node                      |

---

## Décision

**J'utilise Turborepo comme orchestrateur de build monorepo et Bun comme package manager (et runtime pour les scripts).**

---

## Justification

1. **Turborepo pour l'orchestration des tâches :** Turborepo analyse le graphe de dépendances entre les packages (`turbo.json`) et parallélise automatiquement les tâches (build, test, lint). Si `packages/shared` n'a pas changé, son build est servi depuis le cache — les CI sont plus rapides.

2. **`turbo prune` pour Docker :** La commande `turbo prune --scope=api --docker` génère un sous-ensemble minimal du monorepo nécessaire pour construire uniquement l'API. Les images Docker n'embarquent pas le code du frontend ou des packages inutiles. Cela réduit la taille des images et accélère les rebuilds.

3. **Configuration minimale :** `turbo.json` est simple (quelques dizaines de lignes). Pas besoin de la complexité d'Nx (project.json par package, générateurs, etc.) pour un projet de cette taille.

4. **Bun comme package manager :** Bun installe les dépendances significativement plus vite que npm. Sur CI, chaque seconde compte. `bun install` avec cache est quasi-instantané.

5. **Bun comme runtime de scripts :** Les scripts (`bun run build`, `bun run dev`) s'exécutent directement avec Bun, sans overhead Node.js. Le démarrage à froid est plus rapide, utile en développement local.

6. **Compatibilité Node.js :** NestJS et Next.js sont des frameworks Node.js. Bun est compatible à >95% avec l'API Node.js. Les cas incompatibles ne concernent pas ce projet. En production, les conteneurs Docker utilisent Node.js pour garantir la stabilité (Bun est utilisé uniquement pour le build et le développement local).

7. **Structure claire des workspaces :**
   ```
   apps/
     api/     → NestJS
     web/     → Next.js
   packages/
     shared/  → Types, schémas Zod, constantes
   ```
   Cette séparation permet le partage de code sans duplication ni couplage fort.

---

## Conséquences

**Positives :**
- Builds plus rapides en CI grâce au cache Turborepo.
- Images Docker optimisées grâce à `turbo prune`.
- Installation des dépendances rapide avec Bun.
- Package partagé (`@repo/shared`) accessible par front et back sans publication npm.

**Négatives / Risques :**
- Bun est encore moins mature que Node.js — des incompatibilités peuvent apparaître avec certains packages natifs.
- Le cache Turborepo remote (Vercel) n'est pas configuré — le cache est local uniquement, pas partagé entre CI runners.
- La gestion des dépendances croisées entre workspaces nécessite une attention particulière (éviter les cycles de dépendances).
