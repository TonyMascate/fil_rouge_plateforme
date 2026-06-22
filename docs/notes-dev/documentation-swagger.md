# Documentation API — OpenAPI / Swagger

## 1. Contexte et objectif

Une API sans documentation oblige chaque développeur consommateur (front, mobile, partenaire) à lire le code source pour comprendre les endpoints. L'objectif est de générer une **documentation interactive** accessible à `domaine.com/docs`, qui décrit :

- Les routes disponibles (méthode, chemin, sommaire)
- Le format des corps de requête (body)
- Le format des réponses avec leur schéma JSON
- Les codes d'erreur possibles
- Le mécanisme d'authentification

## 2. Stack utilisée

| Outil             | Rôle                                                      |
| ----------------- | --------------------------------------------------------- |
| `@nestjs/swagger` | Génère la spec OpenAPI 3.0 et sert l'interface Swagger UI |
| `nestjs-zod` v5   | Pont entre les schémas Zod et les métadonnées OpenAPI     |
| `Zod` v4          | Schémas de validation déjà présents dans `@repo/shared`   |

L'intérêt d'utiliser `nestjs-zod` avec Swagger : les schémas Zod définis une seule fois dans `@repo/shared` servent **à la fois** pour la validation runtime (NestJS rejette les requêtes invalides) **et** pour la documentation (Swagger affiche le schéma automatiquement). Pas de duplication.

## 3. Setup dans `main.ts`

```ts
// apps/api/src/main.ts
import { ZodValidationPipe, cleanupOpenApiDoc } from "nestjs-zod";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

if (process.env.NODE_ENV !== "production") {
  const config = new DocumentBuilder().setTitle("Fil Rouge API").setVersion("1.0").setDescription("API de la plateforme Fil Rouge — auth par cookies HttpOnly + CSRF (X-XSRF-TOKEN)").addCookieAuth("access_token").build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("docs", app, document);
}
```

**Points clés :**

- `DocumentBuilder` construit la configuration globale : titre, version, description, schéma d'auth
- `addCookieAuth('access_token')` déclare que l'API utilise un cookie HttpOnly (et non un Bearer token) — Swagger affiche le cadenas 🔒 sur les endpoints protégés
- `SwaggerModule.createDocument` inspecte tous les controllers décorés et génère la spec OpenAPI
- `cleanupOpenApiDoc` (fourni par `nestjs-zod`) post-traite le document : supprime les schemas redondants, renomme les composants selon le nom de la classe DTO
- **Conditionnel `NODE_ENV !== 'production'`** : Swagger n'est **jamais** exposé en prod — c'est une bonne pratique de sécurité (évite l'exposition de la surface d'attaque)

## 4. Décorateurs sur les controllers

### 4.1 Niveau classe

```ts
@ApiTags('Photos')           // groupe l'endpoint dans l'onglet "Photos" de Swagger UI
@ApiCookieAuth('access_token') // indique que tous les endpoints nécessitent le cookie
@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController { ... }
```

### 4.2 Niveau méthode

```ts
@Post('uploads/multipart')
@ApiOperation({ summary: 'Initialiser un upload multipart' })
@ApiResponse({ status: 201, type: CreateMultipartResponseDto })
@ApiResponse({ status: 400, description: 'Données invalides', type: ApiErrorDto })
@ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
@ApiResponse({ status: 403, description: 'Quota de stockage atteint', type: ApiErrorDto })
async createMultipart(...) { ... }
```

- `@ApiOperation` : summary affiché dans l'UI à côté du chemin
- `@ApiResponse({ type: XxxDto })` : Swagger génère le schéma JSON de la réponse à partir de la classe DTO
- `@ApiResponse({ status: 4xx, type: ApiErrorDto })` : pour les erreurs, on type aussi la réponse pour que le client connaisse le format `{ code, statusCode, message, details }`
- `@ApiParam` : documente les paramètres de chemin (ex: `:id`)
- `@ApiQuery` : documente les query params (ex: `page`, `limit`)
- `@ApiHeader` : documente un header requis (ex: `X-XSRF-TOKEN`)
- `@HttpCode(...)` : force le status code de réponse (NestJS retourne `201` par défaut sur tous les `@Post`, à overrider quand le POST ne crée pas de ressource)

### 4.3 Exemple complet — GET /photos/:id/status

```ts
@Get(':id/status')
@ApiOperation({ summary: 'Statut de traitement d\'une photo' })
@ApiParam({ name: 'id', type: String, format: 'uuid' })
@ApiResponse({ status: 200, type: PhotoStatusResponseDto })
@ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
@ApiResponse({ status: 404, description: 'Photo introuvable ou accès refusé', type: ApiErrorDto })
getStatus(...) { ... }
```

## 5. Format unifié des erreurs

Toutes les erreurs de l'API renvoient un body cohérent `{ code, statusCode, message, details? }` via `ApiException` côté backend. Pour que Swagger documente cette structure, un schéma Zod est défini dans `@repo/shared` et un DTO l'expose côté NestJS :

```ts
// packages/shared/src/errors.ts
export const ApiErrorSchema = z.object({
  code: z.string(),                  // Code applicatif (ex: AUTH_INVALID_CREDENTIALS)
  statusCode: z.number().int(),      // Code HTTP
  message: z.string(),               // Message lisible
  details: z.array(z.object({        // Détails de validation par champ
    field: z.string(),
    message: z.string(),
  })).optional(),
});
```

```ts
// apps/api/src/common/dto/api-error.dto.ts
import { createZodDto } from 'nestjs-zod';
import { ApiErrorSchema } from '@repo/shared';
export class ApiErrorDto extends createZodDto(ApiErrorSchema) {}
```

Sur chaque endpoint, les `@ApiResponse` d'erreur référencent ce DTO. Bénéfice : un développeur consommateur sait exactement à quoi s'attendre quand il reçoit une erreur, peu importe l'endpoint — pas besoin de chercher dans le code source.

## 6. Header CSRF — `X-XSRF-TOKEN`

Toutes les mutations (POST/PUT/PATCH/DELETE) protégées par le `CsrfGuard` global nécessitent le header `X-XSRF-TOKEN` (valeur du cookie `XSRF-TOKEN` côté client). Pour le documenter, on pose `@ApiHeader` au niveau de la classe `PhotoController` :

```ts
@ApiTags('Photos')
@ApiCookieAuth('access_token')
@ApiExtraModels(ApiErrorDto)
@ApiHeader({
  name: 'X-XSRF-TOKEN',
  description: 'Token CSRF (valeur du cookie XSRF-TOKEN) — requis sur toutes les mutations',
  required: true,
})
@Controller('photos')
export class PhotoController { ... }
```

**Trade-off assumé** : `@ApiHeader` au niveau classe s'applique aussi aux endpoints `GET`, alors qu'ils ne nécessitent pas de CSRF. C'est une légère imprécision documentaire — la solution stricte serait d'ajouter `@ApiHeader` individuellement sur chaque `@Post` (5 répétitions dans `PhotoController`). Le choix retenu privilégie la lisibilité du code à la précision absolue de la doc.

## 7. Cohérence des status codes — `@HttpCode`

NestJS retourne `201 Created` par défaut sur **tous** les `@Post`. Or certains POST de l'API ne créent rien :

| Endpoint | Status réel souhaité | Décorateur |
|---|---|---|
| `POST /uploads/multipart/abort` | `204 No Content` (pas de body) | `@HttpCode(204)` |
| `POST /uploads/multipart/list-parts` | `200 OK` (lecture, pas création) | `@HttpCode(200)` |

Sans ces décorateurs, l'API retournerait `201` au runtime mais Swagger documenterait `204`/`200` → incohérence entre la doc et le comportement réel. Avec `@HttpCode(...)`, le runtime et la doc sont alignés.

```ts
@Post('uploads/multipart/abort')
@HttpCode(204)
@ApiOperation({ summary: 'Annuler un upload en cours' })
@ApiResponse({ status: 204, description: 'Upload annulé' })
async abortMultipart(...) { ... }
```

## 8. Intégration nestjs-zod → Swagger

Quand on écrit :

```ts
// @repo/shared
export const CreateMultipartResponseSchema = z.object({
  uploadId: z.string(),
  key: z.string(),
});

// apps/api/src/photo/dto/photo-response.dto.ts
export class CreateMultipartResponseDto extends createZodDto(CreateMultipartResponseSchema) {}
```

`createZodDto` génère une classe qui expose une méthode statique `_OPENAPI_METADATA_FACTORY()`. C'est cette méthode que `@nestjs/swagger` appelle pour obtenir le schéma JSON à afficher dans Swagger. **Aucun `@ApiProperty` n'est nécessaire** sur les champs — le schéma Zod est la source de vérité unique.

## 9. Limitation connue — `z.date()` et JSON Schema

### Le problème

JSON Schema (le format sous-jacent d'OpenAPI) ne connaît pas le type `Date`. Il ne connaît que `string`, `number`, `boolean`, `object`, `array`, `null`. Zod v4 est strict là-dessus : il lève une erreur au démarrage si on lui demande de convertir un `z.date()` en JSON Schema.

```
Error: Date cannot be represented in JSON Schema
```

C'est un **bug ouvert** dans `nestjs-zod` ([issue #184](https://github.com/BenLorantfy/nestjs-zod/issues/184)) et dans `nestjs/swagger` ([issue #3672](https://github.com/nestjs/swagger/issues/3672)).

### La solution appliquée

Pour les DTOs de réponse contenant des dates, on redéfinit un schéma **Swagger-only** localement, où `z.date()` est remplacé par `z.string()`. Les schémas partagés dans `@repo/shared` ne sont **pas modifiés**.

```ts
// apps/api/src/photo/dto/photo-response.dto.ts

// ❌ Ne marche pas — PhotoResponseSchema contient z.coerce.date()
// export class PhotoListResponseDto extends createZodDto(PhotoListResponseSchema) {}

// ✅ Schéma local Swagger-only
const PhotoListResponseSwaggerSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      url: z.string().url(),
      originalName: z.string(),
      createdAt: z.string().describe("ISO 8601 datetime"), // string pour Swagger, Date en runtime
    }),
  ),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export class PhotoListResponseDto extends createZodDto(PhotoListResponseSwaggerSchema) {}
```

C'est sémantiquement correct : JSON transporte des ISO strings (pas des objets `Date`). La doc Swagger reflète donc ce qui circule réellement sur le réseau.

## 10. Ce qui est documenté

| Tag        | Endpoints                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**   | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`                                           |
| **Users**  | `GET /users/profile`, `GET /users/admin-only`                                                                                  |
| **Photos** | `POST /photos/uploads/multipart`, `/sign-part`, `/list-parts`, `/complete`, `/abort` — `GET /photos/quota`, `GET /photos/colors`, `GET /photos/colors/:cellId`, `GET /photos/:id/status`, `GET /photos` — `DELETE /photos/:id`, `POST /photos/:id/share`, `DELETE /photos/:id/share` |

## 11. Sécurité

- Swagger n'est accessible **qu'en développement** (`NODE_ENV !== 'production'`)
- Il n'expose pas les valeurs des variables d'environnement ni les secrets
- Le mécanisme CSRF est documenté à deux endroits : dans la description globale et via `@ApiHeader('X-XSRF-TOKEN')` sur les controllers concernés
- Le format des erreurs (`{ code, statusCode, message, details }`) est typé via `ApiErrorDto` — pas d'information sensible exposée, juste la structure

## 12. Questions jury

**Q : Pourquoi ne pas utiliser `@ApiProperty` directement ?**

Parce que le projet utilise `nestjs-zod` — les schémas Zod dans `@repo/shared` sont la source de vérité. Ajouter `@ApiProperty` en parallèle créerait une duplication et un risque de désynchronisation : si on change le schéma Zod sans changer `@ApiProperty`, la doc devient fausse.

**Q : Swagger est-il exposé en production ?**

Non. Le bloc `SwaggerModule.setup` est conditionné à `NODE_ENV !== 'production'`. En prod, la route `/docs` n'existe pas.

**Q : Peut-on tester les endpoints depuis Swagger UI ?**

Techniquement oui, mais l'auth cookie + CSRF complique les tests depuis Swagger UI (le navigateur gère les cookies HttpOnly mais Swagger n'envoie pas automatiquement le header `X-XSRF-TOKEN`). Swagger est utilisé ici comme **documentation de référence**, pas comme outil de test — pour les tests on utilise des clients HTTP comme Insomnia ou Postman avec les cookies configurés.

**Q : Pourquoi typer les réponses d'erreur avec un DTO dédié plutôt qu'une simple description ?**

Un consommateur de l'API doit savoir comment parser une erreur. Avec juste une description textuelle, il devrait deviner le format ou le tester manuellement. Avec `type: ApiErrorDto`, Swagger affiche le schéma JSON exact (`{ code, statusCode, message, details? }`) et un développeur peut générer son propre type côté client (ex: avec un générateur OpenAPI) en toute confiance.

**Q : Pourquoi `@HttpCode` sur certains POST et pas d'autres ?**

NestJS retourne `201 Created` par défaut sur les `@Post`. C'est correct quand l'endpoint crée une ressource (`/auth/register`, `/uploads/multipart`, etc.). Mais `abort` ne retourne aucun body → `204 No Content` est sémantiquement plus juste. Et `list-parts` est en réalité une lecture (envoyée en POST parce qu'elle prend un body) → `200 OK` reflète mieux l'intention. Sans `@HttpCode`, la doc et le runtime divergent.
