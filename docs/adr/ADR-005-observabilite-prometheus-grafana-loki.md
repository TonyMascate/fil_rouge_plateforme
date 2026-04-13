# ADR-005 — Observabilité : Prometheus + Grafana + Loki

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon application tourne sur Docker Swarm avec plusieurs réplicas de l'API et du frontend. Sans observabilité, je n'ai aucune visibilité sur l'état de santé de mes services : je ne sais pas si un réplica est surchargé, si les temps de réponse se dégradent, ou pourquoi une requête a échoué. La consigne demande explicitement une solution de monitoring.

---

## Options considérées

### Métriques

| Critère                    | Prometheus + Grafana         | Datadog                      | ELK (Elasticsearch + Kibana) |
|----------------------------|------------------------------|------------------------------|------------------------------|
| Coût                       | Gratuit (open source)        | Payant                       | Gratuit mais lourd           |
| Modèle de collecte         | Pull (scrape les métriques)  | Push (agent)                 | Push (agent)                 |
| Intégration Docker/Swarm   | Native (cAdvisor, node-exporter) | Via agent                | Via agent                    |
| Dashboards                 | Grafana (très flexible)      | Intégrés                     | Kibana                       |
| Alerting                   | Alertmanager                 | Intégré                      | Via plugin                   |
| Consommation ressources    | Légère                       | Légère (cloud)               | Lourde (JVM)                 |

### Logs

| Critère                    | Loki + Grafana               | ELK (Elasticsearch + Logstash + Kibana) | Fichiers logs bruts          |
|----------------------------|------------------------------|------------------------------------------|-----------------------------|
| Coût                       | Gratuit (open source)        | Gratuit mais lourd                       | Gratuit                     |
| Indexation                 | Labels uniquement (léger)    | Full-text (lourd)                        | Aucune                      |
| Consommation ressources    | Faible                       | Élevée (JVM, stockage)                   | Aucune                      |
| Recherche dans les logs    | Par labels + grep            | Full-text puissant                       | Manuelle (grep)             |
| Dashboard unifié           | Oui (même Grafana)           | Kibana séparé                            | Non                         |

---

## Décision

**J'utilise Prometheus pour les métriques, Loki pour les logs, et Grafana comme interface de visualisation unifiée.**

---

## Justification

1. **Stack unifiée dans Grafana :** Métriques (Prometheus) et logs (Loki) sont consultables dans la même interface Grafana. Je peux corréler un pic de latence avec les logs d'erreur au même moment, sans changer d'outil.

2. **Léger en ressources :** Contrairement à ELK qui nécessite une JVM et beaucoup de RAM, Prometheus et Loki sont légers. C'est important car mon projet tourne sur une infrastructure limitée.

3. **Modèle pull de Prometheus :** Prometheus vient scraper les métriques exposées par mes services. Pas besoin d'installer un agent dans chaque conteneur — chaque service expose simplement un endpoint `/metrics`.

4. **Loki indexe par labels, pas par contenu :** Loki ne fait pas de full-text search sur les logs (contrairement à Elasticsearch). Il indexe uniquement les labels (nom du service, réplica, niveau de log). C'est beaucoup plus léger en stockage et suffisant pour mon besoin.

5. **Open source et gratuit :** Toute la stack est gratuite, sans limites d'utilisation. Pas de dépendance à un service cloud payant.

6. **Green IT :** La faible consommation de ressources de cette stack par rapport à ELK s'inscrit dans la démarche Green IT demandée par la consigne.

---

## Conséquences

**Positives :**
- Visibilité complète sur l'état de mes services (métriques + logs).
- Interface unique (Grafana) pour tout consulter.
- Faible empreinte mémoire et CPU.
- Possibilité de créer des dashboards personnalisés et des alertes.

**Négatives / Risques :**
- Prometheus ne garde pas les métriques indéfiniment (rétention par défaut de 15 jours) — suffisant pour un projet école.
- Loki ne permet pas de recherche full-text dans les logs — il faut connaître les labels pour filtrer efficacement.