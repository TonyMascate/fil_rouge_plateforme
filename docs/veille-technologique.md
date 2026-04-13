# Dossier de Veille Technologique

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums
**Auteur :** Tony Mascate
**Période couverte :** 2025 – 2026
**Certification :** Expert en Informatique et Systèmes d'Information — 3W Academy (BC1)

---

## Table des matières

1. [Méthodologie de veille](#1-méthodologie-de-veille)
2. [Cadre réglementaire](#2-cadre-réglementaire)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Sécurité](#5-sécurité)
6. [Bases de données & cache](#6-bases-de-données--cache)
7. [Infrastructure & DevOps](#7-infrastructure--devops)
8. [Observabilité](#8-observabilité)
9. [Killer feature — Whiteboard interactif](#9-killer-feature--whiteboard-interactif)
10. [Recommandations](#10-recommandations)
11. [Sources](#11-sources)

---

## 1. Méthodologie de veille

### 1.1 Objectifs

Cette veille a pour objectif d'identifier et d'évaluer les technologies les plus pertinentes pour la réalisation d'une plateforme web fullstack moderne, en tenant compte des critères suivants :

- **Pertinence technique** : adéquation avec les besoins fonctionnels du projet
- **Maturité et stabilité** : garantie de maintenance long terme
- **Sécurité** : conformité aux standards OWASP et aux réglementations en vigueur
- **Éco-responsabilité** : minimisation de la consommation de ressources (Green IT)
- **Réglementaire** : conformité RGPD, IA Act, Cloud Act

### 1.2 Sources mobilisées

Les sources ont été sélectionnées selon leur autorité et leur fiabilité. Chaque catégorie de source a un rôle précis dans la démarche de veille.

| #   | Source                                                           | Type                            | Fiabilité      | Rôle                                                |
| --- | ---------------------------------------------------------------- | ------------------------------- | -------------- | --------------------------------------------------- |
| S1  | Documentations officielles (NestJS, Next.js, PostgreSQL…)        | Primaire                        | Élevée         | Référence de vérité sur les APIs et comportements   |
| S2  | State of JavaScript 2024 (stateofjs.com)                         | Enquête communautaire           | Élevée         | Tendances d'adoption dans l'écosystème JS/TS        |
| S3  | Stack Overflow Developer Survey 2024                             | Enquête communautaire           | Élevée         | Popularité, satisfaction et adoption des outils     |
| S4  | npm Trends (npmtrends.com)                                       | Statistiques de téléchargements | Élevée         | Mesure objective de l'adoption d'une librairie      |
| S5  | GitHub (stars, issues, releases, commits)                        | Indicateur communautaire        | Moyenne-élevée | Santé de l'écosystème, vélocité de maintenance      |
| S6  | TechEmpower Framework Benchmarks                                 | Benchmark indépendant           | Élevée         | Comparaison de performance des frameworks backend   |
| S7  | OWASP (owasp.org)                                                | Standard sécurité               | Élevée         | Référence en matière de sécurité applicative        |
| S8  | RFC 7519 — JWT Standard (IETF)                                   | Standard technique              | Élevée         | Spécification formelle du protocole JWT             |
| S9  | Règlement EU 2016/679 — RGPD                                     | Texte législatif officiel       | Authoritative  | Cadre légal sur la protection des données           |
| S10 | Règlement EU 2024/1689 — IA Act                                  | Texte législatif officiel       | Authoritative  | Cadre légal sur l'usage de l'IA                     |
| S11 | Clarifying Lawful Overseas Use of Data Act (Cloud Act, 2018)     | Loi fédérale US                 | Authoritative  | Risques liés aux fournisseurs cloud américains      |
| S12 | Référentiel Général d'Amélioration de l'Accessibilité (RGAA 4.1) | Standard national               | Élevée         | Critères d'accessibilité numérique                  |
| S13 | Tests pratiques assistés par IA (Claude, GitHub Copilot)         | Expérimentation                 | Moyenne        | Validation de comportements et de benchmarks locaux |

### 1.3 Méthode de collecte et d'évaluation

La veille a été conduite selon une démarche en quatre étapes :

1. **Identification** : recensement des technologies candidates via les documentations officielles, les registres npm et les enquêtes communautaires (S2, S3).
2. **Analyse comparative** : mise en regard des options à travers des tableaux de critères (performance, maintenabilité, sécurité, consommation de ressources).
3. **Expérimentation** : tests pratiques en environnement local avec validation assistée par IA (S13) pour confirmer les comportements observés.
4. **Synthèse et priorisation** : les informations obtenues ont été triées par domaine technique, puis priorisées selon leur impact direct sur le projet.

Les informations issues de sources de type enquête (S2, S3) ont été recoupées avec les statistiques objectives de téléchargements (S4) et l'activité des dépôts GitHub (S5) afin de limiter les biais de popularité perçue.

---

## 2. Cadre réglementaire

### 2.1 RGPD — Règlement Général sur la Protection des Données (EU 2016/679)

**Pertinence pour le projet :** La plateforme traite des données à caractère personnel (photos, comptes utilisateurs, métadonnées). Elle est directement soumise au RGPD.

**Obligations identifiées :**

- **Minimisation des données** : ne collecter que les données strictement nécessaires (pas de tracking tiers, pas d'analytics non consentis).
- **Droit à l'effacement** : l'architecture doit permettre la suppression en cascade de toutes les données d'un utilisateur (photos, albums, tokens).
- **Sécurisation des données** : chiffrement des mots de passe (Argon2), stockage des tokens en HTTP-only cookies, protection contre les injections SQL (TypeORM + requêtes paramétrées).
- **Journalisation** : logs structurés (Pino + Loki) permettant d'auditer les accès aux données.
- **Hébergement localisé** : le choix d'un VPS auto-hébergé plutôt qu'un service cloud américain élimine les risques de transferts de données hors UE non conformes.

**Orientations réglementaires 2025 :** La CNIL a intensifié ses contrôles sur les cookies et le transfert de données vers des pays tiers. Les sanctions pour non-conformité ont atteint des montants records en 2023-2024 (Meta : 1,2 Md€). L'auto-hébergement des données constitue une réponse directe à ces risques.

### 2.2 IA Act — Règlement sur l'Intelligence Artificielle (EU 2024/1689)

**Contexte :** L'IA Act est entré en vigueur en août 2024 avec une application progressive jusqu'en 2026. Il classe les systèmes d'IA par niveau de risque.

**Pertinence pour le projet :** La killer feature (whiteboard de classification par couleur) n'implémente pas de modèle d'IA au sens strict (pas d'apprentissage automatique, pas de prise de décision autonome). Elle reste dans la catégorie **risque minimal** du règlement.

**Anticipation :** Si l'application devait intégrer une fonctionnalité de reconnaissance de couleurs automatique (ex. : tagging automatique des photos par palette dominante), cela constituerait un système d'IA de **faible risque** soumis aux obligations de transparence envers l'utilisateur (article 52 de l'IA Act).

**Recommandation :** Toute évolution vers de l'IA générative ou de la classification automatique dans l'application devra faire l'objet d'une évaluation de conformité IA Act avant déploiement.

### 2.3 Cloud Act — Clarifying Lawful Overseas Use of Data Act (US, 2018)

**Contexte :** Le Cloud Act autorise les autorités américaines à contraindre des fournisseurs de cloud américains (AWS, Azure, GCP, Cloudflare…) à communiquer des données hébergées, y compris en dehors des États-Unis.

**Impact sur le projet :** Le choix d'un VPS auto-hébergé avec Docker Swarm plutôt qu'un PaaS américain (Heroku, Render, Railway) élimine ce risque. Aucune donnée utilisateur ne transite par un service soumis au Cloud Act.

**Vecteurs résiduels à surveiller :** Les images Docker sont stockées sur GitHub Container Registry (ghcr.io), propriété de Microsoft (US). Ces images ne contiennent pas de données utilisateurs — uniquement du code applicatif — ce qui limite le risque de manière significative.

### 2.4 Accessibilité — RGAA 4.1 / WCAG 2.1

**Contexte :** Le Référentiel Général d'Amélioration de l'Accessibilité (RGAA 4.1) est obligatoire pour les services publics français et constitue la référence pour toute application professionnelle.

**Choix techniques en cohérence :**

- **Radix UI** (base de shadcn/ui) implémente nativement les patterns ARIA (focus management, keyboard navigation, screen reader support).
- **Next.js** génère du HTML sémantique côté serveur, favorable aux technologies d'assistance.
- Les contrastes de couleurs respectent les ratios WCAG AA (4.5:1 pour le texte normal).

---

## 3. Frontend

### 3.1 Next.js 15 & React Server Components

**Source principale :** Documentation officielle Next.js (S1), State of JavaScript 2024 (S2)

**Contexte technologique 2025 :**
Next.js 15 (sorti en octobre 2024) consolide le modèle de rendu hybride introduit avec le App Router en v13. React 19 (stable depuis décembre 2024) apporte de nouvelles primitives (`useActionState`, `use()`) qui renforcent l'intégration serveur-client.

**Points clés observés :**

| Aspect                                | Next.js (App Router + RSC)        | Pages Router (Next.js legacy) | Remix / Vite SPA               |
| ------------------------------------- | --------------------------------- | ----------------------------- | ------------------------------ |
| Rendu par défaut                      | Serveur (RSC)                     | Client                        | Serveur (Remix) / Client (SPA) |
| Bundle JS envoyé au client            | Minimal (RSC non inclus)          | Complet                       | Variable                       |
| SEO natif                             | Oui (HTML rendu côté serveur)     | Partiel (hydratation)         | Oui (Remix) / Non (SPA)        |
| Streaming (Suspense)                  | Natif                             | Non                           | Natif (Remix)                  |
| Compatibilité Tailwind v4 + shadcn/ui | Excellente                        | Bonne                         | Bonne                          |
| Adoption 2024                         | 1er framework React en entreprise | En déclin                     | En croissance (Remix)          |

**Bénéfice Green IT :** Les React Server Components réduisent la quantité de JavaScript envoyée au navigateur. Pour une page galerie d'images, le composant de liste peut rester entièrement côté serveur, éliminant son bundle JS du payload client — typiquement entre 20 et 60 KB selon la complexité.

**Tendance 2025 :** Le Partial Prerendering (PPR), introduit expérimentalement en v15, permet de mélanger statique et dynamique sur une même page sans overhead. C'est la prochaine évolution majeure du modèle de rendu.

**Recommandation :** Next.js 15 avec App Router est le choix justifié pour 2025. La migration vers le Pages Router serait un recul technique et de performance.

---

### 3.2 Tailwind CSS v4

**Source principale :** Documentation officielle Tailwind CSS (S1), npm Trends (S4)

**Évolution majeure v4 (2025) :**
Tailwind CSS v4 abandonne le fichier `tailwind.config.js` au profit de directives CSS natives (`@theme`, `@layer`). Le moteur de compilation passe de PostCSS/Node.js à **Oxide** (Rust), réduisant les temps de compilation de 35 à 100x selon les benchmarks officiels.

| Critère                | Tailwind v3   | Tailwind v4               | CSS Modules  | CSS-in-JS (Emotion)     |
| ---------------------- | ------------- | ------------------------- | ------------ | ----------------------- |
| Compatibilité RSC      | Oui           | Oui                       | Oui          | Non (runtime JS requis) |
| Temps de build         | ~300ms        | ~8ms (Oxide)              | ~100ms       | N/A                     |
| Tree-shaking           | Oui (purge)   | Oui (natif)               | Oui          | Partiel                 |
| Design tokens          | Via config JS | Via CSS custom properties | Via vars CSS | Via thème JS            |
| Courbe d'apprentissage | Moyenne       | Faible (continuité v3)    | Faible       | Moyenne                 |

**Recommandation :** Tailwind v4 est justifié par son alignement avec les standards CSS modernes et les gains de performance en développement. Son incompatibilité avec le CSS-in-JS runtime en fait le seul choix viable avec les React Server Components.

---

### 3.3 shadcn/ui & Radix UI

**Source principale :** Documentation officielle Radix UI (S1), State of JavaScript 2024 (S2), npm Trends (S4)

**Contexte :** shadcn/ui a émergé en 2023 comme une approche disruptive des librairies de composants. Contrairement à Material UI ou Mantine, shadcn/ui **n'est pas un package npm installé** : les composants sont copiés dans le projet (modèle _copy-paste_). Ils reposent sur **Radix UI** (composants headless accessibles) stylisés avec Tailwind CSS.

| Critère              | shadcn/ui + Radix                 | Material UI (MUI) | Mantine     | Headless UI               |
| -------------------- | --------------------------------- | ----------------- | ----------- | ------------------------- |
| Accessibilité (ARIA) | Complète (via Radix)              | Bonne             | Bonne       | Complète                  |
| Customisation        | Totale (code owned)               | Limitée (theming) | Bonne       | Totale                    |
| Bundle JS            | Minimal (tree-shaking)            | Lourd (~300 KB)   | Moyen       | Minimal                   |
| Compatibilité RSC    | Complète                          | Partielle         | Partielle   | Complète                  |
| Maintenance          | Communautaire active              | Corporate (Meta)  | Indépendant | Corporate (Tailwind Labs) |
| Adoption 2024        | Croissance très forte (+200% npm) | Stable            | Stable      | Stable                    |

**Tendance 2025 :** shadcn/ui est devenu la référence de facto pour les projets Next.js en 2024-2025. Son adoption a dépassé celle de Chakra UI sur npm trends. Le modèle _copy-paste_ offre une indépendance totale vis-à-vis des breaking changes de packages tiers.

**Recommandation :** Choix justifié par l'accessibilité native, la compatibilité RSC et la maîtrise totale du code.

---

### 3.4 TanStack React Query v5

**Source principale :** Documentation officielle TanStack (S1), npm Trends (S4)

**Contexte :** TanStack Query (anciennement React Query) est la solution de référence pour la gestion du **state serveur** côté client. La v5 (sortie en 2023) a refondu l'API pour plus de cohérence et introduit le support natif du streaming Suspense.

**Positionnement dans l'architecture :**
Dans un projet Next.js avec App Router, React Query ne remplace pas les Server Components — il les complète. Les RSC gèrent les requêtes serveur ; React Query gère le state côté client pour les interactions dynamiques (mutations, invalidations, pagination).

| Critère                  | React Query v5               | SWR (Vercel)        | Zustand + fetch | Redux Toolkit Query |
| ------------------------ | ---------------------------- | ------------------- | --------------- | ------------------- |
| Cache automatique        | Oui (stale-while-revalidate) | Oui                 | Manuel          | Oui                 |
| Mutations + invalidation | Natif                        | Limité              | Manuel          | Natif               |
| Devtools                 | Excellents                   | Limités             | Basiques        | Bons                |
| Bundle size              | ~12 KB                       | ~4 KB               | ~3 KB           | ~20 KB              |
| Courbe d'apprentissage   | Moyenne                      | Faible              | Faible          | Élevée              |
| Compatibilité RSC        | Bonne (client only)          | Bonne (client only) | Oui             | Oui                 |

**Recommandation :** React Query v5 est le standard pour la gestion du state serveur côté client en 2025. Le couple RSC (serveur) + React Query (client) est l'architecture recommandée par l'équipe Next.js.

---

## 4. Backend

### 4.1 NestJS

**Source principale :** Documentation officielle NestJS (S1), TechEmpower Benchmarks (S6), State of JavaScript 2024 (S2)

**Contexte technologique 2025 :**
NestJS maintient sa position de framework Node.js le plus adopté en entreprise pour les APIs TypeScript. Il s'appuie sur Express.js (ou Fastify en option) et impose une architecture modulaire inspirée d'Angular.

| Critère                  | NestJS                             | Express.js         | Fastify                 | Spring Boot (Java) | Hono         |
| ------------------------ | ---------------------------------- | ------------------ | ----------------------- | ------------------ | ------------ |
| Architecture imposée     | Oui (modules/controllers/services) | Non                | Non                     | Oui                | Non          |
| TypeScript natif         | Oui                                | Partiel            | Oui                     | Non (Java)         | Oui          |
| Injection de dépendances | Natif                              | Non                | Via plugins             | Natif              | Non          |
| Performance (req/s)      | Bonne (~15k req/s)                 | Bonne (~18k req/s) | Excellente (~30k req/s) | Variable           | Excellente   |
| Testabilité              | Excellente (DI)                    | Manuelle           | Bonne                   | Excellente         | Moyenne      |
| Maturité                 | Élevée (2017)                      | Très élevée (2009) | Élevée (2018)           | Très élevée        | Jeune (2023) |

**Note sur Hono :** Framework émergent en 2024-2025, très léger et performant, initialement conçu pour les Edge runtimes (Cloudflare Workers). Son adoption croît rapidement mais son écosystème reste immature comparé à NestJS pour les besoins d'une API complète.

**Recommandation :** NestJS reste le choix le plus adapté pour un projet fullstack TypeScript nécessitant une architecture maintenable, des modules d'authentification, de cache et de validation clé-en-main.

---

### 4.2 TypeORM

**Source principale :** Documentation officielle TypeORM (S1), npm Trends (S4)

**Contexte :** L'écosystème des ORMs TypeScript s'est consolidé autour de trois acteurs principaux en 2024-2025.

| Critère            | TypeORM                  | Prisma                 | Drizzle ORM            |
| ------------------ | ------------------------ | ---------------------- | ---------------------- |
| Approche           | Code-first (décorateurs) | Schema-first (.prisma) | Code-first (type-safe) |
| Typage TypeScript  | Bon                      | Excellent (généré)     | Excellent (natif)      |
| Migrations         | Intégrées                | Intégrées              | Semi-manuelles         |
| Intégration NestJS | Native (@nestjs/typeorm) | Bonne (community)      | Bonne (community)      |
| Performances       | Correctes                | Bonnes                 | Excellentes            |
| Maturité           | Élevée                   | Élevée                 | Jeune (2022)           |
| Tendance 2024-2025 | Stable / légère baisse   | En croissance          | En forte croissance    |

**Tendance 2025 :** Drizzle ORM connaît une adoption très rapide en 2024-2025 grâce à son typage SQL strict et ses performances. Il représente l'évolution probable de l'écosystème ORM TypeScript à moyen terme.

**Recommandation :** TypeORM reste le choix le plus stable pour une intégration NestJS native en 2025. Une migration future vers Drizzle ORM serait pertinente pour un projet greenfield en 2026.

---

### 4.3 Bun — Runtime & Package Manager

**Source principale :** Documentation officielle Bun (S1), benchmarks Bun (S6), npm Trends (S4)

**Contexte :** Bun 1.0 a été lancé en septembre 2023. En 2024-2025, Bun 1.1+ a significativement amélioré sa compatibilité Node.js et ses performances.

| Critère                | Bun                            | npm               | pnpm           | Yarn      |
| ---------------------- | ------------------------------ | ----------------- | -------------- | --------- |
| Vitesse d'installation | Très rapide (natif, pas de JS) | Lente             | Rapide         | Rapide    |
| Compatibilité Node.js  | >95%                           | N/A (référence)   | 100%           | 100%      |
| Runtime JavaScript     | Oui (JavaScriptCore)           | Non               | Non            | Non       |
| Usage en production    | Déconseillé (instabilité)      | Recommandé        | Recommandé     | Possible  |
| Lockfile               | bun.lockb (binaire)            | package-lock.json | pnpm-lock.yaml | yarn.lock |
| Workspaces monorepo    | Natif                          | Natif             | Natif          | Natif     |

**Positionnement adopté :** Bun est utilisé exclusivement comme package manager et runtime de scripts en développement/CI. Node.js est conservé en production pour la stabilité.

**Recommandation :** Usage en développement et CI justifié par les gains de performance (installation jusqu'à 10x plus rapide que npm). La production sur Node.js reste préférable en 2025.

---

### 4.4 Pino — Logging structuré

**Source principale :** Documentation officielle Pino (S1), benchmarks Pino (S1)

**Contexte :** En environnement multi-réplicas (Docker Swarm), les logs doivent être structurés en JSON pour être agrégés par Promtail et indexés dans Loki.

| Critère                | Pino                    | Winston        | Morgan     | Bunyan     |
| ---------------------- | ----------------------- | -------------- | ---------- | ---------- |
| Performance (logs/s)   | ~5M (async)             | ~1M            | Variable   | ~1M        |
| Format JSON natif      | Oui                     | Via transport  | Non        | Oui        |
| Intégration NestJS     | nestjs-pino (community) | winston-nestjs | Non native | Non native |
| pino-pretty (dev)      | Oui                     | N/A            | N/A        | Oui        |
| Corrélation request ID | Natif (pino-http)       | Manuelle       | Manuelle   | Manuelle   |

**Recommandation :** Pino est le logger le plus adapté à l'architecture Loki choisie. Sa sérialisation JSON asynchrone minimise l'impact sur la latence des requêtes API.

---

## 5. Sécurité

### 5.1 Authentification JWT

**Source principale :** RFC 7519 (S8), OWASP Authentication Cheat Sheet (S7)

**Contexte :** JSON Web Tokens (RFC 7519) est le standard pour l'authentification stateless dans les APIs REST. Les best practices OWASP 2024 précisent les recommandations de stockage et d'expiration.

**Architecture implémentée :**

| Aspect              | Choix retenu         | Alternative rejetée  | Justification                                               |
| ------------------- | -------------------- | -------------------- | ----------------------------------------------------------- |
| Stockage token      | HTTP-only cookie     | localStorage         | Protection XSS : localStorage accessible par JS malveillant |
| Durée access token  | 15 minutes           | 1 heure              | Fenêtre d'exposition réduite en cas de vol                  |
| Durée refresh token | 7 jours              | Permanent            | Équilibre UX / sécurité                                     |
| Révocation          | Refresh token en BDD | Blacklist en mémoire | Résistance aux redémarrages, multi-réplicas                 |
| CSRF protection     | Middleware custom    | SameSite=Lax seul    | Defense in depth                                            |

**Tendance 2025 :** Les recommandations OWASP restent stables sur JWT. L'émergence de Passkeys (FIDO2/WebAuthn) comme alternative à l'authentification par mot de passe est à surveiller pour les évolutions futures.

---

### 5.2 Argon2 — Hachage des mots de passe

**Source principale :** OWASP Password Storage Cheat Sheet (S7)

**Contexte :** Argon2 a remporté le Password Hashing Competition en 2015 et est depuis la recommandation OWASP n°1 pour le hachage de mots de passe.

| Algorithme       | Résistance GPU | Résistance ASIC | Mémoire                        | OWASP rang              |
| ---------------- | -------------- | --------------- | ------------------------------ | ----------------------- |
| **Argon2id**     | **Excellente** | **Excellente**  | **Configurable (memory-hard)** | **1er**                 |
| bcrypt           | Bonne          | Moyenne         | Fixe (faible)                  | 2e                      |
| PBKDF2           | Faible         | Faible          | Très faible                    | 3e (compatibilité FIPS) |
| SHA-256 (direct) | Très faible    | Très faible     | Nulle                          | **À proscrire**         |

**Avantage d'Argon2 :** Sa nature **memory-hard** rend les attaques par dictionnaire sur GPU économiquement non viables — augmenter la puissance de calcul ne suffit pas, il faut aussi augmenter la RAM proportionnellement.

**Implémentation :** Package `argon2` (Node.js, bindings C natifs — pas de pure JS) avec les paramètres recommandés par OWASP : `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`.

---

### 5.3 RBAC & Contrôle d'accès

**Source principale :** OWASP Access Control Cheat Sheet (S7)

**Contexte :** Deux patterns de contrôle d'accès sont combinés dans l'application.

| Pattern               | Implémentation                                 | Cas d'usage                                    |
| --------------------- | ---------------------------------------------- | ---------------------------------------------- |
| RBAC (Role-Based)     | Guards NestJS, rôles définis dans @repo/shared | Ségrégation USER / ADMIN                       |
| OAC (Ownership-Based) | Guard `resource.userId === currentUser.id`     | Protéger les ressources d'un utilisateur       |
| Partage public        | UUID non-devinable comme token d'accès         | Albums / photos partagés sans authentification |

**OWASP Top 10 2021 — A01 (Broken Access Control) :** C'est la vulnérabilité la plus répandue. L'implémentation centralisée via des Guards NestJS réutilisables permet une couverture systématique sans répétition de logique métier.

---

### 5.4 Rate Limiting

**Source principale :** Documentation @nestjs/throttler (S1), OWASP API Security Top 10 (S7)

**Contexte :** Le rate limiting est listé comme API4 dans l'OWASP API Security Top 10 2023 ("Unrestricted Resource Consumption"). L'absence de throttling expose les endpoints à des attaques par force brute et au déni de service.

| Configuration | Valeur                   | Cible                 |
| ------------- | ------------------------ | --------------------- |
| Court terme   | 100 req/min par IP       | Attaques burst        |
| Long terme    | 500 req/10 min par IP    | Scraping, brute force |
| Réponse       | HTTP 429 + `Retry-After` | Standard RFC 6585     |

**Limitation identifiée :** Le stockage in-memory du throttler ne partage pas l'état entre réplicas Docker Swarm. Pour une mise à l'échelle réelle, un backend Redis doit être configuré (`@nestjs/throttler` supporte nativement `ThrottlerStorageRedisService`).

---

## 6. Bases de données & Cache

### 6.1 PostgreSQL

**Source principale :** Documentation officielle PostgreSQL (S1), DB-Engines Ranking 2024 (S5)

**Contexte :** PostgreSQL maintient sa position de SGBDR open-source le plus populaire en 2024-2025, dépassant MySQL dans plusieurs enquêtes (Stack Overflow Developer Survey 2024 : PostgreSQL #1 pour la quatrième année consécutive).

**PostgreSQL 17 (sorti septembre 2024) — nouveautés pertinentes :**

- Améliorations des performances sur les requêtes avec sous-SELECT (jusqu'à 20x plus rapide sur certains patterns)
- Amélioration de la gestion des connections pour les poolers (PgBouncer)
- Nouvelles fonctions JSON (SQL/JSON standard)

| Critère                           | PostgreSQL  | MySQL       | SQLite        | MongoDB    |
| --------------------------------- | ----------- | ----------- | ------------- | ---------- |
| ACID                              | Complet     | Complet     | Complet       | Partiel    |
| Types avancés (UUID, JSON, ARRAY) | Oui         | Partiel     | Non           | Oui (BSON) |
| Relations & contraintes FK        | Complètes   | Complètes   | Limitées      | Non        |
| Performance lectures              | Très bonne  | Bonne       | Bonne (local) | Très bonne |
| Modèle de données                 | Relationnel | Relationnel | Relationnel   | Document   |

**Recommandation :** PostgreSQL est le choix standard pour une application nécessitant intégrité référentielle, types avancés et performances équilibrées en lecture/écriture.

---

### 6.2 PgBouncer — Connection Pooling

**Source principale :** Documentation officielle PgBouncer (S1)

**Contexte :** PostgreSQL alloue un processus par connexion active. Dans une architecture multi-réplicas (Docker Swarm), sans pooler, chaque réplica API maintient son propre pool de connexions — ce qui peut saturer les `max_connections` de PostgreSQL (défaut : 100).

**PgBouncer en mode transaction pooling :**
Une connexion côté PostgreSQL est allouée uniquement pendant la durée d'une transaction, puis restituée au pool. Cette mutualisation permet à 10 réplicas ayant chacun 5 connexions actives de consommer seulement 10 à 15 connexions PostgreSQL réelles.

| Mode PgBouncer          | Connexion PostgreSQL allouée       | Compatibilité                          |
| ----------------------- | ---------------------------------- | -------------------------------------- |
| Session pooling         | Pendant toute la session client    | Totale                                 |
| **Transaction pooling** | **Pendant la transaction**         | **Partielle (pas de `SET`, `LISTEN`)** |
| Statement pooling       | Pendant l'exécution d'un statement | Très limitée                           |

**Recommandation :** Transaction pooling recommandé pour les architectures multi-réplicas. Les limitations (incompatibilité avec `LISTEN/NOTIFY` et variables de session) sont sans impact sur ce projet.

---

### 6.3 Redis

**Source principale :** Documentation officielle Redis (S1), benchmark Redis 7 (S1)

**Contexte :** Redis 7.x (LTS) maintient sa position de référence pour les caches in-memory et les stores de state distribués. La version Redis Stack intègre des modules additionnels (RedisJSON, RediSearch) mais introduit une licence non open-source (depuis Redis 7.4 avec la licence SSPL).

**Décision sur la licence :** Pour ce projet, Redis 7.2 (LTS, licence BSD 3-Clause) est utilisé. La migration vers Redis 8.0 (retour au modèle open-source AGPLv3 annoncé en 2025) est à envisager.

| Critère                | Redis                                | Memcached         | Base de données (PostgreSQL) | In-memory Node.js |
| ---------------------- | ------------------------------------ | ----------------- | ---------------------------- | ----------------- |
| Structures de données  | Riches (hash, set, list, sorted set) | Clé-valeur simple | N/A                          | Limitées          |
| TTL natif              | Oui                                  | Oui               | Non (manuel)                 | Non               |
| Partage entre réplicas | Oui                                  | Oui               | Oui                          | **Non**           |
| Performance            | <1ms                                 | <1ms              | ~5-10ms                      | <0.1ms            |
| Persistance            | Optionnelle (RDB/AOF)                | Non               | Oui                          | Non               |

**Point clé pour l'architecture multi-réplicas :** Un cache in-memory Node.js local est incompatible avec plusieurs réplicas — chaque réplica aurait son propre état, créant des incohérences. Redis centralise le cache, ce qui en fait la seule solution viable avec Docker Swarm.

---

## 7. Infrastructure & DevOps

### 7.1 Conteneurisation & Orchestration

**Source principale :** Documentation Docker Swarm (S1), CNCF Survey 2024 (S5)

**Contexte 2025 :** Kubernetes continue de dominer le marché des orchestrateurs en entreprise (CNCF Survey 2024 : 66% d'adoption). Docker Swarm reste pertinent pour les projets à taille humaine où la complexité opérationnelle de Kubernetes n'est pas justifiée.

| Critère                          | Kubernetes                       | Docker Swarm         | Nomad (HashiCorp) |
| -------------------------------- | -------------------------------- | -------------------- | ----------------- |
| Courbe d'apprentissage           | Élevée (CRDs, RBAC, Helm…)       | Faible               | Moyenne           |
| Rolling updates                  | Oui                              | Oui                  | Oui               |
| Auto-scaling                     | Avancé (HPA, VPA)                | Basique              | Avancé            |
| Consommation ressources          | Élevée (~1 GB RAM control plane) | Très faible (<50 MB) | Moyenne           |
| Adoption en entreprise           | Dominante                        | Marginale            | Marginale         |
| Adapté à un solo dev, 8 semaines | Risqué                           | Oui                  | Possible          |

**Justification Green IT :** Docker Swarm consomme significativement moins de ressources que Kubernetes pour le control plane. Sur un VPS de 4 GB RAM, l'économie est de l'ordre de 800 MB à 1 GB réservés à l'infrastructure, disponibles pour les services applicatifs.

---

### 7.2 Turborepo — Orchestration Monorepo

**Source principale :** Documentation officielle Turborepo (S1), npm Trends (S4)

**Contexte :** Turborepo 2.0 (2024) a simplifié sa configuration et introduit le support natif des Watch Tasks pour le développement en temps réel.

| Critère                | Turborepo        | Nx              | Lerna    | npm Workspaces seuls |
| ---------------------- | ---------------- | --------------- | -------- | -------------------- |
| Caching local          | Oui (fort)       | Oui             | Non      | Non                  |
| Caching distant        | Oui (Vercel)     | Oui (Nx Cloud)  | Non      | Non                  |
| Parallélisation        | DAG automatique  | DAG automatique | Manuelle | Non                  |
| Courbe d'apprentissage | Faible           | Élevée          | Moyenne  | Très faible          |
| Config minimale        | Oui (~30 lignes) | Non (verbose)   | Oui      | N/A                  |
| `turbo prune` (Docker) | Oui              | Non             | Non      | Non                  |

**Bénéfice clé — `turbo prune` :** Cette commande génère un sous-ensemble minimal du monorepo contenant uniquement les dépendances de l'app ciblée. Utilisée dans le Dockerfile multi-stage, elle réduit la taille des images Docker en excluant les workspaces non utilisés.

---

### 7.3 CI/CD — GitHub Actions & ghcr.io

**Source principale :** Documentation GitHub Actions (S1), GitHub Security Best Practices (S7)

**Pipeline en production :**

```
Push sur main
  └─► Build & Tests (Bun + Turborepo)
  └─► Docker build (turbo prune + multi-stage)
  └─► Push image → ghcr.io (GITHUB_TOKEN)
  └─► SSH VPS → docker stack deploy
  └─► Migrations TypeORM (container éphémère)
```

| Critère                        | GitHub Actions        | GitLab CI            | Jenkins               | CircleCI              |
| ------------------------------ | --------------------- | -------------------- | --------------------- | --------------------- |
| Intégration native avec GitHub | Native                | Non                  | Non                   | Non                   |
| Coût                           | 2000 min/mois gratuit | 400 min/mois gratuit | Gratuit (self-hosted) | 6000 min/mois gratuit |
| Configuration                  | YAML dans le repo     | YAML dans le repo    | Groovy / interface    | YAML                  |
| Marketplace actions            | Très riche            | Limité               | Plugins               | Orbs                  |
| ghcr.io GITHUB_TOKEN           | Natif (zero config)   | Non applicable       | Non applicable        | Non applicable        |

**Sécurité CI/CD :** Le `GITHUB_TOKEN` automatique pour ghcr.io élimine la gestion de secrets Docker Hub. Les secrets SSH pour le déploiement sont stockés dans GitHub Secrets (chiffrés au repos).

---

## 8. Observabilité

### 8.1 Stack Prometheus + Grafana + Loki

**Source principale :** Documentation CNCF (S1), comparaison avec ELK Stack (S5, S6)

**Contexte :** L'observabilité moderne repose sur trois piliers : métriques, logs, traces. La stack PLG (Prometheus + Loki + Grafana) couvre les deux premiers piliers dans une interface unifiée.

| Composant      | Rôle                             | Alternative principale | Avantage retenu              |
| -------------- | -------------------------------- | ---------------------- | ---------------------------- |
| **Prometheus** | Collecte de métriques (pull)     | Datadog, InfluxDB      | Open-source, natif Docker    |
| **Loki**       | Agrégation de logs (label-based) | Elasticsearch (ELK)    | Sans JVM, ~10x moins de RAM  |
| **Grafana**    | Visualisation unifiée            | Kibana, Datadog UI     | Source-agnostic, open-source |
| **Promtail**   | Agent de collecte de logs        | Logstash, Fluentd      | Natif Loki, léger            |
| **cAdvisor**   | Métriques containers Docker      | node-exporter seul     | Métriques par container      |

**Comparaison Loki vs Elasticsearch :**

| Critère             | Loki                            | Elasticsearch    |
| ------------------- | ------------------------------- | ---------------- |
| Index               | Labels seuls (pas de full-text) | Full-text indexé |
| RAM minimale        | ~128 MB                         | ~1 GB (JVM heap) |
| Recherche full-text | Non                             | Oui              |
| Coût opérationnel   | Faible                          | Élevé            |
| Adapté au projet    | Oui                             | Surdimensionné   |

**OpenTelemetry (tendance 2025) :** Le standard CNCF OpenTelemetry (OTel) unifie la collecte de métriques, logs et traces dans un protocole unique (OTLP). Grafana supporte nativement OTLP depuis 2024. C'est la direction de l'industrie pour les architectures de monitoring standardisées.

**Recommandation :** La stack PLG est le choix optimal pour ce projet. L'adoption d'OpenTelemetry comme protocole de collecte est à anticiper pour les évolutions futures.

---

## 9. Killer Feature — Whiteboard interactif

### 9.1 Analyse du besoin

La killer feature est un **whiteboard interactif** permettant de créer des nœuds colorés organisés en carte mentale, chaque nœud regroupant les photos associées à sa couleur. Les contraintes techniques identifiées sont :

- **Drag & drop** de nœuds sur un canvas
- **Couleur paramétrable** par nœud
- **Association photos ↔ nœud** (relation many-to-many)
- **Rendu performant** avec potentiellement plusieurs dizaines de nœuds et vignettes
- **Intégration React** (Next.js, Client Component)

### 9.2 Analyse comparative des solutions

**Source principale :** Documentation officielle de chaque librairie (S1), npm Trends (S4), GitHub (S5)

| Critère                     | React Flow                      | Konva.js / react-konva    | D3.js     | Excalidraw                   | SVG custom         |
| --------------------------- | ------------------------------- | ------------------------- | --------- | ---------------------------- | ------------------ |
| Paradigme                   | Composants React (nœuds/arêtes) | Canvas HTML5              | SVG + DOM | Canvas Whiteboard            | SVG pur            |
| Drag & drop natif           | Oui                             | Oui                       | Manuel    | Oui                          | Manuel             |
| Nœuds personnalisables      | Totalement (JSX)                | Oui (Canvas API)          | Complexe  | Non (format fixe)            | Oui                |
| Courbe d'apprentissage      | Faible                          | Moyenne                   | Élevée    | Faible (mais non extensible) | Élevée             |
| Performance (50+ nœuds)     | Bonne (virtualisation)          | Excellente (Canvas)       | Bonne     | Bonne                        | Variable           |
| Bundle size                 | ~50 KB                          | ~70 KB                    | ~80 KB    | ~300 KB                      | 0                  |
| Intégration React           | Native                          | Native (react-konva)      | Partielle | Via composant                | Native             |
| Cas d'usage principal       | Flow editors, mind maps         | Jeux, éditeurs graphiques | Data viz  | Whiteboard collaboratif      | Diagrammes simples |
| Adoption 2024 (npm/semaine) | ~1.2M                           | ~200K                     | ~3M       | ~150K                        | N/A                |

**Excalidraw** est une solution complète de whiteboard mais ne permet pas d'embarquer des composants React arbitraires dans ses nœuds — il est difficilement extensible pour afficher des vignettes photos.

**D3.js** est la référence pour la data visualisation, mais son API bas niveau (manipulation directe du DOM SVG) est inadaptée à une intégration React sans surcharge d'architecture.

**Konva.js** excelle pour les applications graphiques intensives (>1000 éléments) grâce au rendu Canvas, mais l'absence de composants React natifs pour les nœuds complexifie l'affichage de vignettes photos avec métadonnées.

### 9.3 Recommandation

**React Flow** est la solution la plus adaptée à ce besoin.

- Les nœuds sont des **composants React à part entière** — un nœud peut contenir une vignette photo, un sélecteur de couleur, un compteur, exactement comme n'importe quel composant Next.js.
- Le drag & drop, le zoom, le pan et la connexion entre nœuds sont **gérés nativement**.
- La virtualisation intégrée assure de bonnes performances jusqu'à quelques centaines de nœuds, ce qui couvre largement le besoin.
- L'API `useNodes` / `useEdges` expose un state gérable avec React Query pour la persistance serveur.

**Architecture proposée pour la killer feature :**

```
Client Component (React Flow)
  ├── Nœuds ColorNode (composant JSX custom)
  │     ├── Sélecteur de couleur (shadcn/ui ColorPicker)
  │     └── Grille de vignettes (photos associées)
  ├── React Query → GET /api/boards/:id (chargement initial)
  └── React Query useMutation → PATCH /api/boards/:id (sauvegarde auto)

Backend (NestJS)
  ├── GET  /api/boards/:id    → renvoie nœuds + associations photos
  ├── PATCH /api/boards/:id   → persiste l'état du whiteboard (JSON)
  └── PostgreSQL : table `boards`, table `board_nodes`, table `node_photos`
```

---

## 10. Recommandations

### 10.1 Synthèse des choix validés par la veille

| Domaine              | Technologie retenue     | Statut veille     | Alternatives à surveiller        |
| -------------------- | ----------------------- | ----------------- | -------------------------------- |
| Frontend framework   | Next.js 15 (App Router) | Standard 2025     | Remix (croissance)               |
| CSS                  | Tailwind CSS v4         | Standard 2025     | —                                |
| Composants UI        | shadcn/ui + Radix       | Standard 2025     | —                                |
| State serveur client | TanStack Query v5       | Standard 2025     | —                                |
| Backend framework    | NestJS                  | Standard 2025     | Hono (à surveiller pour 2026)    |
| ORM                  | TypeORM                 | Stable            | Drizzle ORM (évolution probable) |
| Validation           | Zod                     | Standard 2025     | Valibot (plus léger)             |
| Base de données      | PostgreSQL 17           | Standard          | —                                |
| Cache                | Redis 7.2 (BSD)         | Standard          | Redis 8.0 AGPLv3                 |
| Hachage MDP          | Argon2id                | OWASP #1          | —                                |
| Authentification     | JWT + HTTP-only cookies | OWASP recommended | Passkeys (FIDO2, futur)          |
| Logs                 | Pino + Loki             | Standard          | OpenTelemetry (tendance)         |
| Métriques            | Prometheus + Grafana    | Standard          | OpenTelemetry Collector          |
| Orchestration        | Docker Swarm            | Projet solo       | Kubernetes (entreprise)          |
| Killer feature       | React Flow              | Recommandé        | Konva.js (si >500 nœuds)         |

### 10.2 Points de vigilance réglementaires

1. **RGPD** : Implémenter le droit à l'effacement complet (suppression en cascade photos → albums → tokens → compte).
2. **IA Act** : Toute future fonctionnalité de classification automatique (ex. tagging couleur IA) requiert une notice de transparence utilisateur (article 52).
3. **Licences open-source** : Redis 7.4+ est sous SSPL (non libre). Utiliser Redis 7.2 LTS (BSD) ou migrer vers Redis 8.0 (AGPLv3) dès disponibilité stable.
4. **Cloud Act** : Maintenir l'hébergement VPS hors juridiction US pour les données utilisateurs.

### 10.3 Axes d'évolution technique à moyen terme

| Évolution                      | Horizon   | Justification                                                       |
| ------------------------------ | --------- | ------------------------------------------------------------------- |
| Adoption OpenTelemetry         | 2025-2026 | Standard CNCF unifiant métriques + logs + traces                    |
| Migration vers Drizzle ORM     | 2026      | Meilleures performances et typage strict sur les nouvelles versions |
| Passkeys (FIDO2/WebAuthn)      | 2026      | Authentification sans mot de passe, recommandée par FIDO Alliance   |
| Partial Prerendering (Next.js) | 2025      | Amélioration des performances des pages hybrides                    |
| Redis 8.0 (AGPLv3)             | 2025      | Retour au modèle open-source                                        |

---

## 11. Sources

| Ref | Document                                                                                                                                                                                       | Type                     | URL / Localisation                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Documentations officielles des technologies (NestJS, Next.js, React, PostgreSQL, Redis, Docker, Prometheus, Grafana, Loki, Turborepo, Bun, Radix UI, TanStack, Zod, Pino, React Flow, TypeORM) | Primaire                 | docs.nestjs.com, nextjs.org/docs, react.dev, postgresql.org/docs, redis.io/docs, docs.docker.com, prometheus.io/docs, grafana.com/docs, turborepo.dev, bun.sh/docs |
| S2  | State of JavaScript 2024                                                                                                                                                                       | Enquête communautaire    | stateofjs.com/2024                                                                                                                                                 |
| S3  | Stack Overflow Developer Survey 2024                                                                                                                                                           | Enquête communautaire    | survey.stackoverflow.co/2024                                                                                                                                       |
| S4  | npm Trends — comparatifs de téléchargements                                                                                                                                                    | Statistiques             | npmtrends.com                                                                                                                                                      |
| S5  | GitHub — dépôts officiels (stars, issues, releases)                                                                                                                                            | Indicateur communautaire | github.com                                                                                                                                                         |
| S6  | TechEmpower Framework Benchmarks Round 22                                                                                                                                                      | Benchmark indépendant    | techempower.com/benchmarks                                                                                                                                         |
| S7  | OWASP Top 10 2021, OWASP API Security Top 10 2023, OWASP Password Storage Cheat Sheet, OWASP Authentication Cheat Sheet                                                                        | Standard sécurité        | owasp.org                                                                                                                                                          |
| S8  | RFC 7519 — JSON Web Token (JWT)                                                                                                                                                                | Standard IETF            | datatracker.ietf.org/doc/html/rfc7519                                                                                                                              |
| S9  | Règlement (UE) 2016/679 du 27 avril 2016 — RGPD                                                                                                                                                | Texte législatif EU      | eur-lex.europa.eu                                                                                                                                                  |
| S10 | Règlement (UE) 2024/1689 du 13 juin 2024 — IA Act                                                                                                                                              | Texte législatif EU      | eur-lex.europa.eu                                                                                                                                                  |
| S11 | Clarifying Lawful Overseas Use of Data Act (H.R.4943, 2018)                                                                                                                                    | Loi fédérale US          | congress.gov                                                                                                                                                       |
| S12 | Référentiel Général d'Amélioration de l'Accessibilité v4.1 (RGAA)                                                                                                                              | Standard national        | accessibilite.numerique.gouv.fr                                                                                                                                    |
| S13 | Tests pratiques et expérimentations assistées par IA (Claude Sonnet, GitHub Copilot)                                                                                                           | Expérimentation          | N/A                                                                                                                                                                |

---

_Dossier rédigé dans le cadre du passage de la certification Expert en Informatique et Systèmes d'Information — 3W Academy — Bloc de Compétences 1 (BC1)._
