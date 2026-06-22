# User Stories — Plateforme de gestion de photos

**Projet :** Fil Rouge — Plateforme de gestion de photos et albums
**Auteur :** Tony Mascate
**Date :** Avril 2026

**Légende des priorités :**

- 🔴 Must Have — fonctionnalité indispensable, le produit ne fonctionne pas sans
- 🟠 Should Have — fonctionnalité importante, attendue par l'utilisateur
- 🟡 Could Have — fonctionnalité utile, peut être reportée

**Légende des statuts :**

- ✅ Implémenté
- ⚠️ Partiel
- ❌ À implémenter

---

## 1. Authentification & Compte

| #     | User Story                                                                                                                               | Priorité | Statut |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----: |
| US-01 | En tant que **visiteur**, je veux **créer un compte avec mon email et un mot de passe**, afin de **commencer à utiliser la plateforme**. |    🔴    | ✅ |
| US-02 | En tant qu' **utilisateur**, je veux **me connecter avec mon email et mon mot de passe**, afin d'**accéder à mon espace personnel**.     |    🔴    | ✅ |
| US-03 | En tant qu' **utilisateur**, je veux **me déconnecter**, afin de **sécuriser mon accès sur un appareil partagé**.                        |    🔴    | ✅ |
| US-04 | En tant qu' **utilisateur**, je veux **modifier mon mot de passe**, afin de **garder mon compte sécurisé**.                              |    🟠    | ❌ |
| US-05 | En tant qu' **utilisateur**, je veux **supprimer mon compte et toutes mes données**, afin d'**exercer mon droit à l'oubli (RGPD)**.      |    🟠    | ❌ |

---

## 2. Upload & Gestion des photos

| #     | User Story                                                                                                                                              | Priorité | Statut |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----: |
| US-06 | En tant qu' **utilisateur**, je veux **uploader une ou plusieurs photos depuis mon appareil**, afin de **les stocker sur la plateforme**.               |    🔴    | ✅ |
| US-07 | En tant qu' **utilisateur**, je veux **voir toutes mes photos dans une galerie chronologique**, afin d'**avoir une vue d'ensemble de ma bibliothèque**. |    🔴    | ✅ |
| US-08 | En tant qu' **utilisateur**, je veux **supprimer une photo**, afin de **libérer de l'espace et nettoyer ma bibliothèque**.                              |    🔴    | ✅ |
| US-09 | En tant qu' **utilisateur**, je veux **ajouter une photo en favori**, afin de **retrouver rapidement mes meilleures photos**.                           |    🟠    | ❌ |
| US-10 | En tant qu' **utilisateur**, je veux **voir les détails d'une photo** (date, lieu, taille), afin d'**avoir le contexte de la prise de vue**.            |    🟠    | ⚠️ Date et nom disponibles, lieu et taille non implémentés |
| US-11 | En tant qu' **utilisateur**, je veux **ajouter des tags manuels à une photo**, afin de **l'organiser selon mes propres critères**.                      |    🟡    | ❌ |

---

## 3. Albums

| #     | User Story                                                                                                                                        | Priorité | Statut |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----: |
| US-12 | En tant qu' **utilisateur**, je veux **créer un album et lui donner un nom**, afin de **regrouper mes photos par thème ou événement**.            |    🔴    | ✅ |
| US-13 | En tant qu' **utilisateur**, je veux **ajouter des photos à un album**, afin de **construire ma sélection**.                                      |    🔴    | ✅ |
| US-14 | En tant qu' **utilisateur**, je veux **retirer une photo d'un album sans la supprimer**, afin de **affiner ma sélection sans perdre de données**. |    🔴    | ✅ |
| US-15 | En tant qu' **utilisateur**, je veux **voir la liste de tous mes albums**, afin de **naviguer facilement dans mes collections**.                  |    🔴    | ✅ |
| US-16 | En tant qu' **utilisateur**, je veux **renommer ou supprimer un album**, afin de **maintenir ma bibliothèque organisée**.                         |    🟠    | ✅ |
| US-17 | En tant qu' **utilisateur**, je veux **définir une photo de couverture pour mon album**, afin de **le reconnaître visuellement facilement**.      |    🟡    | ❌ |

---

## 4. Partage

| #     | User Story                                                                                                                                                         | Priorité | Statut |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------: | :----: |
| US-18 | En tant qu' **utilisateur**, je veux **partager une photo via un lien public**, afin que **mes proches puissent la consulter sans créer de compte**.               |    🔴    | ✅ |
| US-19 | En tant qu' **utilisateur**, je veux **désactiver le lien de partage d'une photo**, afin de **reprendre le contrôle sur qui peut y accéder**.                      |    🔴    | ✅ |
| US-20 | En tant qu' **utilisateur**, je veux **partager un album avec un utilisateur de la plateforme (par email)**, afin qu'**il puisse consulter mes photos**.            |    🟠    | ✅ |
| US-21 | En tant qu' **utilisateur**, je veux **définir une date d'expiration sur un lien de partage**, afin de **limiter la durée d'accès**.                               |    🟡    | ❌ |

---

## 5. Exploration chromatique

| #     | User Story                                                                                                                                                                                                        | Priorité | Statut |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :----: |
| US-22 | En tant que **photographe**, je veux **accéder à un nuancier qui range automatiquement mes photos par la couleur**, afin de **visualiser d'un coup d'œil la cohérence colorimétrique de mes séries**.             |    🔴    | ✅ |
| US-23 | En tant que **photographe**, je veux **restreindre l'exploration chromatique à un album précis**, afin de **n'analyser que les couleurs d'une série donnée**.                                                     |    🔴    | ✅ |
| US-24 | En tant que **photographe**, je veux **cliquer sur une case du nuancier pour voir les photos de cette teinte**, afin d'**explorer rapidement une couleur particulière**.                                          |    🔴    | ✅ |
| US-25 | En tant que **photographe**, je veux **sélectionner des photos depuis l'exploration et créer un album directement**, afin que **mon travail de tri devienne immédiatement un album partageable**.                 |    🟠    | ❌ |
| US-26 | En tant que **photographe**, je veux **filtrer l'exploration par album ou par période**, afin de **travailler sur un sous-ensemble de mes photos**.                                                               |    🟡    | ❌ |

---

## 6. Recherche & Filtres

| #     | User Story                                                                                                                                             | Priorité | Statut |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | :------: | :----: |
| US-27 | En tant qu' **utilisateur**, je veux **rechercher mes photos par date ou période**, afin de **retrouver rapidement les photos d'un événement précis**. |    🟠    | ❌ |
| US-28 | En tant qu' **utilisateur**, je veux **filtrer mes photos par favori**, afin d'**accéder rapidement à mes meilleures photos**.                         |    🟠    | ❌ |
| US-29 | En tant qu' **utilisateur**, je veux **rechercher mes photos par tag**, afin de **retrouver toutes les photos d'une même catégorie**.                  |    🟡    | ❌ |

---

## Récapitulatif

| Priorité       | Nombre de stories |
| -------------- | :---------------: |
| 🔴 Must Have   |        15         |
| 🟠 Should Have |         9         |
| 🟡 Could Have  |         5         |
| **Total**      |      **29**       |

| Statut | Nombre |
| ------ | :----: |
| ✅ Implémenté | 17 |
| ⚠️ Partiel    |  1 |
| ❌ À implémenter | 11 |

---

_Document rédigé dans le cadre du Fil Rouge — certification Expert en Informatique et Systèmes d'Information, 3W Academy._
