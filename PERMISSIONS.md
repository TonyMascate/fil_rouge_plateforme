# Gestion des Permissions

## Architecture

Deux couches complémentaires :
- **RBAC (Role-Based Access Control)** : les rôles définissent ce qu'un utilisateur peut **faire** (créer, modifier, supprimer)
- **Ownership** : vérifie à **qui** appartient la ressource

---

## 1. Mapping statique des permissions (package shared)

Définir un mapping `Role → Permission[]` dans le package `shared` pour garantir la cohérence frontend/backend.

```typescript
// packages/shared/src/permissions.ts

export const ROLE_PERMISSIONS = {
  [Role.ADMIN]: ['users.*', 'photos.*', 'settings.*'],
  [Role.USER]: ['photos.read', 'photos.create'],
} as const;
```

Pas de table en base, pas de migration. Si besoin de permissions dynamiques plus tard, migrer vers du DB-driven.

---

## 2. Backend (NestJS)

### Décorateur

```typescript
// auth/decorators/permissions.decorator.ts

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### Guard

```typescript
// auth/guards/permissions.guard.ts

@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const { role } = context.switchToHttp().getRequest().user;
    const userPermissions = ROLE_PERMISSIONS[role];

    return required.every((perm) =>
      userPermissions.some((p) => p === perm || p === perm.split('.')[0] + '.*'),
    );
  }
}
```

### Utilisation sur les routes

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('photos.create')
@Post()
createPhoto(@CurrentUser() user, @Body() dto) {
  return this.photosService.create(dto, user.userId);
}
```

### Ownership (vérification dans le service)

```typescript
// photos.service.ts

async findOne(photoId: string, userId: string) {
  const photo = await this.photoRepository.findOneBy({ id: photoId });
  if (!photo) throw new NotFoundException();
  if (photo.userId !== userId) throw new ForbiddenException();
  return photo;
}
```

L'admin peut bypass le ownership si besoin via une vérification du rôle.

---

## 3. Frontend (Next.js)

### Helper de permission

```typescript
// lib/permissions.ts

import { ROLE_PERMISSIONS } from '@shared/permissions';

export async function requirePermission(permission: string) {
  const session = await GetSession();
  if (!session) redirect('/login');
  if (!ROLE_PERMISSIONS[session.role]?.includes(permission)) {
    redirect('/unauthorized');
  }
  return session;
}
```

### Protection des pages (Server Component)

```typescript
// app/(auth)/photos/new/page.tsx

export default async function NewPhotoPage() {
  await requirePermission('photos.create');
  return <PhotoForm />;
}
```

Pour un groupe de pages partageant la même permission, utiliser un layout :

```typescript
// app/(auth)/(photos-manage)/layout.tsx

export default async function Layout({ children }) {
  await requirePermission('photos.manage');
  return <>{children}</>;
}
```

### Protection des pages avec ownership (Server Component + Client Component)

Le Server Component fait le fetch et bloque l'accès avant le rendu. Le Client Component enfant gère l'interactivité (useState, etc.).

```typescript
// app/(auth)/photos/[id]/page.tsx (Server Component)

export default async function PhotoPage({ params }) {
  const res = await fetch(`${API_URL}/photos/${params.id}`, {
    headers: { Cookie: cookies().toString() },
  });
  if (res.status === 403) redirect('/unauthorized');
  if (res.status === 404) notFound();

  const photo = await res.json();
  return <PhotoEditor photo={photo} />;
}
```

```typescript
// components/PhotoEditor.tsx (Client Component)
'use client';

export function PhotoEditor({ photo }) {
  const [isEditing, setIsEditing] = useState(false);
  // interactivité ici
}
```

### Gestion du 403 sur les appels client

Pour les appels API faits côté client (mutations, navigations dynamiques), ajouter la gestion du 403 dans l'interceptor Axios :

```typescript
// lib/axios.ts

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403) {
      window.location.href = '/unauthorized';
    }
    // ... refresh 401 existant
  }
);
```

---

## Résumé

| Couche | Responsabilité | Mécanisme |
|---|---|---|
| Shared | Définir les permissions par rôle | Mapping statique |
| Backend Guard | Vérifier les permissions sur la route | `PermissionsGuard` + `@RequirePermissions()` |
| Backend Service | Vérifier le ownership | `resource.userId === user.userId` |
| Frontend Page/Layout | Bloquer l'accès avant le rendu (SSR) | `requirePermission()` ou fetch + check 403 |
| Frontend Axios | Gérer les 403 sur appels client | Interceptor response |
