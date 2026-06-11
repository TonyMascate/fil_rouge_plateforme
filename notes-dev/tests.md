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

---

## 11. Phase 3 — Tests E2E Supertest (`apps/api/test/app.e2e-spec.ts`)

Les tests E2E démarrent un vrai module NestJS (sans BDD) et envoient des requêtes HTTP réelles
via `supertest`. Ils vérifient le routage, la validation des DTOs, et les cookies.

### Configuration E2E (`test/jest-e2e.json`)

Fichier de config séparé pour les E2E. Même override ts-jest que les tests unitaires
(`module: commonjs`, `moduleResolution: node`, `resolvePackageJsonExports: false`), mais avec
`moduleNameMapper` pointant vers `<rootDir>/../src/` puisque le rootDir est `test/`.

```bash
bun run test:e2e   # lance uniquement les tests E2E
```

### Problème résolu : `APP_GUARD` + `useValue` → `metatype is not a constructor`

**Symptôme** : `Test.createTestingModule(...).compile()` échoue avec `TypeError: metatype is not
a constructor` dès qu'on ajoute `{ provide: APP_GUARD, useValue: ... }` dans les providers.

**Cause** : En NestJS v11, le token `APP_GUARD` est traité spécialement par le scanner de modules.
Même avec `useValue`, NestJS accède à `wrapper.metatype` (le constructeur de la classe) qui est
`undefined` pour un provider `useValue`. Cela provoque l'erreur lors de l'instanciation.

**Solution** : Ne pas enregistrer de `APP_GUARD` dans le module de test. Puisque `CsrfGuard` est
déjà couvert par `csrf.guard.spec.ts`, on peut simplement ne pas l'activer en E2E. Les requêtes
passent sans contrôle CSRF.

**À ne PAS faire** (dans le module E2E) :
```ts
// ❌ Crash : metatype is not a constructor
{ provide: APP_GUARD, useClass: CsrfGuard }   // useClass
{ provide: APP_GUARD, useValue: { canActivate: () => true } } // useValue aussi !
```

### Gardes remplacées par `overrideGuard().useValue()`

`useClass` dans `overrideGuard` peut aussi causer des problèmes de métadonnées TypeScript.
On utilise `useValue` avec des objets implémentant `CanActivate` :

```ts
// ✅ Correct
const e2eJwtGuard = {
  canActivate(context: ExecutionContext): boolean {
    const token = context.switchToHttp().getRequest<any>().cookies?.['access_token'];
    if (!token) throw new UnauthorizedException();
    const payload = jwtService.verify<any>(token); // le vrai JwtService injecté
    context.switchToHttp().getRequest<any>().user = { userId: payload.sub, ... };
    return true;
  },
};

const e2eRolesGuard = {
  canActivate(context: ExecutionContext): boolean {
    const required: string[] = Reflect.getMetadata('roles', context.getHandler());
    if (!required) return true;
    const user = context.switchToHttp().getRequest<any>().user;
    if (!required.includes(user?.role)) throw new UnauthorizedException();
    return true;
  },
};

// Dans le module :
.overrideGuard(JwtAuthGuard).useValue(e2eJwtGuard)
.overrideGuard(RolesGuard).useValue(e2eRolesGuard)
```

### Structure du module E2E

```ts
const moduleFixture = await Test.createTestingModule({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
  ],
  controllers: [AppController, AuthController, UsersController],
  providers: [
    AppService,
    { provide: AuthService, useValue: mockAuthService },
    { provide: UsersService, useValue: mockUsersService },
    // Pas de APP_GUARD !
  ],
})
  .overrideGuard(JwtAuthGuard).useValue(e2eJwtGuard)
  .overrideGuard(RolesGuard).useValue(e2eRolesGuard)
  .compile();

jwtService = moduleFixture.get<JwtService>(JwtService);

app = moduleFixture.createNestApplication();
app.use(cookieParser());
app.useGlobalPipes(new ZodValidationPipe());
await app.init();
```

### Codes HTTP NestJS par défaut

NestJS retourne **201** pour toutes les méthodes `@Post()` sans `@HttpCode()` explicite.
Ne pas confondre avec les contrôleurs Express classiques où POST → 200.

| Méthode        | Code par défaut |
|----------------|-----------------|
| `@Get()`       | 200             |
| `@Post()`      | 201             |
| `@Put()`       | 200             |
| `@Patch()`     | 200             |
| `@Delete()`    | 200             |

### Cas testés (14 tests, `app.e2e-spec.ts`)

| Route | Cas | Statut attendu |
|-------|-----|----------------|
| `GET /` | bienvenue | 200 |
| `POST /auth/register` | body valide | 201 + cookies |
| `POST /auth/register` | sans email | 400 (Zod) |
| `POST /auth/register` | password trop court | 400 (Zod) |
| `POST /auth/login` | credentials valides | 201 + cookies |
| `POST /auth/login` | credentials invalides (mock null) | 401 |
| `POST /auth/login` | email malformé | 400 (Zod) |
| `POST /auth/logout` | - | 201 + cookies effacés |
| `POST /auth/refresh` | sans cookie | 401 |
| `POST /auth/refresh` | avec cookie | 201 |
| `GET /users/profile` | sans JWT | 401 |
| `GET /users/profile` | JWT valide | 200 + profil |
| `GET /users/admin-only` | sans JWT | 401 |
| `GET /users/admin-only` | JWT user (≠ admin) | 401 (RolesGuard) |

**Note sur le schéma Zod** : `UserLoginSchema` hérite de `UserSchema` et valide le password
(min 8 chars, au moins 1 chiffre, au moins 1 majuscule). Le test "credentials invalides" doit
utiliser un password valide côté Zod (`Password123!`) et contrôler le résultat via le mock.

---

## 12. Intégration CI/CD (`.github/workflows/api.yml`)

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - working-directory: apps/api
      run: bun run test:cov   # ← échoue si < 80% sur un métrique
    - working-directory: apps/api
      run: bun run test:e2e   # ← 14 tests E2E Supertest
build-push:
  needs: test  # ← le build Docker ne se lance que si les tests passent
```

---

## 13. Phase 4 — Tests Vitest pour `apps/web` (Next.js 19 / React 19)

### Stack et installation

```bash
bun add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8
```

| Package | Version | Rôle |
|---------|---------|------|
| `vitest` | 4.x | Runner de tests |
| `@vitejs/plugin-react` | 6.x | Transforme JSX/TSX en JS |
| `@testing-library/react` | 16.x | API de rendu React (React 19 compatible) |
| `@testing-library/user-event` | 14.x | Simulation d'interactions utilisateur |
| `@testing-library/jest-dom` | 6.x | Matchers supplémentaires (toBeInTheDocument, etc.) |
| `jsdom` | 29.x | Implémente le DOM/BOM dans Node.js |
| `@vitest/coverage-v8` | 4.x | Rapport de couverture via V8 |

### Configuration : `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['components/**', 'lib/**', 'app/**'],
      exclude: ['**/*.spec.*', 'lib/auth.ts', ...],
    },
  },
});
```

**Pourquoi `fileURLToPath(new URL('.', import.meta.url))` ?**
Le chemin doit être un path absolu Windows/Mac-compatible. `import.meta.url` donne l'URL du
fichier config, `new URL('.')` en extrait le dossier, `fileURLToPath` convertit en chemin natif.
Cela reproduit l'alias `"@/*": ["./*"]` du `tsconfig.json` de Next.js.

### Mocks globaux : `vitest.setup.ts`

Les composants Next.js utilisent `next/navigation`, `next/image`, `next/link` — qui requièrent
un contexte Next.js absent en test. On les mocke globalement :

```ts
import '@testing-library/jest-dom'; // matchers supplémentaires sur expect()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), ... }),
  usePathname: () => '/',
}));

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, ...props }) {
    return React.createElement('img', { src, alt, ...props });
  },
}));
```

**Note sur les mocks de composants JSX** : le fichier setup a l'extension `.ts` (pas `.tsx`).
Pour éviter d'y mettre du JSX, on utilise `React.createElement` directement.

### Hoisting de `vi.mock` et `vi.hoisted()`

```ts
// ❌ ERREUR — mockPost est déclaré après le hoist de vi.mock
const mockPost = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { post: mockPost } }));

// ✅ CORRECT — vi.hoisted() s'exécute AVANT les imports
const mockPost = vi.hoisted(() => vi.fn());
vi.mock('@/lib/axios', () => ({ default: { post: mockPost } }));
```

`vi.mock()` est hissé (hoisted) au sommet du fichier par Vitest, AVANT les `import`.
Les variables `const` déclarées après les imports ne sont donc pas encore initialisées.
`vi.hoisted(() => ...)` garantit que la factory s'exécute au moment du hoist.

C'est différent de Jest où les variables nommées `mock*` sont accessibles dans les factories
grâce à un mécanisme spécifique à Jest (non compatible avec Vitest).

### Wrapper QueryClientProvider pour les tests de composants

Les composants qui utilisent `useMutation` ou `useQuery` (via TanStack Query) doivent être
encapsulés dans un `QueryClientProvider`. Pattern recommandé :

```tsx
function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
```

`retry: false` évite des retries automatiques qui ralentiraient les tests.

### Tests écrits (18 tests, 3 fichiers)

**`lib/utils.spec.ts`** — 5 tests pour la fonction `cn()` (fusion de classes Tailwind) :
fusion simple, valeurs falsy ignorées, résolution de conflits Tailwind (`px-3 + px-5 → px-5`),
conditions via objet, chaîne vide sans arguments.

**`components/ui/button.spec.tsx`** — 7 tests :
texte visible, onClick appelé, disabled bloque le click, data-variant, data-size, render via
`asChild` (Slot → `<a>` au lieu de `<button>`).

**`app/(public)/login/page.spec.tsx`** — 6 tests :
champs email/password présents, lien inscription, erreur Zod email invalide, erreur Zod
password trop court, état "Connexion..." pendant mutation en cours, toggle afficher/masquer
le mot de passe (aria-label + type d'input).

### CI/CD (`.github/workflows/web.yml`)

Un job `test` a été ajouté avant `build-push` :
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - working-directory: apps/web
      run: bun run test   # vitest run — échoue si un test fail
build-push:
  needs: test
```

---

## 14. Phase 5 — Tests E2E Playwright (`apps/web`)

### Stack et installation

```bash
bun add -D @playwright/test
bunx playwright install chromium  # binaires navigateur
```

| Package | Version | Rôle |
|---------|---------|------|
| `@playwright/test` | 1.60.0 | Framework E2E navigateur (Chromium) |

### Configuration : `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';
import { E2E_JWT_SECRET, API_URL } from './e2e/helpers/constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // réutilise le dev server local, démarre frais en CI
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
      NEXT_PUBLIC_CLOUDFRONT_DOMAIN: 'https://test.cloudfront.net',
      JWT_ACCESS_SECRET: E2E_JWT_SECRET, // utilisé en CI uniquement (serveur frais)
    },
  },
});
```

**`reuseExistingServer: !process.env.CI`** — en local, réutilise le dev server déjà en cours
pour éviter le conflit de `.next/dev/lock` (Next.js 15 : deux instances ne peuvent pas partager
le même répertoire `.next`). En CI, démarre toujours un serveur frais avec nos env vars de test.

### Secret JWT et tests authentifiés (`e2e/helpers/`)

```ts
// e2e/helpers/constants.ts
export const E2E_JWT_SECRET = 'playwright-e2e-secret-at-least-32-chars-ok';
export const API_URL = 'http://localhost:3001';

// e2e/helpers/auth.ts
export async function loginAs(context: BrowserContext, role = 'USER') {
  const token = await new SignJWT({ sub: 'test-user-1', role, email: '...', ... })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(E2E_JWT_SECRET));
  await context.addCookies([{ name: 'access_token', value: token, domain: 'localhost', ... }]);
}
```

**`context.addCookies()`** injecte un cookie httpOnly dans le contexte Playwright. Quand le
navigateur navigue vers une page protégée, il envoie le cookie et le serveur Next.js le vérifie
avec `jwtVerify`. Pour que la vérification réussisse, le serveur doit utiliser le même secret —
c'est garanti en CI (`webServer.env.JWT_ACCESS_SECRET = E2E_JWT_SECRET`).

En local avec dev server réutilisé (secret différent), les tests qui dépendent du JWT utilisent
**`test.skip(!process.env.CI, ...)`**. Pour les exécuter localement : arrêtez le dev server avant.

### Mocking de l'API avec `page.route()`

Les tests mockent l'API (`http://localhost:3001/**`) via `page.route()` pour éviter un vrai
backend. Playwright intercepte les appels XHR/fetch côté client avant qu'ils partent sur le réseau.

```ts
// Mock spécifique pour un endpoint
await page.route(`${API_URL}/auth/login`, async route => {
  await loginAs(context); // set cookie avant la navigation post-login
  await route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
});

// Catch-all pour les appels secondaires (ex: données de la galerie)
await page.route(`${API_URL}/**`, route =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0}' }),
);
```

**Ordre d'enregistrement** : Playwright applique la route la plus récemment enregistrée en premier.
Enregistrez les catch-all avant les spécifiques, ou gérez tout dans un seul handler.

**Nuance axios + 401** : L'intercepteur axios ne déclenche PAS de refresh sur `/auth/login` (condition
`!url.includes('/auth/login')` dans l'intercepteur). Un 401 sur login arrive directement dans
`onError` de `useFormMutation` → toast "Email ou mot de passe incorrect." sans retry. Testable sans
mock `/auth/refresh`.

### Tests écrits (14 tests, 3 fichiers — 13 passent, 1 skip local)

**`e2e/login.spec.ts`** — 6 tests :
- Page accessible, champs présents, lien inscription
- Erreur Zod : email invalide, mot de passe trop court
- Toast "Email ou mot de passe incorrect." sur 401 (API mockée)
- *(CI only)* Redirect /galerie après login success + cookie JWT injecté

**`e2e/register.spec.ts`** — 5 tests :
- Page accessible, tous les champs présents
- Erreur "Les mots de passe ne correspondent pas" (Zod refine)
- Redirect /login après inscription réussie (API mockée, délai 2s côté page)
- Toast "Un compte existe déjà avec cet email." sur 409 (API mockée)

**`e2e/protected-routes.spec.ts`** — 3 tests :
- `/galerie` sans auth → redirect `/login`
- `/albums` sans auth → redirect `/login`
- `/explore` sans auth → redirect `/login`

### Sélecteurs — problèmes rencontrés

`getByLabel('Mot de passe')` résolvait en 2 éléments : l'input (`id="password"`) ET le bouton
toggle (`aria-label="Afficher le mot de passe"`). Playwright fait un match partiel insensible à
la casse, donc "Afficher le mot de **passe**" ≠ "Mot de passe" normalement — mais avec
normalisation des accents et matching partiel, les deux matchent.

**Fix** : `getByLabel('Mot de passe', { exact: true })`.

Même problème avec `getByLabel('Nom')` qui matchait aussi l'input "Prénom" car "pré**nom**" →
"pre**nom**" contient "nom" après déaccentation. Fix : `{ exact: true }`.

### CI/CD (`.github/workflows/web.yml`)

```yaml
playwright:
  needs: test          # après les tests Vitest
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - working-directory: apps/web
      run: bunx playwright install --with-deps chromium
    - working-directory: apps/web
      run: bun run test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: apps/web/playwright-report/
        retention-days: 7

build-push:
  needs: [test, playwright]
```

---

## 15. Phase 6 — Tests d'intégration repositories (testcontainers PostgreSQL)

### Pourquoi testcontainers pour les repositories ?

Les 3 repositories ont du SQL que les mocks ne peuvent pas valider :
- `getCoversS3KeysForAlbums` : window function `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` + `ANY($1)`
- `storageUsedByUser` : `COALESCE(SUM(...), 0)` — vérifie que le résultat est parsé en entier et non `"0"` string
- `getMembersForAlbums` : INNER JOIN avec aliases raw (`"albumId"`, `"firstName"`, `"lastName"`)

Un mock qui retourne `{ total: '0' }` ne teste pas que le SQL tourne réellement sur Postgres.

### Stack et installation

```bash
bun add -D testcontainers @testcontainers/postgresql
```

| Package | Version | Rôle |
|---------|---------|------|
| `testcontainers` | 12.x | Démarre des conteneurs Docker depuis Node.js |
| `@testcontainers/postgresql` | 12.x | Container PostgreSQL pré-configuré |

### Architecture des tests

```
apps/api/test/
├── jest-e2e.json            (Supertest — existant)
├── jest-integration.json    (nouveau)
└── integration/
    ├── db.helper.ts              (setupIntegrationDatabase, teardownIntegrationDatabase, clearTables)
    ├── photo.repository.spec.ts  (4 tests)
    ├── album-photo.repository.spec.ts  (7 tests)
    └── album-member.repository.spec.ts (3 tests)
```

Les fichiers `*.spec.ts` sont en dehors de `src/` → invisibles pour le runner Jest unitaire
(`rootDir: "src"` dans `package.json`).

### `jest-integration.json`

```json
{
  "rootDir": ".",               // = apps/api/test/
  "testRegex": "test/integration/.*\\.spec\\.ts$",
  "testTimeout": 120000,        // startup container + tests
  "transform": { ... ts-jest commonjs ... },
  "moduleNameMapper": {
    "^@app/(.*)$": "<rootDir>/../src/$1",
    "^@repo/shared$": "<rootDir>/../../../packages/shared/src/index.ts"
  }
}
```

**Piège clé** : `rootDir` dans un fichier `test/jest-*.json` pointe vers `test/`, pas vers `apps/api`.
Donc `<rootDir>/../src` = `apps/api/src`, et `<rootDir>/../../../packages/shared` = `packages/shared`.

### `test/integration/db.helper.ts`

```ts
let container: StartedPostgreSqlContainer;
let dataSource: DataSource;

export async function setupIntegrationDatabase(): Promise<DataSource> {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  dataSource = new DataSource({
    type: 'postgres',
    host: container.getHost(),
    port: container.getMappedPort(5432),
    // ... username/password/database depuis container
    entities: [User, Photo, Album, AlbumPhoto, AlbumMember, RefreshToken],
    synchronize: true,   // crée tables + ENUMs automatiquement
    logging: false,
  });
  await dataSource.initialize();
  return dataSource;
}

export async function clearTables(): Promise<void> {
  await dataSource.query('TRUNCATE TABLE users CASCADE');
  // users CASCADE → albums → album_photos, album_members, photos, refresh_token
}
```

**`synchronize: true`** : TypeORM crée automatiquement toutes les tables ET les types ENUM PostgreSQL
(`photo_status_enum`, etc.) au démarrage du container. Aucune migration à lancer manuellement.

**`TRUNCATE TABLE users CASCADE`** : les clés étrangères avec `onDelete: 'CASCADE'` permettent de
nettoyer toutes les tables en une seule instruction depuis la table racine.

**`beforeAll` avec timeout explicite** : la startup du container prend 10-30 secondes.

```ts
beforeAll(async () => {
  dataSource = await setupIntegrationDatabase();
  // ...
}, 120_000); // override du timeout Jest pour ce beforeAll
```

### Cas testés — 14 tests

**`photo.repository.spec.ts`** (4 tests) :
- `storageUsedByUser` : sans photo → 0
- `storageUsedByUser` : somme uniquement COMPLETED (PENDING/FAILED exclus)
- `storageUsedByUser` : n'inclut pas les photos d'un autre utilisateur
- `storageUsedByUser` : COALESCE retourne 0 si fileSizeBytes null

**`album-photo.repository.spec.ts`** (7 tests) :
- `getCoversS3KeysForAlbums` : Map vide si albumIds vide
- `getCoversS3KeysForAlbums` : max 4 clés (window function ROW_NUMBER)
- `getCoversS3KeysForAlbums` : exclut PENDING/FAILED
- `getCoversS3KeysForAlbums` : plusieurs albums via ANY($1)
- `getCoversS3KeysForAlbums` : ordre par added_at DESC (INSERT SQL explicite pour contrôler la date)
- `countByAlbumIds` : Map vide si albumIds vide
- `countByAlbumIds` : comptes corrects par album (COUNT + GROUP BY)

**`album-member.repository.spec.ts`** (3 tests) :
- `getMembersForAlbums` : liste vide si albumIds vide
- `getMembersForAlbums` : INNER JOIN retourne les données utilisateur (email, firstName, lastName)
- `getMembersForAlbums` : plusieurs albums en un appel

**Astuce pour contrôler `added_at`** (champ `@CreateDateColumn()` auto-généré) :

```ts
await dataSource.query(
  `INSERT INTO album_photos (album_id, photo_id, added_at) VALUES ($1, $2, $3)`,
  [albumId, photoId, new Date('2024-01-02T10:00:00Z')],
);
```
Le raw SQL contourne le `@CreateDateColumn()` pour injecter une date précise → permet de tester
l'ordre `ORDER BY ap.added_at DESC`.

### Script et CI

```json
// apps/api/package.json
"test:integration": "jest --config ./test/jest-integration.json --runInBand"
```

`--runInBand` : exécute les suites de manière séquentielle (un seul conteneur PostgreSQL partagé
entre les 3 fichiers de test). Évite les problèmes de concurrence sur le port Docker.

```yaml
# .github/workflows/api.yml
test-integration:
  needs: test              # après les tests unitaires
  runs-on: ubuntu-latest   # Docker disponible par défaut sur GitHub Actions
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - working-directory: apps/api
      run: bun run test:integration

build-push:
  needs: [test, test-integration]
```

**Durée CI estimée** : ~30-45s (pull image postgres:16-alpine + startup + 14 tests).
