import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Test de charge — parcours utilisateur authentifié (lecture).
//
// Simule de vrais utilisateurs qui naviguent : galerie, exploration
// chromatique, clic sur une couleur, albums, quota. Contrairement à un GET /
// qui ne fait que du réseau, ce parcours stresse la DB (requêtes paginées +
// agrégat couleurs), la vérif JWT et la sérialisation.
//
// La connexion a lieu UNE SEULE FOIS dans setup(), et les cookies obtenus sont
// distribués à tous les VUs. Raison : /auth/login est plafonné à 5 req/60s par
// IP (@Throttle dans auth.controller.ts, protection anti-bruteforce). Avec un
// login par VU, 93 % des tentatives repartaient en 429 et le test ne mesurait
// plus que le throttler. Ce plafond n'a donc pas à être desserré pour le test :
// c'est le scénario qui devait s'adapter, pas la protection.
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

// 429 = throttler. Ne devrait plus rien compter maintenant que le login est
// mutualisé : si ce compteur remonte, c'est qu'un plafond s'applique aussi aux
// routes de navigation.
const rateLimited = new Counter('rate_limited');

export const options = {
  // Par défaut k6 tue setup() au bout de 60 s. Or setup() peut attendre jusqu'à
  // 3 fenêtres de throttler de 60 s avant d'abandonner : sans cette marge, le
  // retry ne servirait à rien.
  setupTimeout: '210s',

  // Montée progressive ; paliers ≥ 1 min car Prometheus scrape toutes les 15s.
  // À ajuster selon la taille de la machine cible (staging = plus modeste).
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // Indispensable : les 429 étant exclus de http_req_failed, un run dont
    // aucune requête n'aboutit affichait quand même des seuils au vert. Le taux
    // de checks est le seul signal fiable que le parcours s'est bien déroulé.
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
};

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

// ── Connexion unique, partagée par tous les VUs ─────────────────────────────
export function setup() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'POST /auth/login' } },
    );

    // NestJS renvoie 201 Created par défaut sur un @Post() sans @HttpCode : la
    // route /auth/login répond donc 201, pas 200 (le @ApiResponse({ status: 200 })
    // du contrôleur n'est que de la documentation Swagger).
    if (res.status === 200 || res.status === 201) {
      // Ne PAS renvoyer `res.cookies` tel quel : les données de setup() sont
      // sérialisées en JSON avant d'être copiées vers les VUs, et les objets
      // cookie enveloppés par k6 n'y survivent pas (le champ `value` se perd).
      // Chaque VU posait alors des cookies vides → 401 sur tout le parcours.
      // On extrait donc des chaînes brutes, seules garanties transportables.
      const cookies = {};
      for (const [name, entries] of Object.entries(res.cookies)) {
        cookies[name] = entries[0].value;
      }

      if (!cookies.access_token) {
        throw new Error('Login OK mais cookie access_token absent — test interrompu.');
      }

      return { cookies };
    }

    if (res.status === 429) {
      // Fenêtre du throttler = 60 s : retenter plus tôt ne sert à rien. Ce cas
      // se produit surtout quand on relance le script juste après un run.
      console.warn(`Login throttlé (429) — nouvelle tentative dans 60 s (${attempt}/3)`);
      sleep(60);
      continue;
    }

    throw new Error(`Login impossible (HTTP ${res.status}) — test interrompu.`);
  }

  throw new Error('Login toujours throttlé après 3 tentatives — test interrompu.');
}

// À réinjecter à CHAQUE itération : k6 vide le cookie jar du VU entre deux
// itérations (comportement par défaut, cf. l'option noCookiesReset). Semer une
// seule fois à la première itération donnait un parcours OK puis des 401 sur
// tous les suivants — c'était déjà la cause des 401 de la version précédente,
// qui les masquait derrière un re-login et saturait le throttler.
function seedJar(cookies) {
  const jar = http.cookieJar();
  for (const [name, value] of Object.entries(cookies)) {
    // Un cookie vide ici produirait une avalanche silencieuse de 401 pendant
    // six minutes. Mieux vaut échouer tout de suite, en nommant le coupable.
    if (!value) {
      throw new Error(`Cookie « ${name} » vide après transfert depuis setup().`);
    }
    jar.set(BASE_URL, name, value);
  }
}

// Comptabilise les 429 et journalise les autres statuts inattendus. Sans cette
// trace, le résumé k6 affiche « ✗ » sans jamais dire pourquoi : impossible d'y
// distinguer une session invalide (401) d'une saturation serveur (5xx).
function track(res, label) {
  if (res.status === 429) {
    rateLimited.add(1);
  } else if (res.status !== 200) {
    console.error(`${label} → HTTP ${res.status}`);
  }
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

export default function (data) {
  seedJar(data.cookies);

  browse();

  // Temps de réflexion réaliste entre deux pages (1 à 3 s).
  sleep(1 + Math.random() * 2);
}
