# Note de veille technologique & Green IT

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (Kroma)
**Auteur :** Tony Mascate
**Date :** Juin 2026 _(mise à jour — alignée sur la stack réellement déployée)_

> **Sujet :** choix d'infrastructure sous l'angle conjoint de la performance et de l'éco-responsabilité.
> L'éco-conception n'est pas traitée comme une rubrique isolée mais comme un **critère de sélection
> transverse** : à service rendu équivalent, l'option la moins consommatrice de ressources est préférée.

---

## 1. Présentation des technologies utilisées

### 1.1 Caddy (reverse proxy)

**Caractéristiques principales :**
- Point d'entrée unique du système, devant le frontend Next.js et l'API NestJS.
- Gestion **automatique** du HTTPS via Let's Encrypt (provisionnement et renouvellement des certificats).
- Configuration déclarative et minimale (Caddyfile).

**Intérêt pour la performance :** routage rapide, terminaison TLS centralisée, configuration simple
donc moins d'erreurs.

**Intérêt pour le Green IT :** un seul composant gère l'ensemble du trafic et le chiffrement → moins
de services redondants, infrastructure plus simple, moins de ressources consommées en exploitation.

### 1.2 Bun (runtime & gestionnaire de paquets)

**Caractéristiques principales :** moteur JavaScriptCore, écrit en Zig, intègre gestionnaire de
paquets, bundler et test runner, large compatibilité Node.js. Utilisé pour le build et le
développement (les conteneurs de production exécutent Node.js pour la stabilité).

**Intérêt pour la performance :** exécution et installation des dépendances plus rapides ; builds et
tests accélérés.

**Intérêt pour le Green IT :** moins de cycles CPU pour les mêmes traitements, donc moins de
consommation dans les pipelines CI/CD (qui se déclenchent à chaque push).

### 1.3 NestJS (framework backend)

**Caractéristiques principales :** architecture modulaire et maintenable, TypeScript natif,
intégration TypeORM, injection de dépendances facilitant les tests.

**Intérêt pour le Green IT :** une architecture claire prolonge la durée de vie du projet (moins de
réécriture), réduit les bugs et donc le temps/ressources passés en correction, et permet un
refactoring progressif plutôt qu'une reconstruction.

### 1.4 Next.js (framework frontend, React Server Components)

**Caractéristiques principales :** rendu côté serveur (SSR) et **React Server Components** par défaut,
optimisation automatique des images (WebP/AVIF, redimensionnement, lazy loading), découpage du code.

**Intérêt pour le Green IT :** moins de JavaScript transmis et exécuté côté client (les RSC ne sont
pas hydratés), images plus légères, moins de données transférées sur le réseau — donc moins d'énergie
côté serveur **et** côté terminal de l'utilisateur.

### 1.5 Docker & Docker Swarm (conteneurisation et orchestration)

**Différence avec une machine virtuelle :** un conteneur partage le noyau de l'hôte et n'embarque que
le nécessaire à l'application, là où une VM embarque un OS complet.

**Orchestration :** en production, le cluster est orchestré par **Docker Swarm** (et non un simple
`docker compose`), décrit de façon déclarative dans `stack.yml` (réplicas, rolling updates, secrets,
réseau overlay). `docker compose` reste utilisé pour le développement local.

**Intérêt pour le Green IT :** une même machine physique héberge efficacement plusieurs conteneurs,
moins de serveurs sont nécessaires, et le déploiement automatisé limite les redéploiements inutiles.
Le choix de **Swarm plutôt que Kubernetes** (voir ADR-001) réduit nettement la consommation CPU/RAM
de l'orchestration pour un résultat équivalent à cette échelle.

### 1.6 Stack de données et d'observabilité

- **PostgreSQL + PgBouncer :** le pooler mutualise les connexions des réplicas → moins de mémoire
  consommée côté base.
- **Redis + BullMQ :** cache partagé (moins de requêtes redondantes vers PostgreSQL) et traitement
  d'image **asynchrone** (lissage de la charge CPU au lieu de pics synchrones).
- **Amazon S3 + CloudFront :** stockage et diffusion des images via CDN (région UE, Paris) — la mise
  en cache CDN évite de re-servir et de recalculer les images à chaque consultation.
- **Prometheus + Loki + Grafana :** observabilité légère (Loki indexe par labels, pas en full-text
  comme ELK → pas de JVM, empreinte mémoire et stockage réduits, voir ADR-005).

---

## 2. Analyse sous l'angle de la performance

| Brique | Levier de performance |
| --- | --- |
| Caddy | Routage rapide, TLS centralisé, configuration simple |
| Bun + NestJS | Exécution JS rapide, backend structuré et scalable |
| Next.js (RSC) | Pré-rendu serveur, images et scripts optimisés, bundle client réduit |
| Redis + BullMQ | Cache des réponses fréquentes, traitement d'image hors du cycle requête |
| S3 + CloudFront | Diffusion des images en périphérie (CDN), déchargement de l'API |
| Docker Swarm | Faible overhead, scaling horizontal par ajout de réplicas |

---

## 3. Analyse sous l'angle Green IT

1. **Efficience du backend (Bun, traitement asynchrone)** : moins de cycles CPU et lissage de la
   charge → consommation énergétique serveur réduite.
2. **Optimisation du frontend (Next.js RSC + images WebP)** : moins de données transférées → moins de
   bande passante et d'énergie, côté serveur comme côté client (et autonomie préservée sur mobile).
3. **Conteneurisation et orchestration sobre (Swarm)** : meilleure densité matérielle, moins de
   serveurs, orchestration légère vs Kubernetes.
4. **Observabilité légère (Loki vs ELK)** : pas de JVM, indexation par labels → empreinte mémoire et
   stockage moindres.
5. **Architecture durable (NestJS, ADR)** : code structuré et décisions documentées → maintenabilité
   accrue, moins de réécritures coûteuses sur le long terme.
6. **Point d'entrée unique (Caddy)** : architecture réseau simplifiée, gestion centralisée des
   certificats, moins de composants à exploiter.

---

## 4. Limites et axes d'évolution (mesure de l'empreinte)

La démarche actuelle est **qualitative** (choix de briques sobres). L'axe d'évolution identifié est la
**mesure** de l'empreinte, afin de passer du principe à l'indicateur :

- Instrumenter l'empreinte carbone des traitements (ex. `CodeCarbon` sur le worker d'optimisation) et
  exposer la métrique dans Grafana.
- Définir une **alerte de consommation énergétique** (ex. seuil de CPU soutenu sur le cluster) dans
  l'observabilité Grafana existante (règle d'alerte à ajouter — non encore configurée).
- Suivre des indicateurs de sobriété : poids moyen des pages, octets transférés par session, taux de
  hits CDN (moins de recalculs = moins d'énergie).

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
