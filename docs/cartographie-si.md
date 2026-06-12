# Cartographie du Système d'Information

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums
**Auteur :** Tony Mascate
**Date :** Janvier 2025

---

## Table des matières

1. [Diagramme de composants](#1-diagramme-de-composants)
2. [Diagramme de déploiement](#2-diagramme-de-déploiement)
3. [Analyse de risques](#3-analyse-de-risques)
4. [Accessibilité](#4-accessibilité)

---

## 1. Diagramme de composants

> **Objectif :** représenter le découpage fonctionnel du système — les grandes briques métier et leurs interactions.

**Diagramme 1 — Architecture applicative**

```mermaid
graph LR
  Browser["Navigateur"]

  subgraph Frontend["Frontend — Next.js 16"]
    AuthUI["UI Auth"]
    GalleryUI["UI Galerie"]
    AlbumUI["UI Albums"]
    WhiteboardUI["UI Whiteboard"]
  end

  subgraph API["API — NestJS"]
    AuthMod["Auth\n‹IAuthentication›\n‹IAuthorization›"]
    UserMod["Users"]
    PhotoMod["Photos\n‹IPhotoService›"]
    AlbumMod["Albums"]
    WhiteboardMod["Whiteboard"]
    StorageMod["Storage\n‹IStorage›"]
  end

  subgraph Data["Données"]
    PgBouncer["PgBouncer"]
    PostgreSQL[("PostgreSQL")]
    Redis[("Redis")]
  end

  subgraph AWS["AWS"]
    S3[("S3")]
    CloudFront["CloudFront"]
  end

  Browser -->|"HTTPS"| Frontend
  Browser -->|"CDN"| CloudFront

  Frontend -->|"REST"| AuthMod
  Frontend -->|"REST"| PhotoMod
  Frontend -->|"REST"| AlbumMod
  Frontend -->|"REST"| WhiteboardMod

  AuthMod -->|"cookie JWT"| Browser
  AuthMod --> PgBouncer
  UserMod --> PgBouncer
  PhotoMod --> PgBouncer
  PhotoMod --> StorageMod
  AlbumMod --> PhotoMod
  AlbumMod --> PgBouncer
  WhiteboardMod --> PhotoMod
  WhiteboardMod --> PgBouncer
  StorageMod -->|"AWS SDK"| S3
  S3 --- CloudFront

  API -->|"cache"| Redis
  PgBouncer --> PostgreSQL
```

**Diagramme 2 — Observabilité**

```mermaid
graph LR
  subgraph App["Application (VPS)"]
    API["API NestJS"]
    Frontend["Frontend Next.js"]
  end

  subgraph Obs["Stack observabilité"]
    Promtail["Promtail"]
    Prometheus["Prometheus"]
    Loki["Loki"]
    Grafana["Grafana"]
  end

  API -->|"logs JSON"| Promtail
  Frontend -->|"logs JSON"| Promtail
  Promtail -->|"push"| Loki
  Prometheus -->|"scrape métriques"| API
  Loki --> Grafana
  Prometheus --> Grafana
```

### Interactions clés

| Flux                 | Source           | Destination     | Protocole        | Donnée                 |
| -------------------- | ---------------- | --------------- | ---------------- | ---------------------- |
| Requêtes utilisateur | Browser          | Next.js         | HTTPS :443       | Pages HTML / JSON      |
| Appels API           | Next.js          | NestJS          | HTTP :4000       | JSON (REST)            |
| Auth tokens          | NestJS           | Browser         | HTTP-only cookie | JWT                    |
| Données métier       | NestJS           | PgBouncer       | TCP :5432        | SQL                    |
| Connexions BDD       | PgBouncer        | PostgreSQL      | TCP :5432        | SQL (pooled)           |
| Cache                | NestJS           | Redis           | TCP :6379        | Clé-valeur             |
| Upload photos        | NestJS           | Amazon S3       | HTTPS (AWS SDK)  | Binaire                |
| Distribution photos  | CloudFront (CDN) | Browser         | HTTPS            | Binaire (mis en cache) |
| Logs                 | NestJS           | Promtail → Loki | HTTP             | JSON structuré         |
| Métriques            | Prometheus       | NestJS          | HTTP :9464       | Prometheus format      |

---

## 2. Diagramme de déploiement

> **Objectif :** représenter l'infrastructure physique — où tourne quoi et comment ça communique.

```mermaid
graph TB
  subgraph Dev["Développeur"]
    DevMachine["Machine locale\n(Linux dual-boot)"]
  end

  subgraph CICD["CI/CD — GitHub"]
    GHActions["GitHub Actions\n(build, test, push)"]
    GHCR["ghcr.io\n(Container Registry)"]
    GHActions -->|"docker push"| GHCR
  end

  subgraph VPS["VPS — Docker Swarm (Linux)"]
    direction TB

    subgraph FrontendSvc["Service : frontend (2 réplicas)"]
      Next1["«container»\nNext.js :3000"]
      Next2["«container»\nNext.js :3000"]
    end

    subgraph APISvc["Service : api (2 réplicas)"]
      API1["«container»\nNestJS :4000"]
      API2["«container»\nNestJS :4000"]
    end

    subgraph DBSvc["Service : données"]
      PgBouncer["«container»\nPgBouncer :5432"]
      PostgreSQL["«container»\nPostgreSQL :5432"]
      Redis["«container»\nRedis :6379"]
    end

    subgraph ObsSvc["Service : observabilité"]
      Prometheus["«container»\nPrometheus :9090"]
      Loki["«container»\nLoki :3100"]
      Grafana["«container»\nGrafana :3001"]
      Promtail["«container»\nPromtail"]
      cAdvisor["«container»\ncAdvisor :8080"]
    end

    PGVol[("Volume\npostgres-data")]
  end

  S3["«external»\nAmazon S3 + CloudFront"]
  Browser["«device»\nClient Browser"]

  DevMachine -->|"git push"| GHActions
  GHCR -->|"SSH + docker stack deploy"| VPS

  Browser -->|"HTTPS :443"| FrontendSvc
  Browser -->|"HTTPS (CDN)"| S3
  FrontendSvc -->|"HTTP :4000"| APISvc
  APISvc -->|"TCP :5432"| PgBouncer
  PgBouncer -->|"TCP :5432"| PostgreSQL
  APISvc -->|"TCP :6379"| Redis
  APISvc -->|"HTTPS (AWS SDK)"| S3
  PostgreSQL --- PGVol

  %% AWS est un service externe, non déployé via CI/CD

  Promtail -->|"scrape logs"| APISvc
  Promtail -->|"scrape logs"| FrontendSvc
  Promtail -->|"HTTP :3100"| Loki
  Prometheus -->|"scrape :9464"| APISvc
  Prometheus -->|"scrape :8080"| cAdvisor
  Loki --> Grafana
  Prometheus --> Grafana
```

### Ports et protocoles

| Service            | Port exposé | Protocole                                   | Accessible depuis        |
| ------------------ | ----------- | ------------------------------------------- | ------------------------ |
| Next.js (frontend) | :3000       | HTTP (interne) / HTTPS :443 (reverse proxy) | Internet                 |
| NestJS (API)       | :4000       | HTTP                                        | Réseau interne Swarm     |
| PgBouncer          | :5432       | TCP                                         | Réseau interne Swarm     |
| PostgreSQL         | :5432       | TCP                                         | PgBouncer uniquement     |
| Redis              | :6379       | TCP                                         | Réseau interne Swarm     |
| Prometheus         | :9090       | HTTP                                        | Réseau interne Swarm     |
| Grafana            | :3001       | HTTP                                        | Administrateur (protégé) |
| Loki               | :3100       | HTTP                                        | Promtail uniquement      |

### Points critiques identifiés

| Point                  | Description                         | Risque                                              |
| ---------------------- | ----------------------------------- | --------------------------------------------------- |
| PostgreSQL single node | Pas de réplication lecture/écriture | SPOF — panne = indisponibilité BDD                  |
| Redis single node      | Pas de cluster Redis                | SPOF — panne = cache perdu                          |
| VPS unique             | Un seul serveur physique            | Indisponibilité totale si panne matérielle          |
| S3 / CloudFront (AWS)  | Service US soumis au Cloud Act      | Données photos exposables aux autorités américaines |

---

## 3. Analyse de risques

> **Méthode :** EBIOS Risk Manager (ANSSI) — version simplifiée (Ateliers 1, 2, 3 et 5)
> Probabilité : 1 (faible) → 3 (élevée) · Impact : 1 (faible) → 3 (critique)
> Score brut = Probabilité × Impact · Seuils : 1-2 🟢 · 3-4 🟡 · 6-9 🔴

---

### Atelier 1 — Cadrage et valeurs métier

#### Valeurs essentielles

| Valeur métier            | Description                                    | Critères de sécurité           |
| ------------------------ | ---------------------------------------------- | ------------------------------ |
| Photos des utilisateurs  | Fichiers binaires personnels stockés sur S3    | Confidentialité, Disponibilité |
| Comptes utilisateurs     | Email, mot de passe haché Argon2, profil       | Confidentialité, Intégrité     |
| Albums et partages       | Structure des albums, tokens de partage public | Intégrité, Disponibilité       |
| Disponibilité du service | Accès à la plateforme web                      | Disponibilité                  |

#### Biens supports

| Bien support                | Type                                        | Valeurs métier associées |
| --------------------------- | ------------------------------------------- | ------------------------ |
| PostgreSQL                  | Base de données relationnelle (nœud unique) | Toutes                   |
| Amazon S3                   | Stockage objet externe (AWS eu-west-3)      | Photos                   |
| API NestJS                  | Serveur d'application (2 réplicas Swarm)    | Toutes                   |
| Redis                       | Cache + verrous d'upload multipart          | Service, Auth            |
| VPS Docker Swarm            | Infrastructure d'hébergement (nœud unique)  | Toutes                   |
| Service Auth (JWT + Argon2) | Composant applicatif d'authentification     | Comptes                  |

---

### Atelier 2 — Sources de risque

| Source de risque             | Motivation                            | Capacité | Type de menace                           |
| ---------------------------- | ------------------------------------- | -------- | ---------------------------------------- |
| Hacker externe               | Vol de photos, revente de comptes     | Élevée   | Attaque ciblée ou opportuniste           |
| Bot automatisé               | Brute force, credential stuffing      | Élevée   | Attaque de masse non ciblée              |
| Erreur humaine               | Inattention, fatigue, manque de revue | Élevée   | Mauvaise configuration, fuite de secrets |
| Panne matérielle / réseau    | Usure, incident datacenter            | Moyenne  | Indisponibilité non intentionnelle       |
| Fournisseur défaillant (AWS) | Incident cloud, panne régionale       | Faible   | Indisponibilité externe                  |

---

### Atelier 3 — Scénarios de risque

> Probabilité et impact évalués **avant mitigation** · Score résiduel **après mitigation**
> Échelle : 1 (faible) → 3 (élevé) · Score = Probabilité × Impact

| #   | Actif         | Menace                                     | Source de risque       | Prob. | Impact | Score brut | Mitigation                                                             | Score résiduel |
| --- | ------------- | ------------------------------------------ | ---------------------- | :---: | :----: | :--------: | ---------------------------------------------------------------------- | :------------: |
| R1  | Service Auth  | Brute force sur login                      | Bot automatisé         |   3   |   3    |  **9** 🔴  | Throttler (5 req/60s), Argon2id, refresh token JWT révocable en base   |    **2** 🟢    |
| R2  | PostgreSQL    | Panne / indisponibilité (SPOF)             | Panne matérielle       |   3   |   3    |  **9** 🔴  | Backups quotidiens automatisés, restart policy Swarm, alerting Grafana |    **6** 🔴    |
| R3  | Photos        | Accès non autorisé à des photos privées    | Hacker externe         |   2   |   3    |  **6** 🔴  | Ownership guard (`photo.userId`), JWT HTTP-only, URL S3 signées        |    **2** 🟢    |
| R4  | Tokens JWT    | Vol de token via XSS                       | Hacker externe         |   2   |   3    |  **6** 🔴  | Cookies HTTP-only (inaccessibles par JS), access token 15 min, HTTPS   |    **2** 🟢    |
| R5  | VPS           | Indisponibilité totale (panne matérielle)  | Panne matérielle       |   2   |   3    |  **6** 🔴  | Rolling updates Swarm, snapshot VPS régulier, alerting Grafana         |    **3** 🟡    |
| R6  | Redis         | Indisponibilité (SPOF)                     | Panne matérielle       |   2   |   2    |  **4** 🟡  | Restart policy Swarm, graceful degradation (cache miss → DB)           |    **2** 🟢    |
| R7  | API NestJS    | Injection SQL                              | Hacker externe         |   1   |   3    |  **3** 🟡  | TypeORM (requêtes paramétrées), validation Zod sur toutes les entrées  |    **1** 🟢    |
| R8  | S3 / AWS      | Cloud Act — accès données par autorités US | Fournisseur défaillant |   1   |   2    |  **2** 🟢  | Région EU (eu-west-3 Paris), aucune donnée personnelle stockée sur S3  |    **1** 🟢    |
| R9  | Logs (Loki)   | Fuite de données sensibles dans les logs   | Erreur humaine         |   1   |   2    |  **2** 🟢  | Pino sans MDP ni token ; email loggé uniquement à la connexion (audit intentionnel) |    **1** 🟢    |
| R10 | Images Docker | Supply chain attack                        | Hacker externe         |   1   |   2    |  **2** 🟢  | Build CI contrôlé, ghcr.io privé, GITHUB_TOKEN éphémère                |    **1** 🟢    |

#### Matrice de risques (avant mitigation)

```mermaid
quadrantChart
    title Matrice de risques — Probabilité × Impact (avant mitigation)
    x-axis Faible Impact --> Impact Critique
    y-axis Faible Probabilite --> Probabilite Elevee
    quadrant-1 Risques critiques
    quadrant-2 Risques surveilles
    quadrant-3 Risques mineurs
    quadrant-4 Risques significatifs
    R1 - Brute force: [0.80, 0.83]
    R2 - Panne PostgreSQL: [0.86, 0.87]
    R3 - Acces photos: [0.82, 0.50]
    R4 - Vol token XSS: [0.87, 0.46]
    R5 - Indispo VPS: [0.84, 0.54]
    R6 - Redis SPOF: [0.50, 0.50]
    R7 - Injection SQL: [0.83, 0.15]
    R8 - Cloud Act: [0.47, 0.15]
    R9 - Fuite logs: [0.52, 0.15]
    R10 - Supply chain: [0.56, 0.15]
```

---

### Atelier 5 — Traitement du risque

| #   | Stratégie              | Actions concrètes                                                                   | Responsable  | Délai         |
| --- | ---------------------- | ----------------------------------------------------------------------------------- | ------------ | ------------- |
| R1  | **RÉDUIRE**            | Throttler NestJS (5 req/60s sur `/auth/login`), Argon2id, rotation refresh token    | Tony Mascate | ✅ Implémenté |
| R2  | **RÉDUIRE + ACCEPTER** | Backup PostgreSQL quotidien via workflow GitHub Actions, alerting Grafana/PagerDuty | Tony Mascate | ✅ Implémenté |
| R3  | **RÉDUIRE**            | Ownership guard sur chaque ressource, URL S3 signées temporairement                 | Tony Mascate | ✅ Implémenté |
| R4  | **RÉDUIRE**            | Cookies HTTP-only + Secure + SameSite=Lax, access token 15 min, HTTPS obligatoire   | Tony Mascate | ✅ Implémenté |
| R5  | **RÉDUIRE + ACCEPTER** | Docker Swarm restart policy, snapshot VPS hebdomadaire, alerting Grafana            | Tony Mascate | ✅ Implémenté |
| R6  | **RÉDUIRE**            | Restart policy Swarm, dégradation gracieuse (cache miss → DB)                       | Tony Mascate | ✅ Implémenté |
| R7  | **ÉVITER**             | TypeORM avec requêtes paramétrées, validation Zod sur toutes les entrées API        | Tony Mascate | ✅ Implémenté |
| R8  | **TRANSFÉRER**         | AWS région eu-west-3 (Paris), aucune PII stockée sur S3 (binaires uniquement)       | AWS / Tony   | ✅ Implémenté |
| R9  | **RÉDUIRE**            | Pino sans MDP ni token ; email loggé à la connexion uniquement (traçabilité sécurité) | Tony Mascate | ✅ Implémenté |
| R10 | **RÉDUIRE**            | Pipeline CI GitHub Actions, registry privé ghcr.io, GITHUB_TOKEN éphémère           | Tony Mascate | ✅ Implémenté |

#### Risques résiduels acceptés

- **R2 — PostgreSQL SPOF (score résiduel 6) :** La réplication primaire/secondaire dépasse la charge d'un projet solo. Mitigation retenue : backup quotidien automatisé + alerting immédiat. Risque accepté en connaissance de cause.
- **R5 — VPS unique (score résiduel 3) :** Un VPS de failover n'est pas justifié économiquement à cette échelle. Le restart automatique Docker Swarm couvre les pannes applicatives.
- **Pas de WAF :** Le rate limiting applicatif (Throttler NestJS) et le pare-feu réseau du VPS constituent la protection en place. Risque accepté.

---

## 4. Accessibilité

> **Référentiel :** WCAG 2.1 (niveau AA) / RGAA 4.1
> **Principes POUR :** Perceptible · Opérable · Understandable · Robuste

### 4.1 Choix techniques favorisant l'accessibilité

| Technologie                   | Bénéfice accessibilité                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Radix UI** (base shadcn/ui) | Implémente nativement tous les patterns ARIA : focus management, keyboard navigation, rôles ARIA corrects sur tous les composants (Dialog, Select, Tooltip…) |
| **Next.js (App Router, RSC)** | Génère du HTML sémantique côté serveur — favorable aux lecteurs d'écran et au référencement                                                                  |
| **Tailwind CSS v4**           | Utilitaires de contraste intégrés, respect des ratios WCAG via les classes de couleur                                                                        |
| **HTML sémantique**           | Landmarks HTML5 (`<header>`, `<nav>`, `<main>`, `<footer>`) utilisés dans tous les layouts                                                                   |

### 4.2 Critères WCAG appliqués

| Critère WCAG                       | Principe       | Application dans le projet                                                                      |
| ---------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| 1.1.1 — Contenu non textuel        | Perceptible    | Attribut `alt` descriptif sur toutes les vignettes photos ; `alt=""` sur les images décoratives |
| 1.4.3 — Contraste (minimum)        | Perceptible    | Ratio 4.5:1 minimum pour le texte normal, 3:1 pour le grand texte (vérifié via extensions web)  |
| 1.4.1 — Utilisation de la couleur  | Perceptible    | Statuts et informations non transmis uniquement par la couleur (icône + texte + couleur)        |
| 2.1.1 — Clavier                    | Opérable       | Navigation Tab/Entrée/Échap fonctionnelle sur tous les composants Radix UI                      |
| 2.4.3 — Ordre du focus             | Opérable       | Ordre de tabulation suit le flux de lecture visuel                                              |
| 2.4.7 — Focus visible              | Opérable       | Outline visible sur l'élément actif (non supprimé)                                              |
| 3.1.1 — Langue de la page          | Understandable | `lang="fr"` défini sur le `<html>`                                                              |
| 3.3.1 — Identification des erreurs | Understandable | Messages d'erreur Zod localisés et associés aux champs via `react-hook-form`                    |
| 4.1.2 — Nom, rôle, valeur          | Robuste        | Rôles ARIA natifs via Radix UI sur tous les composants interactifs                              |

### 4.3 Point de vigilance — Whiteboard (killer feature)

Le whiteboard interactif (React Flow) repose sur un rendu Canvas/SVG avec drag & drop. Ce type d'interface pose des défis d'accessibilité spécifiques :

| Limitation                                         | Impact                                    | Mitigation prévue                                                                                       |
| -------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Drag & drop non accessible au clavier par défaut   | Utilisateurs moteurs / navigation clavier | Prévoir des alternatives clavier : boutons "Déplacer nœud", sélection par Tab + touches directionnelles |
| Nœuds colorés comme seul identifiant               | Utilisateurs daltoniens                   | Ajouter un label textuel sur chaque nœud (nom de la couleur en texte)                                   |
| Zone canvas non vocalisée par les lecteurs d'écran | Utilisateurs malvoyants                   | Ajouter une description textuelle de la carte (liste des nœuds et photos associées) en dehors du canvas |

> **Note :** L'accessibilité complète du whiteboard représente une contrainte technique significative. Le niveau AA sur cette fonctionnalité spécifique sera atteint partiellement, avec les alternatives textuelles comme priorité.

### 4.4 Checklist de validation

- [ ] Tester la navigation clavier complète (Tab, Entrée, Échap) sans souris
- [ ] Vérifier les contrastes avec l'outil Wave ou Axe DevTools
- [ ] Valider les attributs `alt` sur toutes les images
- [ ] Tester avec un lecteur d'écran (NVDA / VoiceOver) sur les pages principales
- [ ] Vérifier que les messages d'erreur des formulaires sont annoncés par les lecteurs d'écran
- [ ] Contrôler la hiérarchie des titres (un seul `<h1>` par page, pas de saut de niveau)

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
