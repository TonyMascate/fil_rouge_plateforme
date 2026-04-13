# ADR-002 — Base de données : PostgreSQL + PgBouncer
 
- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate
 
---
 
## Contexte
 
Mon application de gestion de photos nécessite une base de données relationnelle pour stocker les utilisateurs, les photos, les albums et les liens de partage. Avec Docker Swarm, je dispose de plusieurs réplicas de mon API NestJS qui vont toutes ouvrir des connexions vers la base de données simultanément. Sans gestion, cela peut rapidement saturer PostgreSQL qui a une limite de connexions simultanées.
 
---
 
## Options considérées
 
### Base de données
 
| Critère                  | PostgreSQL          | MySQL               | MongoDB             |
|--------------------------|---------------------|---------------------|---------------------|
| Type                     | Relationnel         | Relationnel         | NoSQL (documents)   |
| Richesse des types       | Excellente (JSON, UUID, ARRAY…) | Bonne    | Bonne               |
| Intégrité des données    | Forte (contraintes, FK, transactions ACID) | Bonne | Faible (pas de FK natif) |
| Support TypeORM          | Excellent           | Excellent           | Partiel             |
| Adapté aux données photos | Oui (relations claires) | Oui            | Moins naturel       |
| Open source & communauté | Très large          | Large (Oracle)      | Large (MongoDB Inc) |
 
### Gestion des connexions
 
| Critère                  | Connexions directes | PgBouncer           |
|--------------------------|---------------------|---------------------|
| Nombre de connexions     | 1 par réplica API   | Mutualisées (pool)  |
| Consommation mémoire     | Élevée              | Faible              |
| Configuration            | Aucune              | Légère              |
| Adapté à plusieurs réplicas | Non            | Oui                 |
 
---
 
## Décision
 
**J'utilise PostgreSQL comme base de données, associé à PgBouncer comme connection pooler.**
 
---
 
## Justification
 
### PostgreSQL
 
1. **Modèle relationnel adapté :** Mes données (utilisateurs, photos, albums, partages) ont des relations claires et des contraintes d'intégrité importantes. Un modèle relationnel est donc privilégié.
 
2. **Intégration TypeORM :** PostgreSQL est le SGBD de référence pour TypeORM avec NestJS. Le support est complet : migrations, relations, transactions, types natifs.
 
3. **Types avancés :** PostgreSQL supporte nativement les UUID (pour les identifiants de partage public), les types JSON (pour les métadonnées EXIF) et les tableaux.
 
4. **Fiabilité et maturité :** PostgreSQL est battle-tested depuis plus de 30 ans, open source, sans dépendance commerciale (contrairement à MySQL/Oracle).
 
### PgBouncer
 
1. **Problème de connexions avec Swarm :** Chaque réplica de mon API NestJS maintient un pool de connexions vers PostgreSQL. Avec 3 réplicas et un pool de 10 connexions chacun, j'arrive à 30 connexions simultanées. PgBouncer mutualise ces connexions et en présente un nombre réduit à PostgreSQL.
 
2. **Mode transaction pooling :** En mode `transaction`, PgBouncer alloue une connexion uniquement le temps d'une transaction, puis la libère. C'est le mode le plus efficace pour une API REST.
 
3. **Faible overhead :** PgBouncer est un processus léger (quelques Mo de RAM) qui s'intercale de façon transparente entre mon API et PostgreSQL.
 
---
 
## Conséquences
 
**Positives :**
- Intégrité des données garantie par les contraintes PostgreSQL.
- Connexions mutualisées et optimisées grâce à PgBouncer.
- Performances stables même avec plusieurs réplicas d'API.
- Migrations gérées proprement via TypeORM.
 
**Négatives / Risques :**
- PgBouncer en mode transaction pooling est incompatible avec certaines fonctionnalités PostgreSQL (prepared statements, advisory locks) — non bloquant pour ce projet.
- Un seul nœud PostgreSQL (pas de réplication lecture/écriture) — suffisant à l'échelle du projet.