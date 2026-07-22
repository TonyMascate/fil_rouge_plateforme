# Budget estimatif — Plateforme de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (« Kroma »)
**Auteur :** Tony Mascate
**Date :** Juin 2026
**Version :** 1.0

> Ce budget valorise le projet **comme s'il était mené en conditions
> professionnelles** (équipe staffée, prestation facturée), afin de donner un
> ordre de grandeur réaliste à un sponsor. En pratique, le projet est réalisé
> **en solo dans un cadre de certification** : le coût réellement décaissé se
> limite à l'infrastructure (cf. §3). Toutes les hypothèses sont explicitées.

---

## 1. Hypothèses de chiffrage

| Hypothèse                                          | Valeur retenue                                          | Justification                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Taux journalier moyen (TJM) développeur full-stack | 550 €/jour                                              | Fourchette intermédiaire marché français                                                       |
| Charge projet totale (toutes phases)               | ~74 jours·homme                                         | Détaillée lot par lot dans le [WBS](wbs-planning.md) §2, dont ~48 j de développement technique |
| Durée projet                                       | ~5 à 6 mois (cadence certification)                     | Voir macro-planning ([note-de-cadrage.md](note-de-cadrage.md) §8)                              |
| Équipe de référence (valorisation pro)             | 1 dev + appoint design/tests                            | Le projet réel est mené par 1 personne polyvalente                                             |
| Hébergement                                        | 1 VPS EU + stockage objet S3 région Paris (`eu-west-3`) | Contrainte RGPD (cf. [note-de-cadrage.md](note-de-cadrage.md) §6)                              |

---

## 2. Budget global (valorisation conditions professionnelles)

| Poste                                       | Estimation       | Détail / hypothèse                                                                                                                    |
| ------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Développement technique** (~48 j × 550 €) | 24 – 29 K€       | Infra/CI-CD, auth & sécurité, fonctionnalités cœur, killer feature, pages, observabilité — **tests unitaires & d'intégration inclus** |
| **Conception & documentation** (~21 j)      | 10 – 13 K€       | Cadrage, personas, user stories, modélisation, maquettes, ADR, dossier RNCP                                                           |
| **Recette & qualité** (~5 j)                | 2,5 – 3,5 K€     | Recette manuelle bout-en-bout, tests E2E, reprise d'anomalies (tests unitaires/intégration déjà dans le développement)                |
| **Infrastructure & hébergement (1 an)**     | < 1 K€           | VPS EU + stockage objet + CDN                                                                                                         |
| **Licences / outils**                       | 0 K€             | Stack 100 % open-source                                                                                                               |
| **Sous-total**                              | **37 – 46 K€**   | ≈ 74 j·h × 550 €/j                                                                                                                    |
| **Contingence (15 %)**                      | 5,5 – 7 K€       | Aléas techniques, dérive de périmètre                                                                                                 |
| **TOTAL estimé**                            | **≈ 43 – 53 K€** | Ordre de grandeur conditions professionnelles                                                                                         |

---

## 3. Coût réellement décaissé (cadre certification, solo)

Le travail étant fourni par le porteur dans un cadre de formation, le coût monétaire effectif se limite au VPS et à un appoint de stockage/CDN :

| Poste                                        | Coût annuel réel        | Commentaire                                                                     |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| VPS EU (métadonnées, comptes, app)           | ~50 €/an                | Serveur unique, Docker Swarm                                                    |
| Stockage objet S3 (`eu-west-3`) + CloudFront | qq € à qq dizaines €/an | Faible volume ; varie selon les photos stockées/servies                         |
| Nom de domaine + TLS                         | ~15 €/an                | TLS via Caddy (Let's Encrypt, gratuit)                                          |
| Outillage (CI, monitoring, licences)         | 0 €                     | Stack 100 % open-source ; GitHub Actions, Prometheus/Grafana/Loki auto-hébergés |
| **TOTAL décaissé**                           | **≈ 65 – 100 €/an**     | Coût réel hors valorisation du temps de dev                                     |

---

## 4. Synthèse

- **Valorisation professionnelle** du projet : **≈ 43 – 53 K€** (référence pour un sponsor).
- **Coût réel décaissé** en cadre certification : **≈ 65 – 100 €/an**, soit essentiellement le **VPS (~50 €/an)** plus un appoint S3/CloudFront.
- Le seul vrai investissement est le **temps de développement** ; aucun frais d'outillage ni de licence (stack 100 % open-source), et une infra mutualisée sur un VPS unique qui minimise les coûts récurrents.

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
