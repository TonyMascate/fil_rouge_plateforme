# ADR-014 — Logging structuré : Pino + nestjs-pino

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon API NestJS doit produire des logs exploitables pour le débogage et l'observabilité. Ces logs sont collectés par Promtail (agent Loki) et indexés dans Loki pour consultation via Grafana (voir ADR-005). Je dois choisir un logger qui produit des logs structurés (JSON), performant, et facilement intégrable dans NestJS.

---

## Options considérées

| Critère                        | Pino (nestjs-pino)            | Winston                       | Bunyan                        | console.log natif             |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Format JSON natif              | Oui                           | Oui (avec transports)         | Oui                           | Non                           |
| Performance                    | Excellente (la plus rapide)   | Bonne                         | Bonne                         | Très bonne                    |
| Logs HTTP automatiques         | Oui (pino-http)               | Via morgan                    | Manuelle                      | Manuelle                      |
| Intégration NestJS             | Via `nestjs-pino` (officieux) | Via logger custom             | Via logger custom             | Native (mais pas structuré)   |
| Compatibilité Loki             | Excellente (JSON natif)       | Bonne                         | Bonne                         | Mauvaise                      |
| Pretty print développement     | Via `pino-pretty`             | Oui (colorize)                | Via `bunyan` CLI              | Natif                         |

---

## Décision

**J'utilise Pino via `nestjs-pino` pour le logging structuré de l'API, avec `pino-pretty` en développement et JSON brut en production.**

---

## Justification

1. **Performance de Pino :** Pino est le logger Node.js le plus rapide disponible. Il utilise une approche asynchrone (sérialisation dans un worker thread) qui minimise l'impact sur la latence des requêtes. Pour une API avec plusieurs réplicas qui logge chaque requête HTTP, la performance du logger compte.

2. **Logs HTTP automatiques avec `pino-http` :** Le plugin `pino-http` intercepte chaque requête HTTP et logue automatiquement la méthode, l'URL, le status code, le temps de réponse et l'ID de requête. Pas de boilerplate dans chaque controller.

3. **Format JSON en production :** Les logs JSON produits par Pino sont directement parsables par Promtail (agent de collecte Loki). Loki indexe les labels extraits du JSON (service, level, reqId) — la corrélation des logs avec les métriques Prometheus est facilitée (voir ADR-005).

4. **`pino-pretty` en développement :** En local, les logs JSON bruts sont peu lisibles. `pino-pretty` les formate de façon colorée et humainement lisible, sans impacter le comportement en production.

5. **`nestjs-pino` comme logger NestJS :** Le module `nestjs-pino` remplace le logger par défaut de NestJS (qui utilise `console.log`) par Pino. Tous les `this.logger.log()`, `this.logger.error()` dans les services NestJS produisent automatiquement des logs JSON structurés.

6. **Request ID pour la corrélation :** `pino-http` génère un `reqId` unique par requête, attaché à tous les logs émis pendant cette requête. En cas d'erreur, je peux retrouver tous les logs d'une requête spécifique dans Grafana/Loki en filtrant par `reqId`.

---

## Conséquences

**Positives :**
- Logs JSON exploitables directement par Loki (via Promtail) sans parsing supplémentaire.
- Impact minimal sur les performances de l'API.
- Corrélation des logs par requête via `reqId`.
- Développement confortable avec `pino-pretty`.

**Négatives / Risques :**
- `nestjs-pino` est un package communautaire (non officiel NestJS) — dépendance au mainteneur.
- Les logs JSON bruts en production nécessitent un outil de visualisation (Grafana/Loki) pour être exploitables — pas de lecture directe dans le terminal en prod.
- La configuration des sérialiseurs (pour masquer les données sensibles comme les mots de passe dans les logs) est manuelle.
