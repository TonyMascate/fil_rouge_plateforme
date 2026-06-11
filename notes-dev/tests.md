# Tests — Guide complet

## 1. Comment Jest fonctionne

Jest est un framework de test JavaScript/TypeScript. Il :
1. Trouve tous les fichiers qui matchent `testRegex` (ici `*.spec.ts`)
2. Les compile via `ts-jest` (TypeScript → JS à la volée)
3. Exécute chaque fichier dans un worker isolé
4. Collecte les résultats et le rapport de couverture

Commandes utiles :
```bash
bun run test          # lance les tests sans couverture (rapide)
bun run test:cov      # lance les tests ET génère le rapport de couverture
bun run test:watch    # mode watch (relance à chaque sauvegarde)
```

---

## 2. Configuration Jest (`apps/api/package.json`)

```json
"jest": {
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", {
      "tsconfig": {
        "module": "commonjs",
        "moduleResolution": "node",
        "resolvePackageJsonExports": false
      }
    }]
  },
  "moduleNameMapper": { "^@app/(.*)$": "<rootDir>/$1" },
  "collectCoverageFrom": ["**/*.(t|j)s", "!**/*.module.ts", ...],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node",
  "coverageThreshold": {
    "global": { "lines": 80, "functions": 80, "branches": 80, "statements": 80 }
  }
}
```

**Pourquoi l'override tsconfig dans ts-jest ?**
Le `tsconfig.json` principal utilise `"moduleResolution": "nodenext"` (requis par NestJS). Mais Jest
tourne en CommonJS et ne comprend pas `nodenext`. On force donc `module: commonjs` et
`moduleResolution: node` uniquement pour la compilation des tests.
`resolvePackageJsonExports: false` évite un conflit avec la résolution des `exports` dans
`package.json` de certaines librairies.

**Pourquoi `moduleNameMapper` ?**
Le code source utilise des alias `@app/...` (ex: `@app/aws/aws.service`). En dehors de Webpack/
tsc-paths, Jest ne les résout pas. Le mapper les traduit en chemins réels depuis `src/`.

**`collectCoverageFrom`** — quels fichiers compter dans la couverture :
- On inclut tout `**/*.(t|j)s` dans `src/`
- On exclut les fichiers sans logique testable : modules NestJS (`.module.ts`), entités TypeORM
  (`.entity.ts`), DTOs, decorators, config, migrations, `main.ts`, et `validation.exception.ts`

**`coverageThreshold`** — le CI bloque si l'un des 4 métriques est < 80% :
- `statements` : % des instructions JS exécutées
- `branches` : % des branches (if/else, `??`, `?.`, ternaires) parcourues
- `functions` : % des fonctions appelées au moins une fois
- `lines` : % des lignes exécutées (proche de statements)

---

## 3. Les métriques de couverture Istanbul

Istanbul est l'outil de couverture intégré à Jest. Résultats Phase 1+2 :

```
All files | 97.73% | 81.88% | 94.25% | 98%
           Stmts     Branch   Funcs    Lines
```

**Branches** est le plus difficile à satisfaire. Chaque `??`, `?.`, `if`, ternaire, `&&`, `||`
crée 2 branches (vrai + faux). Istanbul signale les branches non parcourues par numéro de ligne.

---

## 4. Structure des fichiers de test

Chaque fichier `*.spec.ts` est un **miroir** du fichier source :

```
src/auth/auth.service.ts      ←→   src/auth/auth.service.spec.ts
src/photo/photo.service.ts    ←→   src/photo/photo.service.spec.ts
```

Un spec file suit toujours cette structure :

```ts
// 1. Imports
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceToTest } from './service-to-test.service';

// 2. Mocks des dépendances (définis au niveau module)
const mockDependency = { method: jest.fn() };

// 3. describe principal
describe('ServiceToTest', () => {
  let service: ServiceToTest;

  // 4. Setup avant chaque test
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [ServiceToTest, { provide: Dependency, useValue: mockDependency }],
    }).compile();
    service = module.get<ServiceToTest>(ServiceToTest);
  });

  // 5. Tests groupés par méthode
  describe('methodeName', () => {
    it('fait quelque chose dans le cas nominal', async () => {
      mockDependency.method.mockResolvedValue('résultat');
      const result = await service.methodeName('arg');
      expect(result).toBe('résultat');
    });
  });
});
```

---

## 5. `@nestjs/testing` — comment ça marche

`Test.createTestingModule()` crée un mini-module NestJS en mémoire, sans serveur HTTP ni BDD réelle.
On déclare les providers comme dans un vrai module, mais on remplace les dépendances par des mocks :

```ts
{ provide: JwtService, useValue: mockJwtService }
// ↑ Quand NestJS injecte JwtService, il donne mockJwtService à la place
```

`module.get<T>(Token)` récupère l'instance créée par NestJS (avec les mocks injectés).

Tokens spéciaux :
- `getRepositoryToken(Entity)` → token d'un repository TypeORM
- `getQueueToken('nom-queue')` → token d'une queue BullMQ

---

## 6. `jest.fn()` et les mocks

`jest.fn()` crée une fonction fictive qui :
- Enregistre tous ses appels (`mock.calls`, `mock.results`)
- Peut être programmée pour retourner des valeurs

```ts
const fn = jest.fn();
fn.mockReturnValue('valeur fixe');       // retourne toujours 'valeur fixe'
fn.mockResolvedValue({ data: 'ok' });    // retourne Promise.resolve({ data: 'ok' })
fn.mockRejectedValue(new Error('fail')); // retourne Promise.reject(...)
fn.mockReturnThis();                     // retourne `this` (pour les méthodes chaînées)
fn.mockReturnValueOnce('une seule fois'); // retourne une valeur pour le prochain appel seulement
```

Vérifications :
```ts
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).not.toHaveBeenCalled();
```

`jest.clearAllMocks()` réinitialise les compteurs d'appels sans effacer les implémentations.
`jest.resetAllMocks()` efface aussi les implémentations (`.mockReturnValue()` etc.).

---

## 7. `jest.mock()` — mocker des modules entiers

Pour remplacer un module npm ou local par un fake :

```ts
// Mocker argon2 : toutes ses fonctions deviennent des jest.fn()
jest.mock('argon2');

// Puis dans les tests :
(argon2.verify as jest.Mock).mockResolvedValue(true);
```

```ts
// Mocker le SDK AWS S3 avec une implémentation custom
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  HeadObjectCommand: jest.fn(),
  // ...
}));
```

**Important** : `jest.mock()` est "hoisted" (remonté en haut du fichier avant les imports).
Les variables référencées dans la factory doivent commencer par `mock` pour être disponibles.

---

## 8. Phase 1 — Tests unitaires des services et controllers

### `app.controller.spec.ts`
Teste que `getHello()` retourne `'Hellooo World!'`. Simple smoke test.

### `auth/auth.service.spec.ts`
Teste `AuthService` avec des mocks pour :
- `userRepository`, `refreshTokenRepository` (TypeORM via `getRepositoryToken`)
- `JwtService`, `ConfigService`
- `argon2` (hashage de mots de passe) → `jest.mock('argon2')`

Cas testés :
- `validateUser` : credentials valides, user inconnu, mauvais mot de passe
- `login` : génère access + refresh tokens, hash et sauvegarde le refresh token
- `refreshTokens` : token valide, révoqué, expiré, hash incorrect

### `auth/auth.controller.spec.ts`
Teste les endpoints HTTP. Mock de `AuthService`, `UsersService`, `ConfigService` et de l'objet
`Response` Express (pour les cookies). Cas : register, login valide/invalide, refresh sans cookie,
logout (suppression des 3 cookies).

### `users/users.service.spec.ts`
Mock de `usersRepository` + `argon2`. Cas : `create` (nouvel email, email dupliqué), `getProfile`,
`findAll`.

### `users/users.controller.spec.ts`
Mock de `UsersService`. Cas : `getAdminData`, `getProfile`.

### `aws/aws.service.spec.ts`
Mock complet du SDK AWS (S3Client, signers, lib-storage). Cas : URL signée CloudFront,
`createMultipartUpload` (jpg, png, webp, extension inconnue → `.bin`, erreur UploadId absent),
`headObject`, `deleteObject`, `signPart`, `completeMultipartUpload`, `abortMultipartUpload`,
`listParts` (avec et sans `Parts` dans la réponse).

**Technique pour tester le cas "UploadId absent"** : `S3Client.mockImplementationOnce(...)` change
l'implémentation pour la prochaine instanciation, puis on crée un `freshModule` avec un nouveau
service. Idem pour `listParts` sans `Parts`.

### `photo/photo.service.spec.ts`
Mock de `PhotoRepository` (par classe, pas token TypeORM), queue BullMQ, `AwsService`,
`ConfigService`. Cas : quota, registerUpload (succès, S3 manquant, ContentLength absent),
getStatus (COMPLETED, PENDING, mauvais user, introuvable), deletePhoto, sharePhoto
(nouveau/existant token), unsharePhoto, getPublicByToken, listForUser, listByColors
(vide, k-means normal, retour anticipé avec 2 photos).

### `photo/photo.controller.spec.ts`
Mock de `PhotoService`, `AwsService`, `RedisService`. Teste tous les endpoints : quota, status,
list, color groups, delete, share/unshare, multipart (quota dépassé, succès, rollback S3 sur erreur
de registerUpload, assertUploadOwner refusé).

### `album/album.service.spec.ts`
Mock de tous les repos + `AwsService`. Teste create, findAllForUser (vide, albums propres +
partagés + membres), findOne (owner, membre non-owner, étranger, introuvable), update, remove,
getPhotos, addPhotos (succès, photo déjà présente), removePhoto, getMembers, addMember
(succès, user inconnu, auto-partage interdit, membre existant), removeMember, getPhotoIds.

### `album/album.controller.spec.ts`
Mock de `AlbumService`. Teste les 12 endpoints du controller.

### `auth/guards/csrf.guard.spec.ts`
Teste la garde CSRF : skip avec `@SkipCsrf`, GET/OPTIONS passent toujours, tokens matchants,
cookie absent, tokens différents.

### `auth/guards/roles.guard.spec.ts`
Teste la garde de rôles : aucun rôle requis, user a le rôle, user n'a pas le rôle.

### `photo/public-photo.controller.spec.ts`
Teste que `getPublic()` délègue à `photoService.getPublicByToken()`.

### `common/global-exception.filter.spec.ts`
Teste le filtre d'exception global : `HttpException` formatée, erreur inconnue → 500,
`HttpException` sans body structuré.

---

## 9. Phase 2 — Tests des fichiers précédemment exclus

### `middlewares/csrf.middleware.spec.ts`
Teste le middleware qui **pose** le cookie XSRF-TOKEN (à ne pas confondre avec la garde qui le
**vérifie**). Aucun NestJS TestingModule nécessaire — instanciation directe avec un mock de
`ConfigService`.

Cas :
- Header `XSRF-TOKEN` déjà présent → pas de cookie posé
- Pas de header, mode dev → cookie posé sans `domain`, `secure: false`
- Pas de header, mode prod → cookie posé avec `domain` et `secure: true`

### `auth/strategies/jwt.strategy.spec.ts`
La `JwtStrategy` hérite de `PassportStrategy(Strategy)`. Pour la tester sans Passport réel,
on mock `@nestjs/passport` et `passport-jwt` :

```ts
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: jest.fn(() => class {}), // retourne une classe vide
}));
jest.mock('passport-jwt', () => ({
  ExtractJwt: { fromExtractors: jest.fn().mockReturnValue(() => null) },
  Strategy: jest.fn(),
}));
```

Cas testés : `validate()` avec user trouvé, `validate()` avec user introuvable
→ `UnauthorizedException`.

### `redis/redis.service.spec.ts`
`RedisService` hérite de la classe `Redis` d'ioredis. On mock le module entier :

```ts
const mockDisconnect = jest.fn();
jest.mock('ioredis', () =>
  jest.fn().mockImplementation(function (this: any) {
    this.disconnect = mockDisconnect;
  })
);
```

Les variables commençant par `mock` sont accessibles dans `jest.mock()` malgré le hoisting.
Cas testés : instanciation avec les bons paramètres, `onModuleDestroy()` appelle `disconnect()`.

### `photo/repositories/photo.repository.spec.ts`
`PhotoRepository` étend `Repository<Photo>` de TypeORM. Pour tester sans vraie BDD :
1. On crée l'instance avec un DataSource minimal : `{ createEntityManager: () => {} }`
2. On espionne `createQueryBuilder` avec `jest.spyOn(repo, 'createQueryBuilder')` pour retourner
   un mock query builder

```ts
repo = new PhotoRepository(mockDataSource);
jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
```

`jest.spyOn` crée une propriété propre sur l'instance qui masque la méthode du prototype.
Cas : `storageUsedByUser` retourne la valeur parsée, retourne 0 si result null.

### `album/repositories/album-photo.repository.spec.ts`
Même technique. `getCoversS3KeysForAlbums` utilise `this.manager.query()` (SQL brut), donc
le DataSource mock fournit un `manager.query` mockable. Les méthodes QueryBuilder (`countByAlbumIds`,
`findPhotosPage`) sont espionnées via `createQueryBuilder`. `find` est espionné directement
pour `findPhotoIds`.

Cas : empty input (early return), résultats normaux, vérification du tri ASC/DESC.

### `album/repositories/album-member.repository.spec.ts`
Même technique pour `getMembersForAlbums`. Cas : tableau vide si aucun albumId, membres retournés.

### `photo/photo.processor.spec.ts`
Le processor BullMQ est le plus complexe à mocker car il utilise `sharp` (traitement d'image) et
des streams Node.js.

**Strategy de mock pour sharp :**

```ts
jest.mock('sharp', () => jest.fn()); // sharp devient un jest.fn()
```

Dans `beforeEach`, on utilise `jest.resetAllMocks()` (et non `clearAllMocks`) car le processeur
utilise `mockReturnValueOnce` sur `base.clone()` — les valeurs "once" doivent être reset entre tests.

```ts
// On reconfigure dans chaque beforeEach :
mockBase.clone
  .mockReturnValueOnce(mockColorFork)    // 1er clone → fork couleur
  .mockReturnValueOnce(mockUploadTransform); // 2ème clone → transform upload
(require('sharp') as jest.Mock).mockReturnValue(mockBase);
```

**Streams simulés :**
- `aws.downloadStream()` → retourne `{ pipe: jest.fn() }` (pas besoin d'un vrai Readable)
- `uploadTransform.pipe(passThrough)` → `pipe` est un `jest.fn()`, pas de streaming réel
- `aws.uploadStream()` → retourne `Promise.resolve({})` immédiatement

**`extractDominantColor` (fonction interne) :**
Non exportée, testée indirectement via `process()`. On contrôle les pixels via
`mockColorFork.toBuffer.mockResolvedValue(buffer)` :

| Buffer | Chemin couvert |
|--------|---------------|
| `[255,0,0, 0,255,0, 0,0,255]` | 3 teintes (rouge, vert, bleu) + saturation ≤ 0.5 |
| `[128,128,128]` | Saturation=0 → grayscalePixels → fallback gris |
| `[1,1,1]` | Lightness < 0.08 → ignoré → fallback total sur tous les pixels |
| `[240,150,100]` | Lightness > 0.5 avec saturation → branche saturation formule haute |
| (rejet) | `colorBuf = null` → `dominantColor = null` |
| `[255,0]` | `colorBuf.length < 3` → ignoré → `dominantColor = null` |

Cas `onFailed()` : statut FAILED + deleteObject, et deleteObject qui échoue (absorbed silently).

---

## 10. Résultats finaux Phase 1+2

```
Test Suites: 21 passed, 21 total
Tests:       162 passed, 162 total

All files | 97.73% | 81.88% | 94.25% | 98%
           Stmts     Branch   Funcs    Lines

Seuil CI/CD : 80% sur les 4 métriques ✓
```

Fichiers avec branches résiduelles non couvertes (75-88%) :
- `app.controller.ts` : branche de decorator NestJS (Istanbul artefact)
- `album/album.controller.ts` : idem
- `auth/auth.controller.ts` : condition cookie domain en production
- `photo/photo.controller.ts` : `catch` dans `completeMultipart`
- `redis/redis.service.ts` : constructor `parseInt` (Istanbul artefact)

Ces branches sont des artefacts des décorateurs NestJS ou des cas extrêmes de production. Elles
seront couvertes en Phase 3 (tests E2E Supertest avec un vrai module NestJS chargé).

---

## 11. Intégration CI/CD (`.github/workflows/api.yml`)

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - working-directory: apps/api
      run: bun run test:cov   # ← échoue si < 80% sur un métrique
build-push:
  needs: test  # ← le build Docker ne se lance que si les tests passent
```

Si `coverageThreshold` n'est pas atteint, Jest sort avec un code d'erreur non-zéro → le job
échoue → `build-push` ne se lance pas → pas de déploiement.

---

## 12. Roadmap des phases suivantes

### Phase 3 — Tests E2E Supertest
Tester les endpoints HTTP de bout en bout avec `supertest` et un module NestJS complet
(mais sans vraie BDD). Fichier : `apps/api/test/app.e2e-spec.ts`.

### Phase 4 — Tests unitaires web (Vitest)
Installer Vitest + React Testing Library dans `apps/web`. Tester les composants React,
les hooks, les utils.

### Phase 5 — Tests E2E Playwright
Tests navigateur complets (login, upload, galerie) contre un environnement de preview.

### Phase 6 — Tests d'intégration avec vraie BDD (testcontainers)
Pour les repositories qui ont du SQL PostgreSQL-spécifique (`ANY($1)` etc.), monter un
conteneur PostgreSQL via `@testcontainers/postgresql` dans les tests. Nécessite Docker dans le CI.
