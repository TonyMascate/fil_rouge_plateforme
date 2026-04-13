# ADR-011 — État & Data Fetching : React Query + Axios

- **Statut :** Accepté
- **Date :** 2025-03-13
- **Décideur :** Tony Mascate

---

## Contexte

Mon frontend Next.js utilise React Server Components (RSC) pour les pages initiales, mais nécessite aussi des interactions dynamiques côté client : mise à jour d'album, upload de photo, invalidation de cache après mutation. Je dois choisir une stratégie de gestion de l'état serveur et du data fetching pour les Client Components.

---

## Options considérées

### Gestion de l'état serveur (data fetching)

| Critère                        | TanStack React Query          | SWR (Vercel)                  | Apollo Client                 | Vanilla useEffect + fetch     |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Gestion du cache               | Avancée (stale-while-revalidate, invalidation) | Basique (revalidation) | Avancée (cache normalisé) | Manuelle                      |
| Mutations + invalidation       | `useMutation` + `invalidateQueries` | `mutate()` basique      | `useMutation` + refetch      | Manuelle                      |
| Retry automatique              | Oui (configurable)            | Oui                           | Oui                           | Non                           |
| Devtools                       | Excellents                    | Limités                       | Apollo Studio                 | Non                           |
| Taille du bundle               | ~12 KB                        | ~4 KB                         | ~35 KB                        | 0                             |
| Adapté à une API REST          | Oui (conçu pour REST)         | Oui                           | Conçu pour GraphQL            | Oui                           |

### Client HTTP

| Critère                        | Axios                         | fetch natif                   | ky                            |
|--------------------------------|-------------------------------|-------------------------------|-------------------------------|
| Intercepteurs                  | Oui (request/response)        | Non natif (wrapper manuel)    | Via hooks                     |
| Gestion automatique JSON       | Oui                           | Manuel (`.json()`)            | Oui                           |
| Gestion des erreurs HTTP       | Automatique (throw sur 4xx/5xx)| Manuel                       | Automatique                   |
| Annulation de requête          | Via AbortController           | Via AbortController           | Via AbortController           |
| Compatibilité navigateur       | Excellente                    | Excellente (moderne)          | Bonne                         |

---

## Décision

**J'utilise TanStack React Query v5 pour la gestion de l'état serveur et Axios comme client HTTP, uniquement dans les Client Components.**

---

## Justification

1. **Séparation claire RSC / Client Components :** Les React Server Components fetchent directement les données côté serveur (pas de React Query nécessaire). React Query est utilisé uniquement dans les Client Components qui nécessitent de l'interactivité (upload, mise à jour en temps réel, mutations).

2. **Cache intelligent avec React Query :** React Query maintient un cache des réponses avec une stratégie stale-while-revalidate. Naviguer entre les pages ne refetch pas inutilement les données déjà fraîches — les galeries photos s'affichent instantanément depuis le cache.

3. **`useMutation` + invalidation :** Après une mutation (ex : supprimer une photo), `invalidateQueries` force le refetch uniquement des queries concernées. Pas de gestion manuelle de l'état.

4. **Axios pour les intercepteurs :** J'utilise un intercepteur Axios pour attacher automatiquement les cookies d'authentification et gérer le renouvellement du token (refresh token flow). Un seul endroit dans le code gère la logique d'auth — pas de duplication dans chaque `fetch`.

5. **Gestion d'erreurs cohérente :** Axios throw automatiquement sur les réponses 4xx/5xx. Combiné avec les `onError` callbacks de React Query, les erreurs API sont traitées de façon centralisée.

6. **DevTools React Query :** En développement, les DevTools TanStack Query permettent de visualiser le cache, inspecter les queries et tester l'invalidation — gain de productivité non négligeable.

---

## Conséquences

**Positives :**
- Cache automatique des requêtes côté client, sans boilerplate.
- Invalidation précise après mutation — UI toujours synchronisée avec le serveur.
- Logique d'authentification centralisée dans l'intercepteur Axios.
- DevTools pour déboguer le cache en développement.

**Négatives / Risques :**
- React Query est un overhead pour les pages en RSC pur — mais son usage est limité aux composants réellement interactifs.
- Deux systèmes de fetching coexistent (RSC fetch natif + React Query) — nécessite une convention claire sur quand utiliser l'un ou l'autre.
- La gestion du token refresh dans l'intercepteur Axios nécessite attention pour éviter les boucles infinies (refresh qui échoue → retry → refresh…).
