# RACI & Gouvernance — Plateforme de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (« PhotoApp »)
**Auteur :** Tony Mascate
**Date :** Juin 2026
**Version :** 1.0

> Ce document définit **qui fait quoi** sur chaque livrable (matrice **RACI**) et
> **où / quand se prennent les décisions** (**gouvernance**). Le projet étant mené
> en solo dans un cadre de certification, les rôles et les instances du modèle
> professionnel sont **transposés** à ce contexte.

---

## 1. Matrice RACI

### 1.1 Rôles

| Rôle                           | Tenu par                           | Périmètre                                    |
| ------------------------------ | ---------------------------------- | -------------------------------------------- |
| **Porteur — Chef de projet**   | Tony Mascate (casquette pilotage)  | Cadrage, planning, arbitrages, priorisation  |
| **Porteur — Dev / Architecte** | Tony Mascate (casquette technique) | Réalisation : code, infra, choix techniques  |
| **Formateur / Mentor**         | La Plateforme                      | Conseil, relecture, validation pédagogique   |
| **Jury de certification**      | 3W Academy / RNCP 40573            | Validation finale, décision de certification |
| **Testeurs**                   | Entourage                          | Retours d'usage informels                    |

> Les deux premières colonnes représentent **la même personne ayant deux rôles au sein du projet**. La séparation est volontaire : elle matérialise le fait que les
> décisions de _pilotage_  sont prises dans une posture
> différente de la _réalisation_.

### 1.2 Matrice

| Livrable                                 |  CP   | Dev / Archi | Formateur | Jury  | Testeurs |
| ---------------------------------------- | :---: | :---------: | :-------: | :---: | :------: |
| Étude d'opportunité                      | **R** |      C      |   **A**   |   –   |    –     |
| Note de cadrage                          | **R** |      C      |   **A**   |   –   |    –     |
| User stories                             |   C   |    **R**    |   **A**   |   –   |    –     |
| Modélisation des données (MCD/MLD/MPD)   |   C   |    **R**    |   **A**   |   –   |    –     |
| Maquettes & architecture des pages       |   C   |    **R**    |   **A**   |   –   |    –     |
| ADR / choix techniques                   | **A** |    **R**    |     C     |   –   |    –     |
| Analyse de risques (EBIOS)               |   C   |    **R**    |   **A**   |   –   |    –     |
| Planning (WBS / Gantt)                   | **R** |      C      |   **A**   |   –   |    –     |
| Développement fonctionnalités cœur       | **A** |    **R**    |     C     |   –   |    C     |
| Killer feature (Exploration Chromatique) | **A** |    **R**    |     C     |   –   |    C     |
| Infrastructure / CI-CD / DevOps          | **A** |    **R**    |     C     |   –   |    –     |
| Tests & qualité                          | **A** |    **R**    |     C     |   –   |    –     |
| Dossier professionnel RNCP               | **R** |      C      |     C     | **A** |    –     |
| Soutenance (COPIL simulé)                | **R** |      C      |     C     | **A** |    –     |

**Légende :** **R** = Réalise · **A** = Approuve (1 seul par ligne) · C = Consulté · I = Informé · – = non concerné

### 1.3 Lecture

- **Le formateur / l'école valide les livrables au fil de l'année** (cadrage, conception, documentation, analyse de risques, planning) : c'est la porte de validation **continue**, celle qui rythme réellement le projet.
- **Le jury n'intervient qu'en fin de parcours** : il n'a aucune visibilité pendant le projet (**–** sur tous les livrables annuels) et n'apparaît que sur ce qu'il évalue effectivement — le **dossier professionnel** et la **soutenance**.
- Les **livrables techniques** (code, infra, killer feature, tests) sont _réalisés_ par la casquette Dev et _approuvés_ par la casquette CP : c'est un **auto-arbitrage** assumé, encadré par deux garde-fous — la relecture formateur (C) et le **contrôle qualité automatisé** (cf. §2.3).

---

## 2. Gouvernance

### 2.1 Principe

En conditions professionnelles, un projet est piloté par des **instances de
réunion** (COPIL, comité projet, daily, sprint review). En solo, ces instances
n'ont pas lieu telles quelles : elles sont **transposées** en points de
validation, en rituels d'auto-organisation et en contrôles automatisés.

### 2.2 Instances transposées

| Instance (modèle pro)                    | Transposition dans ce projet                                      | Fréquence réelle           | Objet                     |
| ---------------------------------------- | ----------------------------------------------------------------- | -------------------------- | ------------------------- |
| **COPIL** (décisions stratégiques)       | Points de validation avec le **formateur / l'école** aux **jalons J1→J7** | À chaque fin de phase      | Go / No-Go de phase       |
| **Comité projet** (suivi avancement)     | Auto-revue de fin de phase + retours formateur                    | Hebdomadaire / fin de lot  | Suivi & réajustement      |
| **Daily stand-up** (synchro)             | Auto-organisation : backlog **Trello** + commits réguliers        | Au fil de l'eau            | Suivi des tâches          |
| **Sprint review** (validation livrables) | Jalons fonctionnels (MVP, killer feature) testés avec l'entourage | Fin de lot                 | Recette informelle        |
| **Soutenance**                           | **COPIL simulé** : le jury joue le rôle du « directeur »          | Une fois, en fin de projet | Décision de certification |

### 2.3 Outils de gouvernance

À défaut d'une équipe, la rigueur est portée par l'outillage :

- **Trello** — backlog / kanban : visualisation des tâches et de leur avancement (vaut le « daily »).
- **Git + Pull Requests** — chaque évolution passe par une branche et une PR : trace des décisions et auto-revue structurée avant merge sur `main`.
- **Quality gate SonarQube (CI)** — bloque toute PR ne respectant pas le seuil de qualité : joue le rôle d'un **pair / relecteur automatisé**, contrepoids objectif à l'auto-arbitrage.
- **Jalons J1→J7** ([note-de-cadrage.md](note-de-cadrage.md) §8) — points de décision formels, équivalents des Go/No-Go d'un COPIL.

### 2.4 En soutenance

Le cours est explicite : **le jury = le directeur, la soutenance = le COPIL**.
Le discours doit être adapté en conséquence — vocabulaire métier, valeur produit,
conformité, sans jargon technique superflu — pour transformer la soutenance en
véritable instance de décision.

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
