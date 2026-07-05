# Étude d'opportunité — Plateforme de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums (« Kroma »)
**Auteur :** Tony Mascate
**Date :** Juin 2026
**Version :** 1.0

> Document de décision en amont du cadrage. Il répond à une seule question :
> **faut-il lancer ce projet, et pourquoi ?** Le vocabulaire y est volontairement
> non technique — le lecteur cible est un décideur, pas un développeur.

---

## 1. Contexte : pourquoi ce projet ?

Aujourd'hui, un particulier qui veut stocker et organiser ses photos n'a que deux familles de solutions, et elles s'excluent mutuellement :

- **Les services grand public** (Google Photos, iCloud, Amazon Photos) sont simples à utiliser, mais : les photos sont hébergées hors d'Europe, l'abonnement augmente régulièrement, et les contenus sont exploités par des algorithmes d'analyse.
- **Les solutions « à héberger soi-même »** (Immich, Nextcloud) respectent la vie privée, mais demandent des compétences techniques que le grand public n'a pas.

Personne n'occupe le créneau **« respect de la vie privée + simplicité d'usage »**. Et aucune solution ne propose une **entrée par la couleur** : retrouver ses photos par teinte, indépendamment de la date ou de l'album (cf. [benchmark-concurrentiel.md](benchmark-concurrentiel.md)).

En parallèle, ce projet sert de **fil rouge de certification** (Expert en Informatique et Systèmes d'Information, RNCP 40573, niveau 7) : il doit démontrer la maîtrise du cycle complet — conception, développement, infrastructure, sécurité, exploitation.

---

## 2. Analyse du besoin : que veulent les utilisateurs ?

Deux profils types ont été identifiés (cf. [personas.md](personas.md)) :

| Profil                                      | Besoin exprimé                                      | Frustration actuelle                                                      |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **Léa, 28 ans** — particulier non technique | Retrouver, partager et conserver ses photos privées | Abonnement mensuel qui augmente, données confiées à des géants américains |
| **Maxime, 24 ans** — photographe amateur    | Organiser ses photos par ambiance / couleur         | Aucun outil ne permet de naviguer par teinte, tri manuel chronophage      |

**Besoins prioritaires retenus :**

1. Déposer et consulter ses photos simplement (galerie chronologique).
2. Les organiser en albums et les partager (lien public ou album collaboratif).
3. Les **retrouver par la couleur** — fonctionnalité différenciante absente du marché.
4. Garder ses données privées et hébergées en Europe.

---

## 3. Retour sur investissement (ROI) estimé

### 3.1 Quantitatif

L'objet du projet n'étant pas commercial mais démonstratif et personnel, le « retour » se mesure en valeur produit et en valeur de certification plutôt qu'en chiffre d'affaires :

| Indicateur                                    | Estimation                                                    |
| --------------------------------------------- | ------------------------------------------------------------- |
| Coût récurrent évité pour l'utilisateur final | ~30 à 100 €/an d'abonnement cloud photo supprimé              |
| Coût d'exploitation de la plateforme          | Hébergement maîtrisé (1 VPS EU + stockage objet région Paris) |
| Couverture du référentiel de certification    | Cycle complet + bloc optionnel **DevOps** démontré            |
| Temps de tri manuel évité (photographe)       | Recherche par teinte vs tri album par album                   |

### 3.2 Qualitatif

- **Souveraineté des données** : métadonnées et comptes hébergés exclusivement en Europe, aucune exploitation algorithmique des contenus.
- **Différenciation produit** : l'**Exploration Chromatique** est une fonctionnalité unique sur le marché (cf. [benchmark-concurrentiel.md](benchmark-concurrentiel.md)).
- **Valeur de démonstration** : projet représentatif d'un système réel (CI/CD, observabilité, sécurité), exploitable comme preuve de compétences.
- **Réutilisabilité** : socle technique (auth, upload, infra) transposable à d'autres projets.

---

## 4. Risques stratégiques

| Risque                                                                | Niveau | Commentaire                                                                                   |
| --------------------------------------------------------------------- | :----: | --------------------------------------------------------------------------------------------- |
| **Conformité RGPD** (données photo = données personnelles)            | Élevé  | Hébergement EU obligatoire ; compromis assumé sur les binaires (S3 région Paris) à documenter |
| **Dépendance à un fournisseur cloud** (Cloud Act sur AWS)             | Moyen  | Mitigé par région EU et absence de lien exploitable sans la base de métadonnées               |
| **Développement solo** — un seul porteur                              | Élevé  | Goulot d'étranglement ; impose une priorisation stricte du périmètre                          |
| **Ambition fonctionnelle** vs temps disponible                        | Moyen  | Risque de périmètre trop large ; arbitrage MVP nécessaire                                     |
| **Adoption** — fonctionnalité couleur comprise par les utilisateurs ? | Faible | À valider par retours d'usage informels                                                       |

---

## 5. Recommandation : Go / No-Go

### ✅ Recommandation : **GO**

**Justification :**

1. **Le besoin est réel et non couvert** : aucune solution ne combine respect de la vie privée et simplicité, et aucune n'offre l'entrée par la couleur.
2. **La différenciation est forte** : l'Exploration Chromatique est une fonctionnalité absente de tous les concurrents analysés.
3. **Les risques sont maîtrisables** : les points durs (RGPD, dépendance cloud, solo) ont des mitigations identifiées et un périmètre MVP réaliste.
4. **La valeur de certification est élevée** : le projet couvre l'intégralité du référentiel visé, dont le bloc optionnel DevOps.

**Conditions du Go :**

- Périmètre cadré strictement par priorisation MoSCoW (Must Have d'abord) — voir [user-stories.md](user-stories.md).
- Conformité RGPD traitée dès la conception (hébergement EU, mitigation des binaires documentée).
- Périmètre exclu / reporté explicitement acté dans la [note-de-cadrage.md](note-de-cadrage.md).

> La décision détaillée (périmètre, budget, planning, gouvernance) est formalisée
> dans la [note-de-cadrage.md](note-de-cadrage.md), livrable suivant du projet.

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
