# ADR-007 — Autorisation : RBAC statique + Ownership-based Access Control

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon application de gestion de photos nécessite deux niveaux de contrôle d'accès distincts :
1. **Qui peut faire quoi** selon son rôle (ex : un admin peut supprimer n'importe quelle photo, un utilisateur standard non).
2. **Qui peut accéder à quoi** selon la propriété de la ressource (ex : un utilisateur ne peut voir que ses propres albums, sauf partage explicite).

Je dois choisir une architecture d'autorisation claire, testable et évolutive.

---

## Options considérées

### Modèle de contrôle d'accès basé sur les rôles

| Critère                        | RBAC statique (mapping en code) | RBAC dynamique (DB)           | ABAC (attributs)              |
|--------------------------------|---------------------------------|-------------------------------|-------------------------------|
| Complexité d'implémentation    | Faible                          | Moyenne                       | Élevée                        |
| Flexibilité                    | Limitée (changements = redeploy)| Haute (modifiable en runtime) | Très haute                    |
| Performance                    | Excellente (pas de DB)          | Requête DB à chaque check     | Variable                      |
| Lisibilité du code             | Haute (permissions visibles)    | Moyenne                       | Faible                        |
| Adapté à ce projet             | Oui (rôles stables)             | Surengineering                | Surengineering                |

### Contrôle d'accès sur les ressources

| Critère                        | Ownership-based (propriétaire) | ACL par ressource              | Partage public via token       |
|--------------------------------|--------------------------------|--------------------------------|--------------------------------|
| Complexité                     | Faible                         | Élevée (table d'ACL dédiée)    | Faible (UUID aléatoire)        |
| Adapté aux photos/albums       | Oui                            | Overkill                       | Oui pour le partage public     |
| Combinable avec RBAC           | Oui                            | Oui                            | Oui                            |

---

## Décision

**J'utilise une combinaison de RBAC statique (mapping de rôles vers permissions en code) et d'Ownership-based Access Control (OAC) pour les ressources, avec un système de partage public par token UUID.**

---

## Justification

1. **RBAC statique via mapping en code :** Les rôles de l'application (`USER`, `ADMIN`) sont stables et peu nombreux. Un mapping statique `ROLE_PERMISSIONS` dans le package partagé (`@repo/shared`) suffit. Cela évite une table de permissions en base de données pour des rôles qui ne changent pas entre déploiements.

2. **Permissions déclarées dans le code partagé :** Le mapping de permissions est défini dans `packages/shared`, accessible à la fois par le backend (guards NestJS) et le frontend (affichage conditionnel des boutons/actions). Un seul endroit de vérité, pas de désynchronisation.

3. **Guards NestJS par décorateur :** Chaque route déclare ses permissions via des décorateurs (`@RequirePermission('photo:delete')`). Le `PermissionGuard` vérifie automatiquement le rôle du JWT. Pas de logique d'autorisation dans les services.

4. **Ownership-based Access Control :** Pour les ressources (photos, albums), un check d'appartenance complémentaire vérifie que `resource.userId === requestUser.id`. Les admins peuvent bypasser ce check. Cette logique est centralisée dans des guards réutilisables, pas dans chaque controller.

5. **Partage public par token UUID :** Le partage d'album/photo public génère un UUID aléatoire (non devinable). L'accès via ce token ne nécessite pas d'authentification — c'est un mécanisme orthogonal au système RBAC/OAC.

6. **Synchronisation front/back :** Le frontend utilise le même mapping de permissions pour décider d'afficher ou masquer des actions. Si un utilisateur tente quand même l'action, le backend la bloque. Double protection sans duplication de logique.

---

## Conséquences

**Positives :**
- Logique d'autorisation centralisée, lisible, testable.
- Pas de requête DB supplémentaire pour vérifier les permissions.
- Cohérence frontend/backend via le package partagé.
- Extensible : ajouter un rôle `MODERATOR` = modifier le mapping et les guards.

**Négatives / Risques :**
- Ajouter un nouveau rôle nécessite un redéploiement (pas de gestion dynamique) — acceptable pour ce projet.
- Pas de granularité fine par ressource (ex : "partager un album avec un utilisateur spécifique") — hors scope du projet actuel.
