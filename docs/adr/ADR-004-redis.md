# ADR-004 — Cache : Redis

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon API NestJS tourne sur plusieurs réplicas dans Docker Swarm. Certaines requêtes sont coûteuses (liste d'albums avec miniatures, métadonnées photos). Un cache en mémoire locale (`Map` ou `node-cache`) ne serait pas partagé entre les réplicas — chaque instance aurait son propre cache, ce qui cause des incohérences. Il me faut un cache centralisé, accessible par tous les réplicas.

---

## Options considérées

| Critère                    | Redis                        | Memcached                    | Cache en mémoire (local)     |
|----------------------------|------------------------------|------------------------------|------------------------------|
| Partagé entre réplicas     | Oui                          | Oui                          | Non                          |
| Structures de données      | Riches (strings, hash, sets, listes, sorted sets) | Clé/valeur simple | Clé/valeur simple            |
| Persistance                | Oui (optionnelle)            | Non                          | Non                          |
| TTL natif                  | Oui                          | Oui                          | Dépend de la lib             |
| Intégration NestJS         | Native (@nestjs/cache-manager, ioredis) | Possible            | Native                       |

---

## Décision

**J'utilise Redis comme cache centralisé pour mon application.**

---

## Justification

1. **Cache partagé entre réplicas :** Redis est accessible par tous les réplicas de mon API. Que la requête arrive sur le réplica 1 ou 3, le cache est le même — pas d'incohérence.

2. **Cache performant :** Redis répond en moins d'une milliseconde. Je l'utilise pour cacher les réponses fréquentes (liste d'albums, profil utilisateur) et réduire la charge sur PostgreSQL.

3. **TTL natif :** Chaque clé peut expirer automatiquement (ex : cache qui expire après 5 minutes). Pas besoin de gérer manuellement l'invalidation.

4. **Intégration NestJS :** Le module `@nestjs/cache-manager` avec le driver `ioredis` s'intègre directement dans NestJS avec un simple décorateur `@UseInterceptors(CacheInterceptor)` ou via `cacheManager.get()/set()`.

---

## Conséquences

**Positives :**
- Cache centralisé et cohérent entre tous les réplicas.
- Réduction de la charge sur PostgreSQL pour les requêtes fréquentes.
- Performances élevées (sous la milliseconde).

**Négatives / Risques :**
- Redis est un point de défaillance unique (SPOF) — si Redis tombe, le cache n'est plus disponible et toutes les requêtes retombent sur PostgreSQL. Acceptable à l'échelle du projet.
- Consommation mémoire à surveiller si le volume de données cachées augmente.