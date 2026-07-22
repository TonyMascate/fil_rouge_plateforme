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

Simule des utilisateurs qui se connectent et naviguent. Nécessite un **compte de
test existant** (idéalement avec quelques photos, pour que la navigation renvoie
des données) et un **throttler desserré** sur l'environnement cible.

```powershell
k6 run -e BASE_URL=https://staging.fil-rouge-plateforme.com `
       -e LOAD_USER_EMAIL=compte-test@example.com `
       -e LOAD_USER_PASSWORD='MotDePasse123' `
       load-tests/parcours-lecture.js
```

Chaque VU se connecte **une seule fois** (comme un vrai utilisateur), puis
enchaîne des cycles de navigation avec un temps de réflexion de 1 à 3 s.

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

L'API applique un rate-limiting (`@nestjs/throttler` : 100 req/60 s par IP).
Depuis **une seule machine**, k6 récolte donc vite des `429`. Ces réponses :

- **ne sont pas** comptées comme des échecs (`http_req_failed` reste bas) ;
- sont suivies à part via le compteur **`rate_limited`** affiché dans le résumé k6.

Les graphes Grafana bougent quand même (le serveur traite chaque connexion, même
pour renvoyer un 429). Mais pour un **vrai stress métier** — saturer réellement
l'API et non son garde-fou — il faut soit :

- desserrer/désactiver temporairement le throttler sur l'environnement cible,
- soit distribuer la charge depuis plusieurs IP (k6 Cloud / plusieurs machines).
