# Note de cadrage — Plateforme de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (« Kroma »)
**Auteur :** Tony Mascate
**Date :** Juin 2026
**Version :** 1.0
**Cadre :** Certification _Expert en Informatique et Systèmes d'Information_ (RNCP 40573, niveau 7)

---

## 1. Contexte et enjeux

Le marché de la gestion de photos en ligne est dominé par deux familles de solutions qui s'excluent mutuellement :

- les **SaaS grand public** (Google Photos, iCloud, Amazon Photos) : UX soignée mais données hébergées hors UE, abonnement croissant, exploitation algorithmique des contenus ;
- les **solutions self-hosted open-source** (Immich, Nextcloud) : confidentialité et souveraineté, mais UX technique et peu accessible.

Aucune solution n'occupe le quadrant **« self-hosted RGPD-compliant + UX moderne »**, ni n'offre une **entrée par la couleur** transverse aux dates et aux albums (cf. [benchmark-concurrentiel.md](benchmark-concurrentiel.md)).

**Enjeu produit :** proposer une plateforme privacy-first à l'ergonomie comparable au grand public, différenciée par une killer feature absente du marché : l'**Exploration Chromatique**.

**Enjeu de certification :** démontrer la maîtrise du cycle complet (conception, développement full-stack, infrastructure, CI/CD, observabilité, sécurité) sur un projet fil rouge représentatif du bloc optionnel **DevOps**.

---

## 2. Objectifs

| #   | Objectif                                                                                          | Indicateur de succès                                                     |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| O1  | Permettre à un particulier de stocker, organiser et partager ses photos sans abonnement croissant | Parcours upload → album → partage fonctionnel de bout en bout            |
| O2  | Offrir au photographe amateur une organisation **par la couleur** inédite                         | Nuancier (atlas) peuplé automatiquement à l'upload, navigable par teinte |
| O3  | Garantir la confidentialité (hébergement EU, données personnelles non externalisées)              | Métadonnées et comptes sur VPS EU ; binaires sur S3 région Paris         |
| O4  | Industrialiser le déploiement et l'exploitation                                                   | CI/CD automatisé, observabilité (métriques + logs), infra reproductible  |

---

## 3. Périmètre

### 3.1 Inclus (livré ou en cours — cf. [user-stories.md](user-stories.md))

- **Authentification & compte** : inscription, connexion, déconnexion (JWT + Argon2).
- **Photos** : upload multiple, galerie chronologique, suppression, détail (date, nom).
- **Albums** : création, ajout/retrait de photos, liste, renommage/suppression.
- **Partage** : lien public par photo (activable/désactivable), album partagé entre utilisateurs (par email).
- **Exploration Chromatique** (killer feature) : extraction de palette OKLCH à l'upload, atlas fixe de 53 cellules, navigation par teinte, restriction à un album.
- **Socle technique** : infrastructure Docker Swarm, CI/CD, observabilité, rate limiting, validation partagée.

### 3.2 Exclu / reporté (roadmap)

- Modification et réinitialisation de mot de passe (US-04), suppression de compte / droit à l'oubli automatisé (US-05 — schéma prêt via cascades, pas de purge implémentée).
- Favoris, tags manuels, détail lieu/taille (US-09, US-11, US-10 partiel).
- Recherche et filtres (par date, favori, tag — US-27 à US-29).
- Création d'album directement depuis l'exploration chromatique (US-25), filtres avancés (US-26).
- Photo de couverture d'album (US-17), expiration des liens de partage (US-21).
- Application mobile native, édition photo intégrée, gestion des doublons.

---

## 4. Parties prenantes

| Rôle                  | Acteur                  | Responsabilité                                        |
| --------------------- | ----------------------- | ----------------------------------------------------- |
| Porteur / développeur | Tony Mascate            | Conception, développement, infra, livraison           |
| Jury de certification | 3W Academy / RNCP 40573 | Évaluation du fil rouge et du dossier professionnel   |
| Utilisateurs cibles   | Entourage               | Bénéficiaires finaux (cf. [personas.md](personas.md)) |
| Testeurs              | Entourage               | Retours d'usage informels                             |

---

## 5. Personas cibles

- **Léa, 28 ans, particulier non-technique** — veut retrouver, partager et garder ses photos privées sans payer un abonnement mensuel. Killer feature utilisée : **albums + partage**.
- **Maxime, 24 ans, photographe amateur** — organise mentalement par ambiance colorielle, perd du temps en tri manuel. Killer feature utilisée : **exploration chromatique**.

---

## 6. Contraintes

| Type              | Contrainte                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technique**     | Monorepo Turborepo + Bun ; API NestJS 11 / TypeORM / PostgreSQL ; Web Next.js 16 / React 19 / Tailwind v4 / shadcn ; queue BullMQ + Redis ; stockage AWS S3 + CloudFront.                                                                                           |
| **Architecture**  | Monolithe modulaire (et non microservices) ; déploiement Docker Swarm sur VPS ; reverse proxy Caddy.                                                                                                                                                                |
| **Légale / RGPD** | Données personnelles (comptes, métadonnées, albums) hébergées exclusivement sur VPS EU. Compromis assumé : binaires photo sur S3 région Paris (`eu-west-3`), dépendance AWS soumise au Cloud Act, mitigée par région EU et absence de lien exploitable sans la base |
| **Délai**         | Projet fil rouge cadencé par les échéances de la certification ; développement solo.                                                                                                                                                                                |
| **Ressource**     | Une seule personne (développeur full-stack) ; pas d'équipe ni de budget externe.                                                                                                                                                                                    |
| **Qualité**       | Validation Zod partagée API/web ; tests Jest API + intégration testcontainers ; objectif de couverture en montée progressive.                                                                                                                                       |

---

## 7. Livrables

1. **Application** déployée : API NestJS + Web Next.js + infrastructure Swarm.
2. **Killer feature** Exploration Chromatique opérationnelle.
3. **Documentation projet** ([docs/](.)) : personas, user stories, benchmark, modélisation des données (MCD/MLD/MPD), cartographie SI, diagrammes de flux, 15 ADR, notes Green IT et dev.
4. **Pipelines CI/CD** GitHub Actions (build/déploiement API, web, infra, backup/restore BDD).
5. **Observabilité** : métriques Prometheus + dashboards Grafana, logs Loki/pino.
6. **Dossier professionnel RNCP** (.docx) — bloc optionnel DevOps.

---

## 8. Jalons (macro-planning)

| Jalon                     | Contenu                                                               |    Statut     |
| ------------------------- | --------------------------------------------------------------------- | :-----------: |
| J1 — Cadrage & conception | Personas, user stories, benchmark, modélisation, ADR                  |    Validé     |
| J2 — Socle technique      | Monorepo, infra Swarm, CI/CD, auth, observabilité (métriques, logs, dashboards) |    Validé     |
| J3 — Fonctionnalités cœur | Upload, galerie, albums, partage, pages vitrine + responsive          |    Validé     |
| J4 — Killer feature       | Exploration Chromatique v2 (atlas OKLCH)                              |    Validé     |
| J5 — Qualité & sécurité   | Tests, durcissement (CSRF, throttling, sécurité upload), URLs signées |    Validé     |
| J6 — Roadmap produit      | Recherche/filtres, favoris/tags, gestion de compte                    | à implémenter |
| J7 — Dossier & soutenance | Finalisation du dossier RNCP et préparation jury                      |    Validé     |

> **Vue macro.** Ces jalons regroupent les 10 lots du projet. Le découpage détaillé,
> chiffré (charge par lot) et daté (Gantt) figure dans [wbs-planning.md](wbs-planning.md).

---

## 9. Risques et mitigations

| Risque                                            | Impact | Mitigation                                                                  |
| ------------------------------------------------- | :----: | --------------------------------------------------------------------------- |
| Dépendance AWS (Cloud Act) sur les binaires photo | Moyen  | Région EU, données personnelles non externalisées, mitigation documentée    |
| Développement solo → goulot d'étranglement        | Élevé  | Priorisation MoSCoW stricte (Must Have d'abord), périmètre roadmap assumé   |
| Dette de test au démarrage                        | Moyen  | Plan de tests progressif (Jest API → intégration → E2E → web)               |
| Droit à l'oubli RGPD non automatisé               | Moyen  | Schéma prêt (cascades) ; purge à implémenter en roadmap                     |
| Surcoût / complexité de l'infra auto-hébergée     | Moyen  | Docker Swarm + Ansible pour la reproductibilité, backup/restore automatisés |

---

## 10. Critères de succès

- Les 15 user stories **Must Have** sont livrées et fonctionnelles de bout en bout.
- La killer feature classe automatiquement chaque photo uploadée et reste navigable par teinte.
- Le déploiement est entièrement automatisé via CI/CD, sans intervention manuelle.
- Les données personnelles ne quittent pas le VPS EU.
- Le dossier professionnel couvre l'ensemble des compétences du référentiel (dont bloc DevOps), grounded sur le code réel.

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
