import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Test de charge du VPS de production, pensé pour observer les dashboards
// Grafana réagir en temps réel (CPU, réseau, event-loop lag, requêtes actives).
//
// Lancement :
//   k6 run load-tests/charge-prod.js
//   k6 run -e BASE_URL=http://localhost:3001 load-tests/charge-prod.js   (local)
//
// Pendant le run, ouvre Grafana → dashboard « API — Métriques » et regarde
// monter : Réseau, CPU, Event Loop Lag, Handles & Requests actifs.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'https://api.fil-rouge-plateforme.com';

// Compteur dédié aux 429 : le throttler de l'API (100 req/60s par IP) en
// renvoie forcément sous forte charge depuis une seule machine. Ce ne sont pas
// des « pannes » du serveur — on les suit à part plutôt que de les mélanger à
// http_req_failed.
const rateLimited = new Counter('rate_limited');

export const options = {
  // Montée progressive : le scrape Prometheus est à 15s, donc des paliers
  // d'au moins 1 min laissent le temps aux courbes Grafana de se dessiner.
  stages: [
    { duration: '1m', target: 50 }, // échauffement
    { duration: '2m', target: 150 }, // charge croissante
    { duration: '2m', target: 300 }, // pic de charge
    { duration: '1m', target: 0 }, // retour au calme
  ],
  thresholds: {
    // 429 exclus du taux d'échec (voir setResponseCallback plus bas).
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

// On considère les 429 (throttler) comme des réponses attendues : elles ne
// doivent pas gonfler http_req_failed, qui ne reflète alors que les vraies
// erreurs (5xx, timeouts, connexions perdues).
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

export default function () {
  const res = http.get(`${BASE_URL}/`, { tags: { name: 'GET /' } });

  if (res.status === 429) {
    rateLimited.add(1);
  }

  check(res, {
    'statut 200': (response) => response.status === 200,
    'throttlé (429)': (response) => response.status === 429,
  });

  sleep(1);
}
