# ADR-003 — Backend : NestJS + TypeORM

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon application nécessite une API REST robuste capable de gérer l'authentification, le CRUD sur les photos/albums/utilisateurs, et le partage de ressources. L'API doit tourner sur plusieurs réplicas dans Docker Swarm et interagir avec PostgreSQL (via PgBouncer), Redis et le système de fichiers.

---

## Options considérées

### Framework backend

| Critère                    | NestJS (Node.js)              | Express.js (Node.js)          | Spring Boot (Java)            |
|----------------------------|-------------------------------|-------------------------------|-------------------------------|
| Architecture               | Modulaire, opinionnée         | Minimaliste, libre            | Modulaire, opinionnée         |
| Courbe d'apprentissage     | Moyenne                       | Faible                        | Élevée                        |
| TypeScript natif           | Oui                           | Possible mais pas natif       | Non (Java/Kotlin)             |
| Injection de dépendances   | Intégrée                      | Non                           | Intégrée                      |
| Écosystème (auth, cache…)  | Très riche (@nestjs/*)        | Via middlewares tiers         | Très riche                    |
| Performance                | Bonne                         | Bonne                         | Excellente                    |
| Cohérence stack avec Next.js | Forte (même langage TS et turbo repo)     | Forte                         | Faible (langages différents)  |

### ORM

| Critère                    | TypeORM                       | Prisma                        | Sequelize                     |
|----------------------------|-------------------------------|-------------------------------|-------------------------------|
| Support PostgreSQL         | Excellent                     | Excellent                     | Bon                           |
| Migrations                 | Intégrées                     | Intégrées                     | Intégrées                     |
| Approche                   | Code-first (décorateurs)      | Schema-first (fichier .prisma)| Code-first                    |
| Intégration NestJS         | Native (@nestjs/typeorm)      | Bonne (module communautaire)  | Moyenne                       |
| Relations & transactions   | Complètes                     | Complètes                     | Complètes                     |
| TypeScript                 | Bon                           | Excellent                     | Moyen                         |

---

## Décision

**J'utilise NestJS comme framework backend et TypeORM comme ORM.**

---

## Justification

### NestJS

1. **Architecture modulaire :** NestJS impose une structure claire (modules, controllers, services) qui facilite la maintenance et la lisibilité du code.

2. **Stack homogène en TypeScript :** Mon frontend est en Next.js (TypeScript). Utiliser NestJS me permet de rester sur un seul langage pour tout le projet, ce qui simplifie le développement et permet de partager des types/interfaces entre front et back.

3. **Écosystème intégré :** NestJS fournit des modules officiels pour tout ce dont j'ai besoin : authentification (@nestjs/passport, @nestjs/jwt), cache (@nestjs/cache-manager avec Redis), validation (zod), documentation API (@nestjs/swagger).

4. **Injection de dépendances :** Le système d'injection de dépendances natif facilite les tests unitaires et le découplage des composants.

### TypeORM

1. **Approche code-first avec décorateurs :** Je définis mes entités directement en TypeScript avec des décorateurs (@Entity, @Column, @ManyToOne…). Le schéma de base de données est généré à partir du code, ce qui garantit la cohérence.

2. **Migrations automatiques :** TypeORM génère les fichiers de migration à partir des changements d'entités, ce qui facilite le versioning du schéma en base.

3. **Intégration native NestJS :** Le module @nestjs/typeorm s'intègre directement dans le système d'injection de dépendances de NestJS, sans configuration complexe.

4. **Support PostgreSQL complet :** TypeORM exploite les fonctionnalités avancées de PostgreSQL (UUID, JSON, types natifs) utilisées dans mon projet (voir ADR-002).

---

## Conséquences

**Positives :**
- Code structuré et maintenable grâce à l'architecture modulaire de NestJS.
- Un seul langage (TypeScript) sur toute la stack, réduisant la charge cognitive.
- Migrations de base de données versionnées et reproductibles.
- Documentation API auto-générée via Swagger.

**Négatives / Risques :**
- TypeORM est moins performant que Prisma sur les requêtes complexes et son typage est moins strict.
- La couche d'abstraction de NestJS ajoute une légere surcouche par rapport à Express brut.
