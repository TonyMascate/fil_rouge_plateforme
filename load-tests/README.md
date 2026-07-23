# Tests de charge (k6)

Génère de la charge sur l'API pour **observer les dashboards Grafana réagir** en
temps réel (CPU, réseau, event-loop lag, requêtes actives).

Deux scénarios :

| Fichier | Ce qu'il fait | Ce qu'il stresse |
|---|---|---|
| `charge-prod.js` | GET `/` en boucle, montée jusqu'à 300 VUs | Réseau, connexions, throttler. Test de connectivité/débit superficiel. |
| `parcours-lecture.js` | Login + navigation réaliste (galerie, exploration couleur, albums, quota) | **DB, vérif JWT, sérialisation** — le vrai travail du serveur. |

## Installer k6

k6 est un binaire autonome (ce n'est pas un paquet npm).

```powershell
winget install k6 --source winget
# ou : choco install k6
# ou, sans rien installer : docker run --rm -i grafana/k6 run - < load-tests/charge-prod.js
```

Vérifier : `k6 version`

## Lancer

### Débit brut (GET /)

```powershell
k6 run load-tests/charge-prod.js                              # prod (défaut)
k6 run -e BASE_URL=http://localhost:3001 load-tests/charge-prod.js  # local
```

Monte jusqu'à 300 VUs sur ~6 min (paliers ≥ 1 min car Prometheus scrape à 15 s).

### Parcours utilisateur authentifié (recommandé)

Simule des utilisateurs qui naviguent. Nécessite un **compte de test existant**
(idéalement avec quelques photos, pour que la navigation renvoie des données).

```powershell
k6 run -e BASE_URL=https://staging.fil-rouge-plateforme.com `
       -e LOAD_USER_EMAIL=compte-test@example.com `
       -e LOAD_USER_PASSWORD='MotDePasse123' `
       load-tests/parcours-lecture.js
```

La connexion a lieu **une seule fois pour tout le run**, dans `setup()` : les
cookies obtenus sont ensuite injectés dans le cookie jar de chaque VU, qui
enchaîne des cycles de navigation avec un temps de réflexion de 1 à 3 s.

> **Deux pièges k6 rencontrés sur ce scénario**, tous deux silencieux (401 en
> cascade, sans message) :
>
> 1. Les données renvoyées par `setup()` sont **sérialisées en JSON** avant
>    d'être copiées vers les VUs. Renvoyer `res.cookies` tel quel ne marche pas :
>    les objets cookie enveloppés par k6 perdent leur champ `value`. Il faut en
>    extraire les chaînes brutes.
> 2. k6 **vide le cookie jar entre chaque itération** (option `noCookiesReset`).
>    Les cookies doivent donc être réinjectés à *chaque* itération, pas
>    seulement à la première — sinon le premier parcours passe et tous les
>    suivants tombent en 401.

C'est un contournement délibéré du plafond de `/auth/login` (5 req/60 s par IP,
anti-bruteforce). Avec un login par VU, 93 % des tentatives repartaient en `429`
et le test ne mesurait plus que le throttler. Le scénario s'adapte à la
protection, pas l'inverse — et c'est aussi plus fidèle : on veut mesurer la
navigation, pas l'authentification.

> Tous les VUs utilisent le même compte : l'atlas couleurs étant caché en Redis,
> les requêtes se répètent. Pour un stress DB plus franc, utilise plusieurs
> comptes (lancer plusieurs runs avec des identifiants différents).

## Observer Grafana

Pendant le run, ouvre Grafana → dashboard **« API — Métriques »**. Panels qui
bougent le plus :

- **Réseau — API replicas** — trafic entrant/sortant, réagit immédiatement.
- **CPU — API replicas** — monte avec la charge.
- **Event Loop Lag** — le plus parlant : grimpe quand l'event loop sature.
- **Handles & Requests actifs** — la concurrence devient visible.
- **Mémoire / Heap / GC** — évoluent plus lentement.

## Le throttler fausse-t-il le test ?

Deux plafonds cohabitent (`@nestjs/throttler`) :

| Portée | Limite | Défini dans |
|---|---|---|
| Global (toutes routes) | 100 000 req/60 s | `app.module.ts` |
| `POST /auth/login` | **5 req/60 s** | `auth.controller.ts` |

Le plafond global est assez large pour ne pas gêner un test de charge. Seul
celui du login mord — d'où la connexion mutualisée dans `setup()`.

À savoir : le `ThrottlerModule` est configuré **sans storage Redis**, donc chaque
réplica API compte dans sa propre mémoire. La limite effective est multipliée par
le nombre de réplicas derrière le load balancer.

Les `429` éventuels :

- **ne sont pas** comptés comme des échecs (`http_req_failed` reste bas) ;
- sont suivis à part via le compteur **`rate_limited`** du résumé k6.

Attention à la lecture des percentiles : un `429` répond en ~25 ms et tire la
médiane vers le bas. Si `rate_limited` est élevé, compare avec la ligne
`{ expected_response:true }` du résumé, qui exclut ces réponses — c'est elle qui
donne le vrai temps de réponse.

Pour saturer l'API depuis plusieurs IP (et non depuis une seule machine),
il faut distribuer la charge : k6 Cloud, ou plusieurs machines.
