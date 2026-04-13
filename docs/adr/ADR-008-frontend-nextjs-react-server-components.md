# ADR-008 — Frontend : Next.js 16 + App Router + React Server Components

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon application nécessite un frontend moderne capable de gérer l'affichage de galeries photos, le routage protégé par authentification, et le rendu optimisé des pages. Le frontend tourne dans un conteneur Docker Swarm et doit s'intégrer avec l'API NestJS. Je dois choisir un framework React et une stratégie de rendu adaptés.

---

## Options considérées

### Framework frontend

| Critère              | Next.js (App Router)        | Next.js (Pages Router)     | Remix             | Vite + React SPA        |
| -------------------- | --------------------------- | -------------------------- | ----------------- | ----------------------- |
| Rendu côté serveur   | RSC natif + SSR             | SSR via getServerSideProps | SSR natif         | Non (client uniquement) |
| Auth côté serveur    | Middleware + Server Actions | Middleware                 | Loader functions  | Non natif               |
| Modèle de routage    | Basé sur fichiers (app/)    | Basé sur fichiers (pages/) | Basé sur fichiers | React Router (manuel)   |
| Optimisation images  | next/image (automatique)    | next/image                 | Non natif         | Non natif               |
| Build pour conteneur | Standalone output           | Standalone output          | Oui               | Bundle statique         |
| Maturité écosystème  | Élevée (Vercel)             | Élevée                     | Moyenne           | Élevée                  |

### Stratégie de rendu

| Critère                    | React Server Components (RSC) | Client Components uniquement | SSR classique          |
| -------------------------- | ----------------------------- | ---------------------------- | ---------------------- |
| Taille bundle JS client    | Réduite (pas de JS serveur)   | Grande                       | Variable               |
| Accès données côté serveur | Direct                        | Via API fetch client         | Via getServerSideProps |
| Interactivité              | Mixte (Server + Client)       | Complète                     | Mixte                  |
| Complexité                 | Moyenne                       | Faible                       | Moyenne                |

---

## Décision

**J'utilise Next.js 16 avec l'App Router, React Server Components comme stratégie par défaut, et un build en mode `standalone` pour l'optimisation Docker.**

---

## Justification

1. **App Router + RSC par défaut :** Les Server Components permettent de récupérer les données directement côté serveur sans exposer d'endpoint intermédiaire. Pour une galerie photos (liste d'albums, métadonnées), cela réduit les round-trips réseau et la taille du bundle JavaScript envoyé au client.

2. **Middleware-based auth (proxy.ts) :** Next.js permet de protéger les routes au niveau du middleware, avant même que la page soit rendue. La vérification du JWT est faite dans `middleware.ts` — l'utilisateur non authentifié est redirigé sans que le rendu de page soit exécuté.

3. **Build standalone pour Docker :** L'option `output: "standalone"` dans `next.config.ts` génère un build minimal qui embarque uniquement les dépendances nécessaires à l'exécution. Pas de `node_modules` complet dans l'image — taille d'image réduite, démarrage plus rapide.

4. **next/image pour les photos :** Le composant `Image` de Next.js optimise automatiquement les images : compression, format WebP/AVIF, lazy loading natif, responsive sizing. Critique pour une application de gestion de photos.

5. **TypeScript cohérent avec le backend :** Même langage que l'API NestJS, partage de types via `@repo/shared`. Les contrats d'API sont validés par les mêmes schémas Zod front et back.

6. **Green IT :** Les RSC réduisent le JavaScript envoyé au client — moins de données réseau, moins de computation côté client, moins de batterie consommée sur les appareils mobiles.

---

## Conséquences

**Positives :**

- Bundle JS client réduit grâce aux Server Components.
- Protection des routes au niveau middleware, avant rendu.
- Images optimisées automatiquement (format, taille, lazy loading).
- Image Docker légère grâce au build standalone.

**Négatives / Risques :**

- L'App Router est un paradigme plus récent que les Pages Router — certaines bibliothèques tierces ne supportent pas encore pleinement les RSC.
- La distinction Server Component / Client Component ajoute une charge cognitive (attention aux `"use client"` manquants).
- Les Server Actions, bien qu'utiles, sont encore en évolution dans l'écosystème Next.js.
