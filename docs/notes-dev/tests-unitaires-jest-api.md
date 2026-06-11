# Note dev — Tests unitaires de l'API avec Jest (Phase 1)

Cette note explique **tout** ce qui a été mis en place pour les tests unitaires de l'API : le fonctionnement de Jest, la configuration, et le détail de chaque fichier de test. Objectif : que tu puisses comprendre, modifier et écrire de nouveaux tests sans rien deviner.

---

## 1. C'est quoi un test unitaire et pourquoi Jest ?

### Le principe

Un **test unitaire** vérifie qu'un bout de code isolé (une fonction, une méthode de service) fait bien ce qu'on attend, **sans dépendre du reste** (pas de vraie base de données, pas de vrai S3, pas de vrai Redis).

L'idée : si `AuthService.validateUser()` reçoit un email qui n'existe pas, il doit retourner `null`. On veut prouver ça en quelques millisecondes, sans démarrer Postgres ni le serveur NestJS complet.

### Jest, c'est quoi exactement ?

Jest est le **lanceur de tests** (test runner) + la **bibliothèque d'assertions** + l'outil de **mocking** + le **calcul de couverture**, le tout dans un seul package. C'est le standard dans l'écosystème NestJS.

Concrètement, Jest fait 4 choses :

1. **Il trouve les fichiers de test** — tous les fichiers qui matchent `*.spec.ts` (configuré via `testRegex`).
2. **Il exécute le code des tests** — les blocs `describe` / `it`.
3. **Il compare le résultat obtenu à l'attendu** — via `expect(...)`.
4. **Il mesure la couverture** — quel pourcentage du code a été exécuté pendant les tests.

### Le vocabulaire de base

```typescript
describe('AuthService', () => {        // groupe de tests (une "suite")
  it('retourne null si...', () => {    // un test individuel ("it" = "il [le service] fait X")
    const result = service.validateUser(...);
    expect(result).toBeNull();         // l'assertion : on AFFIRME que result vaut null
  });
});
```

- `describe(nom, fn)` : regroupe des tests qui vont ensemble (souvent une classe ou une méthode). On peut imbriquer.
- `it(nom, fn)` (alias de `test`) : un cas de test. Le nom décrit le comportement attendu en français.
- `expect(valeur)` : démarre une assertion. On l'enchaîne avec un **matcher**.
- Les **matchers** : `.toBe(x)` (égalité stricte `===`), `.toEqual(x)` (égalité profonde, pour les objets), `.toBeNull()`, `.toBeDefined()`, `.toHaveProperty('clé')`, `.toContain(x)`, `.toHaveBeenCalledWith(...)`, `.rejects.toThrow()` (pour les promesses qui doivent échouer), etc.

### Les hooks de cycle de vie

```typescript
beforeEach(async () => { ... });  // exécuté AVANT chaque "it" → on remet tout à zéro
afterEach(() => { ... });         // exécuté APRÈS chaque "it"
beforeAll / afterAll              // exécuté une seule fois pour toute la suite
```

On utilise `beforeEach` pour **reconstruire un service propre avant chaque test**, afin qu'un test n'influence pas le suivant (isolation).

---

## 2. Le cœur des tests NestJS : mocks + injection de dépendances

### Le problème

`AuthService` a besoin de plein de choses pour fonctionner : un repository TypeORM, le `JwtService`, le `ConfigService`, argon2... Si on instancie le vrai service, il va vouloir une vraie base de données.

### La solution : les mocks

Un **mock** est un **faux objet** qui imite la vraie dépendance, mais dont on contrôle entièrement le comportement. Au lieu d'un vrai repository qui interroge Postgres, on fournit :

```typescript
const mockUserRepository = {
  findOne: jest.fn(),  // une fonction "espionne" vide
};
```

`jest.fn()` crée une **fonction mock** : elle enregistre comment elle est appelée, et on peut lui dire quoi retourner :

```typescript
mockUserRepository.findOne.mockResolvedValue(storedUser);  // retourne une promesse résolue avec storedUser
mockUserRepository.findOne.mockReturnValue(42);            // retourne 42 (synchrone)
mockUserRepository.findOne.mockRejectedValue(new Error()); // retourne une promesse rejetée
```

Et on peut vérifier comment elle a été utilisée :

```typescript
expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'x' } });
expect(mockImageQueue.add).toHaveBeenCalled();
```

### Le `TestingModule` — un mini-NestJS pour les tests

NestJS fournit `@nestjs/testing`. On construit un module de test où on remplace chaque vraie dépendance par son mock :

```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,  // ← le VRAI service qu'on teste
    { provide: getRepositoryToken(User), useValue: mockUserRepository },  // ← faux repo
    { provide: JwtService, useValue: mockJwtService },                    // ← faux JwtService
    { provide: ConfigService, useValue: mockConfigService },              // ← faux config
  ],
}).compile();

service = module.get<AuthService>(AuthService);  // on récupère l'instance avec ses mocks injectés
```

`provide` = ce que NestJS doit fournir quand quelqu'un demande cette dépendance.
`useValue` = par quoi on le remplace (notre mock).

### Les "tokens" d'injection : pourquoi `getRepositoryToken` et `getQueueToken` ?

Dans le vrai code, on injecte un repository comme ça :

```typescript
constructor(
  @InjectRepository(User) private userRepository: Repository<User>,
) {}
```

NestJS n'identifie pas ce repository par la classe `Repository` (il y en aurait plein), mais par un **token** unique généré à partir de l'entité. Pour fournir le mock au bon endroit, on doit utiliser **exactement le même token** :

- `getRepositoryToken(User)` → le token du repository de l'entité `User`.
- `getQueueToken('image-queue')` → le token de la queue BullMQ nommée `image-queue`.

Pour les repositories custom (comme `PhotoRepository`, `AlbumPhotoRepository`) qui sont des classes injectées directement, on utilise simplement la classe comme token : `{ provide: PhotoRepository, useValue: mock }`.

### Mocker un module entier : `jest.mock(...)`

Pour les libs externes (argon2, AWS SDK), on ne passe pas par l'injection NestJS. On remplace tout le module :

```typescript
jest.mock('argon2');  // tout le module argon2 devient un mock automatique

// puis dans un test :
(argon2.verify as jest.Mock).mockResolvedValue(true);  // on pilote son retour
```

Pour l'AWS SDK, on fournit une factory qui décrit le faux module :

```typescript
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ UploadId: 'upload-123', Parts: [] }),
  })),
  HeadObjectCommand: jest.fn(),
  // ...
}));
```

Ici on dit : « quand le code fait `new S3Client().send(...)`, retourne toujours `{ UploadId: 'upload-123', Parts: [] }` ». Aucun appel réseau vers AWS n'est fait.

---

## 3. La configuration mise en place

### `apps/api/package.json` — la config Jest

C'est le bloc `"jest"` à la fin du fichier. Détail ligne par ligne :

```jsonc
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],   // extensions que Jest sait résoudre
  "rootDir": "src",                                 // racine : on teste le code dans src/
  "testRegex": ".*\\.spec\\.ts$",                   // un test = un fichier *.spec.ts

  // Comment compiler le TypeScript à la volée :
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", { "tsconfig": {
      "module": "commonjs",            // Jest tourne en CommonJS, pas en ESM
      "moduleResolution": "node",
      "resolvePackageJsonExports": false
    }}]
  },

  // Faire comprendre l'alias @app/* à Jest (sinon "Cannot find module") :
  "moduleNameMapper": {
    "^@app/(.*)$": "<rootDir>/$1"
  },

  // Quels fichiers compter dans la couverture (et lesquels EXCLURE) :
  "collectCoverageFrom": [
    "**/*.(t|j)s",
    "!**/*.module.ts",      // les modules = juste du câblage, rien à tester unitairement
    "!**/*.entity.ts",      // les entités = des classes de données
    "!**/*.dto.ts",         // les DTO = des schémas de validation
    "!**/migrations/**",    // SQL généré
    "!**/*.processor.ts",   // workers BullMQ → testés en Phase 2 (intégration)
    "!**/auth/strategies/**",
    "!**/album/repositories/**",  // requêtes SQL custom → Phase 2 (vraie DB)
    // ...
  ],

  "coverageThreshold": {
    "global": { "lines": 80, "functions": 80, "branches": 80, "statements": 80 }
  }
}
```

**Le `transform` avec le `tsconfig` inline** : c'est le point délicat. Le `tsconfig.json` principal de l'API utilise `nodenext` (modules ESM modernes). Mais Jest a besoin de CommonJS. On surcharge donc juste pour les tests, sans toucher au tsconfig de prod. `resolvePackageJsonExports: false` était nécessaire pour ne pas avoir l'erreur `TS5098` (conflit entre ce flag et `moduleResolution: node`).

**Le `coverageThreshold`** : c'est le **gendarme**. Si un seul des 4 indicateurs passe sous 80%, Jest sort en erreur (code de sortie ≠ 0) → le CI échoue → la PR est bloquée. C'est exactement le « blocage à 80% » qu'on voulait.

### Les 4 indicateurs de couverture (important)

| Indicateur     | Ce qu'il mesure                                                            |
|----------------|----------------------------------------------------------------------------|
| **Statements** | % d'instructions exécutées (chaque ligne d'action)                         |
| **Lines**      | % de lignes exécutées (proche de statements)                               |
| **Functions**  | % de fonctions/méthodes appelées au moins une fois                         |
| **Branches**   | % de **chemins conditionnels** parcourus (chaque côté d'un `if`, `? :`, `??`) |

**Branches** est le plus exigeant. Exemple :

```typescript
if (!uploadId) {
  throw new Error('S3 did not return an UploadId');
}
```

Ça crée **2 branches** : le cas où `uploadId` est absent (on entre dans le `if`) et le cas où il est présent (on saute). Pour couvrir les 2, il faut **2 tests différents**. C'est pour ça qu'on s'est battu à la fin pour passer de 79,48% à 80,12% : il manquait des tests sur des branches `if`/`??` non parcourues (cf. les 2 derniers tests d'`aws.service.spec.ts`).

### `apps/api/tsconfig.json`

On a ajouté :

```jsonc
"types": ["jest", "node"],  // pour que l'IDE connaisse describe, it, expect, jest...
"skipLibCheck": true,
```

Sans `"types": ["jest", "node"]`, VS Code soulignait en rouge `describe`, `it`, `expect` (« Cannot find name »), parce qu'avec la résolution `nodenext`, TypeScript ne découvrait pas automatiquement `@types/jest`.

### `turbo.json`

```jsonc
"test": { "cache": false }
```

On déclare une tâche `test` pour Turborepo. `cache: false` car on veut que les tests tournent à chaque fois (un test « réussi en cache » qui ne se relance pas serait dangereux pour un gendarme de qualité).

### `.github/workflows/api.yml` — le blocage CI

On a ajouté un job `test` **avant** le build :

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
      with: { bun-version: latest }
    - name: Installer les dépendances
      run: bun install
    - name: Lancer les tests avec couverture
      working-directory: apps/api
      run: bun run test:cov

build-push:
  needs: test   # ← le build ne démarre QUE si "test" a réussi
  ...
```

`needs: test` est la clé : si la couverture descend sous 80%, le job `test` échoue, et `build-push` ne se lance jamais. **Rien n'est déployé tant que les tests ne passent pas.**

---

## 4. Détail de chaque fichier de test

Tous suivent le même squelette : mocks en haut → `beforeEach` qui reconstruit le service/contrôleur → `describe` par méthode → `it` par scénario.

### `app.controller.spec.ts`

Le plus simple. Vérifie que `getHello()` retourne le bon message. On a juste corrigé la valeur attendue (`'Hellooo World!'` — c'est bien la valeur réelle du code, avec les 3 "o").

### `auth/auth.service.spec.ts` — la logique d'authentification

Mocks : `userRepository`, `refreshTokenRepository`, `JwtService`, `ConfigService`, et `argon2` (via `jest.mock('argon2')`).

Scénarios couverts :
- **`validateUser`** — 3 chemins : credentials valides (retourne le user sans le mot de passe), user inexistant (`null`), mauvais mot de passe (`null`). On pilote `argon2.verify` pour simuler un hash correct ou non.
- **`login`** — génère access + refresh token et sauvegarde le refresh token hashé.
- **`refreshTokens`** — 4 chemins : token valide (nouveaux tokens), hash qui ne correspond pas (`UnauthorizedException`), token révoqué (`UnauthorizedException`), token expiré (`UnauthorizedException`).

Pattern important : `await expect(service.refreshTokens('bad')).rejects.toThrow(UnauthorizedException)` — c'est comme ça qu'on teste qu'une méthode **async** lève bien une exception.

### `auth/auth.controller.spec.ts` — les routes d'auth

Mocks : `AuthService`, `UsersService`, `ConfigService`, et un faux objet `Response` d'Express. Teste `register`, `login` (ok + identifiants invalides), `refresh` (sans cookie + avec cookie valide), `logout` (vérifie que les 3 cookies sont effacés). Comme le contrôleur manipule `res.cookie(...)` et `res.clearCookie(...)`, on mocke ces méthodes pour vérifier qu'elles sont appelées.

### `users/users.service.spec.ts` & `users.controller.spec.ts`

Service : `create` (nouvel email → ok ; email déjà pris → exception), `getProfile`, `findAll`. argon2 mocké pour le hash du mot de passe.
Controller : `getAdminData`, `getProfile`.

### `aws/aws.service.spec.ts` — le service S3/CloudFront

C'est le fichier avec le plus de mocking, parce qu'il parle à AWS. On mocke **4 modules** : `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/cloudfront-signer`, `@aws-sdk/lib-storage`. Aucun appel réseau réel.

Scénarios : `getSignedImageUrl`, `createMultipartUpload` (jpg, png, webp, et fallback `.bin` pour un type inconnu), `headObject`, `deleteObject`, `signPart`, `completeMultipartUpload`, `abortMultipartUpload`, `listParts`.

Les **2 derniers tests** (ceux que tu as sélectionnés) sont ceux qui ont fait passer la couverture des branches au-dessus de 80% :

- **« UploadId absent »** — on reconfigure `S3Client` pour qu'il retourne `{}` (pas d'`UploadId`), et on vérifie que le service lève `'S3 did not return an UploadId'`. Ça couvre le côté « vrai » du `if (!UploadId)`.
- **« Parts absent »** — S3 retourne `{}` sans `Parts`, on vérifie que `listParts` retourne `[]`. Ça couvre la branche du `?? []`.

Le pattern `S3Client.mockImplementationOnce(...)` veut dire « pour le **prochain** `new S3Client()` seulement, utilise ce comportement ». On reconstruit ensuite un `freshModule` pour que le service capte ce nouveau client.

### `photo/photo.service.spec.ts` — la logique métier des photos

Mocks : `PhotoRepository`, la queue BullMQ (`getQueueToken('image-queue')`), `AwsService`, `ConfigService`.

Scénarios : `getQuotaForUser`, `registerUpload` (succès + ajout du job d'optimisation, fichier absent sur S3 → exception, `ContentLength` absent → taille `null`), `getStatus` (COMPLETED avec URL, PENDING avec URL `null`, photo d'un autre user → exception, introuvable → exception), `deletePhoto`, `sharePhoto` (génère un token / retourne l'existant), `unsharePhoto`, `getPublicByToken`, `listForUser` (pagination), `listByColors` (vide, k-means normal sur 9 photos, retour anticipé avec 2 photos).

`listByColors` est intéressant : l'algo de clustering de couleurs a un **retour anticipé** si le nombre de photos est inférieur au nombre de clusters. On a un test exprès avec 2 photos pour couvrir ce chemin, et un avec 9 photos pour le chemin k-means complet.

### `photo/photo.controller.spec.ts` — les routes photos & upload multipart

Mocks : `PhotoService`, `AwsService`, `RedisService`. Teste toute la mécanique d'upload multipart (createMultipart avec quota dépassé/ok, signPart, listParts, abortMultipart, completeMultipart). 

Deux scénarios fins :
- **`completeMultipart` avec rollback** — si `registerUpload` échoue après l'assemblage S3, on vérifie que `deleteObject` est appelé (on ne laisse pas un fichier orphelin sur S3).
- **`assertUploadOwner` refusé** — Redis renvoie un autre `userId` que l'utilisateur courant → l'accès est refusé. Ça protège contre le détournement d'un `uploadId` qui n'est pas à toi.

### `photo/public-photo.controller.spec.ts`

Petit contrôleur public (accès par share token, sans auth). Vérifie que `getPublic` délègue bien à `photoService.getPublicByToken`.

### `album/album.service.spec.ts` — albums & partage

Le plus gros service. Mocks : `albumRepo`, `albumPhotoRepo`, `albumMemberRepo`, `photoRepo`, `userRepo`, `AwsService`.

Scénarios : `create`, `findAllForUser` (vide + albums possédés et partagés avec membres), `findOne` (propriétaire, membre non-propriétaire, étranger → exception, introuvable → exception), `update` (renommage + non-propriétaire interdit), `remove`, `getPhotos`, `addPhotos` (ok + photo déjà présente → exception), `removePhoto`, `getMembers`, `addMember` (ok, user introuvable, le proprio essaie de se partager à lui-même, membre déjà présent → pas de réinsertion), `removeMember`, `getPhotoIds`.

Piège rencontré sur `findAllForUser` : le tri est **DESC par date de création**. Comme un test comparait `result[0]` en dur, l'ordre dépendait des dates des mocks. On a corrigé en utilisant `.some(...)` plutôt que des index fixes :

```typescript
expect(result.some((album) => album.isOwner)).toBe(true);
expect(result.some((album) => !album.isOwner)).toBe(true);
```

Leçon générale : **ne jamais tester un ordre que le code ne garantit pas par rapport à tes données de mock**. On teste une propriété (« il existe au moins un album possédé »), pas une position.

### `album/album.controller.spec.ts`

Mocke `AlbumService` et vérifie que chacune des 12 méthodes du contrôleur appelle bien le service avec les bons arguments.

### `auth/guards/csrf.guard.spec.ts` & `roles.guard.spec.ts`

Les **guards** sont des gardiens qui autorisent ou bloquent une requête. On simule un `ExecutionContext` (le contexte de la requête NestJS) à la main.
- **CSRF** : passe si `@SkipCsrf`, si méthode GET/OPTIONS, ou si le token du cookie == token du header ; bloque si cookie manquant ou tokens différents.
- **Roles** : passe si aucun rôle requis ou si l'user a le rôle ; bloque sinon (utilise `Role.ADMIN` / `Role.USER` depuis `@repo/shared`).

### `common/global-exception.filter.spec.ts`

Le **filtre d'exception global** transforme toute erreur en réponse HTTP propre. On teste : une `HttpException` (format structuré), une erreur inconnue (→ 500), une `HttpException` sans corps structuré.

---

## 5. Les commandes utiles

```bash
# Depuis apps/api/
bun run test            # lance tous les tests une fois
bun run test:watch      # relance automatiquement à chaque sauvegarde (dév)
bun run test:cov        # tests + rapport de couverture (c'est ce que le CI exécute)
```

Pour lancer un seul fichier pendant que tu bosses dessus :

```bash
bun run test -- auth.service.spec
```

Le rapport de couverture HTML détaillé est généré dans `apps/api/coverage/` (ouvre `lcov-report/index.html` dans un navigateur pour voir, ligne par ligne, ce qui est rouge/vert).

---

## 6. Comment ajouter un test à un nouveau service

1. Crée `mon-service.spec.ts` à côté de `mon-service.ts`.
2. Crée un mock pour chaque dépendance du constructeur (`jest.fn()` par méthode utilisée).
3. Monte le `TestingModule` en remplaçant chaque dépendance par son mock.
4. Dans `beforeEach`, ajoute `jest.clearAllMocks()` pour repartir propre.
5. Un `describe` par méthode, un `it` par scénario (cas nominal **et** cas d'erreur).
6. Pour chaque `if`/`?:`/`??` du code, prévois un test de **chaque côté** (sinon la couverture des branches chute).
7. Lance `bun run test:cov` et vise > 80% sur les 4 indicateurs.

---

## 7. Ce qui n'est PAS encore couvert (exclu volontairement, Phases suivantes)

Ces fichiers sont exclus de la couverture **pour l'instant** car ils nécessitent une vraie infrastructure (base de données, Redis, S3) — ce sera la **Phase 2 (tests d'intégration)** :

- `*.processor.ts` — les workers BullMQ
- `album/repositories/**` & `photo.repository.ts` — les requêtes SQL custom
- `auth/strategies/**` — la stratégie JWT Passport
- `middlewares/**` — les middlewares
- `redis.service.ts` — la connexion Redis réelle

> Voir le plan global des tests en mémoire projet (« Plan de mise en place des tests » : 6 phases — unitaires Jest API ✅, intégration, E2E Supertest, Vitest web, Playwright, blocage CI).
