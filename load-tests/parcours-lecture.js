import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Test de charge — parcours utilisateur authentifié (lecture).
//
// Simule de vrais utilisateurs qui se connectent puis naviguent : galerie,
// exploration chromatique, clic sur une couleur, albums, quota. Contrairement
// à un GET / qui ne fait que du réseau, ce parcours stresse la DB (requêtes
// paginées + agrégat couleurs), la vérif JWT et la sérialisation.
//
// PRÉREQUIS : le throttler de l'API doit être desserré sur l'environnement
// cible, sinon la navigation tape le mur de 429 (100 req/60s par IP).
//
// Lancement (staging/VPS) :
//   k6 run -e BASE_URL=https://api.fil-rouge-plateforme.com \
//          -e LOAD_USER_EMAIL=compte-test@example.com \
//          -e LOAD_USER_PASSWORD='MotDePasse123' \
//          load-tests/parcours-lecture.js
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.LOAD_USER_EMAIL;
const PASSWORD = __ENV.LOAD_USER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  throw new Error(
    'Identifiants requis. Exemple : k6 run -e LOAD_USER_EMAIL=... -e LOAD_USER_PASSWORD=... load-tests/parcours-lecture.js',
  );
}

// 429 = throttler (attendu sous charge depuis une seule IP) : suivi à part,
// pas compté comme un échec de transport.
const rateLimited = new Counter('rate_limited');

export const options = {
  // Montée progressive ; paliers ≥ 1 min car Prometheus scrape toutes les 15s.
  // À ajuster selon la taille de la machine cible (staging = plus modeste).
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Indispensable : les 429 étant exclus de http_req_failed, un run où AUCUN
    // login n'aboutit affichait quand même des seuils au vert. Le taux de checks
    // est le seul signal fiable que le parcours s'est réellement déroulé.
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

// État par VU (chaque VU a son propre runtime k6, donc sa propre copie).
// On se connecte une seule fois par VU : les cookies (access_token, refresh_token,
// XSRF-TOKEN) sont ensuite stockés et renvoyés automatiquement par le cookie jar
// du VU sur chaque requête suivante. Un utilisateur réel ne se relogue pas à
// chaque page.
let authenticated = false;

function login() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/login' } },
  );
  if (res.status === 429) rateLimited.add(1);
  // NestJS renvoie 201 Created par défaut sur un @Post() sans @HttpCode : la
  // route /auth/login répond donc 201, pas 200 (le @ApiResponse({ status: 200 })
  // du contrôleur n'est que de la documentation Swagger).
  return check(res, {
    'login → 200/201': (response) => response.status === 200 || response.status === 201,
  });
}

// Comptabilise 429 et détecte une session expirée (401 → re-login au prochain tour).
function track(res, label) {
  if (res.status === 429) rateLimited.add(1);
  if (res.status === 401) authenticated = false;
  check(res, { [`${label} → 200`]: (response) => response.status === 200 });
}

// Sur l'atlas renvoyé, choisit une cellule peuplée au hasard (parcours réaliste :
// un utilisateur clique sur une couleur qui contient des photos). Repli sur une
// cellule quelconque si le compte est vide.
function pickCell(atlas) {
  if (!Array.isArray(atlas) || atlas.length === 0) return null;
  const populated = atlas.filter((cell) => cell.count > 0);
  const pool = populated.length > 0 ? populated : atlas;
  const cell = pool[Math.floor(Math.random() * pool.length)];
  return cell && cell.cellId ? cell.cellId : null;
}

function browse() {
  group('galerie', () => {
    track(http.get(`${BASE_URL}/photos?page=1&limit=20`, { tags: { name: 'GET /photos' } }), 'GET /photos');
  });

  sleep(1);

  let atlas = null;
  group('exploration couleur', () => {
    const res = http.get(`${BASE_URL}/photos/colors`, { tags: { name: 'GET /photos/colors' } });
    track(res, 'GET /photos/colors');
    if (res.status === 200) {
      atlas = res.json();
    }
  });

  const cellId = pickCell(atlas);
  if (cellId) {
    group('photos d’une couleur', () => {
      track(
        http.get(`${BASE_URL}/photos/colors/${cellId}?page=1&limit=20`, {
          tags: { name: 'GET /photos/colors/:cellId' },
        }),
        'GET /photos/colors/:cellId',
      );
    });
  }

  sleep(1);

  group('albums', () => {
    track(http.get(`${BASE_URL}/albums`, { tags: { name: 'GET /albums' } }), 'GET /albums');
  });

  group('quota', () => {
    track(http.get(`${BASE_URL}/photos/quota`, { tags: { name: 'GET /photos/quota' } }), 'GET /photos/quota');
  });
}

export default function () {
  if (!authenticated) {
    authenticated = login();
    if (!authenticated) {
      // Login refusé — le plus souvent un 429, /auth/login étant plafonné à
      // 5/60s par IP. On patiente avant de retenter, au lieu de marteler le
      // throttler à chaque itération (ce qui ne produit que du bruit).
      sleep(5 + Math.random() * 5);
      return;
    }
  }

  browse();

  // Temps de réflexion réaliste entre deux pages (1 à 3 s).
  sleep(1 + Math.random() * 2);
}
