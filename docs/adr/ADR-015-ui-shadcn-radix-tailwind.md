# ADR-015 — UI Components : shadcn/ui + Radix UI + Tailwind CSS v4

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon frontend Next.js nécessite une bibliothèque de composants UI pour construire rapidement une interface cohérente, accessible et maintenable. Je dois choisir un système de composants adapté à React 19 / App Router et une approche de styling qui s'intègre bien dans un projet TypeScript monorepo.

---

## Options considérées

### Bibliothèque de composants

| Critère                        | shadcn/ui + Radix UI          | MUI (Material UI)             | Mantine                       | Chakra UI                     |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Approche                       | Copy-paste (code dans le projet) | Package npm (boîte noire) | Package npm                   | Package npm                   |
| Personnalisation               | Totale (code source accessible)| Limitée (theming)            | Bonne (theming)               | Bonne (theming)               |
| Accessibilité                  | Excellente (via Radix UI)     | Bonne                         | Bonne                         | Bonne                         |
| Taille bundle                  | Uniquement les composants utilisés | Large (tout importé)     | Moyenne                       | Moyenne                       |
| Compatibilité React 19 / RSC   | Excellente                    | Partielle (v6 en cours)       | Bonne                         | Partielle                     |
| Style                          | Tailwind CSS                  | CSS-in-JS (Emotion)           | CSS Modules / Emotion         | CSS-in-JS                     |

### Approche styling

| Critère                        | Tailwind CSS v4               | CSS Modules                   | CSS-in-JS (styled-components) | SASS/SCSS                     |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Cohérence avec shadcn/ui       | Native                        | Non                           | Non                           | Non                           |
| Colocalisé avec le composant   | Oui (classes inline)          | Oui (fichier .module.css)     | Oui                           | Non                           |
| Compatible RSC                 | Oui                           | Oui                           | Non (runtime JS)              | Oui                           |
| Purge CSS automatique          | Oui                           | N/A                           | N/A                           | Non                           |
| Design tokens                  | Via fichier config CSS (v4)   | Variables CSS manuelles       | Via ThemeProvider             | Variables SCSS                |

---

## Décision

**J'utilise shadcn/ui comme système de composants, basé sur Radix UI pour l'accessibilité, avec Tailwind CSS v4 pour le styling.**

---

## Justification

1. **shadcn/ui : code dans le projet, pas une dépendance :** Les composants shadcn/ui sont copiés dans le projet (`/apps/web/components/ui/`), pas installés comme package npm. Je possède le code source de chaque composant — je peux le modifier librement sans fork de bibliothèque.

2. **Radix UI pour l'accessibilité :** shadcn/ui est construit sur Radix UI, une bibliothèque de composants headless (sans style) qui implémente correctement les patterns ARIA (dialog, dropdown, tabs, etc.). L'accessibilité est gérée au niveau de la bibliothèque primitive — je n'ai pas à gérer manuellement les attributs ARIA, le focus management et le keyboard navigation.

3. **Tailwind CSS v4 :** La v4 de Tailwind abandonne le fichier `tailwind.config.js` au profit d'une configuration CSS native (`@theme`). Plus rapide (moteur Rust), plus simple à configurer, et compatible avec les CSS custom properties. Cohérent avec la directive de modernité du projet.

4. **Tree-shaking optimal :** Tailwind purge automatiquement les classes CSS non utilisées. Les composants shadcn/ui copiés ne contiennent que ce que j'utilise. Bundle CSS final minimal.

5. **Compatibilité React 19 et RSC :** Tailwind est du CSS pur — aucun conflit avec les Server Components. shadcn/ui identifie clairement les composants qui nécessitent `"use client"` (interactivité) vs ceux utilisables côté serveur.

6. **CVA (class-variance-authority) pour les variantes :** Les composants utilisent CVA pour gérer les variantes stylistiques (ex : `Button` variant `primary`/`secondary`/`destructive`). C'est une approche type-safe — TypeScript connaît les variantes valides.

7. **Design system évolutif :** Les tokens de design (couleurs, espacements, rayons) sont définis via CSS custom properties dans le fichier CSS global. Changer le thème global ne nécessite de modifier qu'un seul fichier.

---

## Conséquences

**Positives :**
- Composants accessibles par défaut (Radix UI).
- Personnalisation totale sans friction (code owned).
- CSS minimal en production grâce au purge Tailwind.
- Cohérence visuelle via les design tokens CSS.

**Négatives / Risques :**
- Le modèle copy-paste de shadcn/ui signifie que les mises à jour ne sont pas automatiques — les correctifs de shadcn/ui doivent être appliqués manuellement.
- Tailwind v4 est récent — certains plugins et intégrations tierces peuvent ne pas encore le supporter.
- La prolifération de classes Tailwind dans le JSX peut rendre le code moins lisible si pas de convention d'organisation (ex : `cn()` helper pour conditionner les classes).
