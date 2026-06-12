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

1. **RBAC statique via décorateur `@Roles()` + `RolesGuard` :** Les rôles de l'application (`USER`, `ADMIN`) sont définis dans l'enum `Role` du package partagé (`@repo/shared`). Le décorateur `@Roles(Role.ADMIN)` est posé sur les routes réservées aux admins. Le `RolesGuard` extrait le rôle du payload JWT et vérifie la correspondance. Pas de table de permissions en base de données.

2. **Ownership-based Access Control dans les services :** Pour les ressources (photos, albums), la vérification d'appartenance (`resource.userId === requestUser.id`) est effectuée dans les méthodes de service via des helpers privés (`assertOwner()`, `assertAccess()`). Ce n'est pas dans des guards NestJS dédiés mais directement dans la couche service, ce qui garantit que la logique métier et la sécurité restent co-localisées.

3. **Accès partagé aux albums par email :** Le partage d'album avec un autre utilisateur de la plateforme est implémenté via la table `AlbumMember`. Le propriétaire invite par email (`POST /albums/:id/members`). Le membre invité voit l'album en lecture (pas de modification possible).

4. **Partage public de photo par token :** Le partage public d'une photo génère un token aléatoire (`randomBytes(16).toString('base64url')`) stocké sur l'entité `Photo`. L'accès via `/p/[token]` ne nécessite pas d'authentification — mécanisme orthogonal au RBAC/OAC.

---

## Conséquences

**Positives :**
- Logique d'autorisation simple, sans requête DB supplémentaire pour les rôles.
- Ownership vérifié systématiquement dans les services — aucune ressource ne peut être accédée sans vérification explicite.
- Extensible : ajouter un rôle = modifier l'enum `Role` et poser le décorateur sur les routes concernées.

**Négatives / Risques :**
- Ajouter un nouveau rôle nécessite un redéploiement (pas de gestion dynamique) — acceptable pour ce projet.
- La vérification d'ownership dans les services (et non dans des guards) implique que chaque méthode de service doit l'appeler explicitement — risque d'oubli si de nouvelles routes sont ajoutées sans rigueur.
