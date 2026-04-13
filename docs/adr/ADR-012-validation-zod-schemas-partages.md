# ADR-012 — Validation API : Zod + Schémas partagés

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon API NestJS doit valider les données entrantes (body, params, query) pour garantir leur conformité avant de les traiter. Mon frontend Next.js doit aussi valider les données des formulaires côté client. Je veux éviter de dupliquer les règles de validation front/back et garantir une cohérence des contrats d'API dans tout le projet.

---

## Options considérées

### Librairie de validation

| Critère                        | Zod (nestjs-zod)              | class-validator (NestJS natif)| Joi                           | Valibot                       |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| TypeScript-first               | Oui (inférence de types)      | Partiel (décorateurs)         | Non (types manuels)           | Oui                           |
| Partage front/back             | Oui (schéma = code TS)        | Non (décorateurs NestJS only) | Partiellement                 | Oui                           |
| Inférence de types             | Excellente (`z.infer<>`)      | Via `class-transformer`       | Non                           | Excellente                    |
| Intégration NestJS             | Via `nestjs-zod`              | Native (`ValidationPipe`)     | Via pipe custom               | Via pipe custom               |
| Taille bundle                  | ~14 KB                        | ~11 KB                        | ~25 KB                        | ~8 KB (modulaire)             |
| Écosystème                     | Très riche (react-hook-form, tRPC…) | Moyen                   | Bon                           | En croissance                 |

---

## Décision

**J'utilise Zod via `nestjs-zod` pour la validation côté API, avec des schémas définis dans `packages/shared` accessibles par le frontend et le backend.**

---

## Justification

1. **Schémas partagés front/back :** Les schémas Zod sont définis une fois dans `packages/shared` et utilisés à la fois dans les pipes de validation NestJS et dans les formulaires React (via `react-hook-form` + `@hookform/resolvers/zod`). Un seul endroit pour modifier une règle de validation — pas de désynchronisation possible.

2. **Inférence de types automatique :** `z.infer<typeof MySchema>` génère le type TypeScript correspondant au schéma. Pas besoin de maintenir une interface séparée du schéma de validation — le type EST la validation.

3. **`nestjs-zod` pour l'intégration NestJS :** Le module `nestjs-zod` fournit un `ZodValidationPipe` global et des décorateurs pour utiliser les schémas Zod directement dans les DTOs NestJS. Compatible avec le système d'injection de dépendances et les guards de NestJS.

4. **Messages d'erreur explicites :** Zod génère des messages d'erreur structurés avec le chemin du champ et la raison de l'échec. Côté API, ces erreurs sont renvoyées au client avec un format standardisé. Côté frontend, `react-hook-form` les affiche directement sous les champs du formulaire.

5. **Richesse de l'écosystème Zod :** `z.string().email()`, `z.string().uuid()`, `z.number().min()`, refinements customs, transformations — toutes les règles du projet sont expressibles avec Zod sans configuration additionnelle.

6. **Contrats d'API explicites :** Les schémas dans `@repo/shared` servent de documentation vivante des contrats d'API. Un développeur lisant `CreatePhotoSchema` comprend immédiatement quels champs sont attendus, leurs types et leurs contraintes.

---

## Conséquences

**Positives :**
- Validation cohérente front/back depuis une source unique.
- Types TypeScript inférés automatiquement depuis les schémas.
- Moins de risque de régression : modifier un champ obligatoire en base = erreur TypeScript côté frontend.
- Messages d'erreur standardisés pour l'API.

**Négatives / Risques :**
- `nestjs-zod` est un package communautaire (pas officiel NestJS) — mises à jour dépendantes de son mainteneur.
- Les schémas Zod complexes (avec `.transform()`, `.refine()`) peuvent être difficiles à déboguer.
- Ajouter Zod à `packages/shared` augmente légèrement la taille du bundle frontend (même si tree-shakeable).
