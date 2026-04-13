# ADR-013 — Rate Limiting : NestJS Throttler

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon API NestJS expose des routes publiques (authentification, partage public) et des routes authentifiées. Sans protection, un attaquant peut tenter une attaque par force brute sur le login, abuser des endpoints de recherche ou saturer l'API avec des requêtes automatisées. Je dois mettre en place une limitation du débit (rate limiting) adaptée à mon architecture multi-réplicas.

---

## Options considérées

| Critère                        | NestJS Throttler               | Nginx rate limit              | Redis + middleware custom     | Express rate-limit            |
|--------------------------------|--------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Intégration NestJS             | Native (@nestjs/throttler)     | En amont (reverse proxy)      | Via Guard custom              | Via middleware                |
| Configuration par route        | Oui (décorateurs)              | Limitée (par URL pattern)     | Flexible                      | Partielle                     |
| Stockage de l'état             | Mémoire ou Redis               | Nginx interne                 | Redis (partagé)               | Mémoire ou Redis              |
| Multi-réplicas                 | Oui si Redis backend           | Oui (centralisé)              | Oui (Redis)                   | Oui si Redis backend          |
| Complexité                     | Faible                         | Faible (mais séparé du code)  | Élevée                        | Faible                        |

---

## Décision

**J'utilise `@nestjs/throttler` comme guard global avec deux buckets de limitation, appliqué à toutes les routes.**

---

## Justification

1. **Intégration native NestJS :** `@nestjs/throttler` s'intègre directement dans le système de guards de NestJS. La configuration est déclarative dans `AppModule` et appliquée globalement via `APP_GUARD`. Pas de proxy intermédiaire à configurer.

2. **Deux buckets de limitation :**
   - **Court terme (short) :** 100 requêtes par minute par IP — protège contre les pics soudains et les scripts automatisés basiques.
   - **Long terme (long) :** 500 requêtes par 10 minutes par IP — protège contre les attaques soutenues tout en permettant un usage intensif légitime.

3. **Protection par décorateur :** Les routes sensibles (login, register, reset password) peuvent être annotées avec `@Throttle()` pour des limites plus strictes, sans modifier la configuration globale.

4. **Stockage en mémoire acceptable à cette échelle :** Pour ce projet, le stockage en mémoire des compteurs est suffisant. En environnement multi-réplicas Swarm, chaque réplica maintient ses propres compteurs — un attaquant pourrait théoriquement contourner la limite en atteignant des réplicas différents. Un backend Redis serait la solution idéale, mais la complexité additionnelle n'est pas justifiée à l'échelle du projet.

5. **Réponse 429 standardisée :** En cas de dépassement, le Throttler renvoie automatiquement un HTTP 429 Too Many Requests avec les headers `Retry-After` — comportement attendu par les clients bien implémentés.

---

## Conséquences

**Positives :**
- Protection immédiate contre les tentatives de brute force et les abus.
- Configuration déclarative, lisible dans le code.
- Extensible : configuration par route ou par contrôleur via décorateurs.

**Négatives / Risques :**
- Sans backend Redis, les compteurs ne sont pas partagés entre réplicas Swarm — un attaquant distribuant ses requêtes entre les réplicas peut dépasser la limite effective. Acceptable pour ce niveau de projet.
- Le rate limiting par IP est inefficace derrière un proxy si les IPs réelles ne sont pas forwarded (nécessite configuration du `X-Forwarded-For` header).
