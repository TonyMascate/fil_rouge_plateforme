# Note dev — Interfaces NestJS & injection de dépendances

## Le principe

Une interface TypeScript définit un **contrat** (quoi faire), une classe concrète fournit l'**implémentation** (comment le faire).

L'intérêt principal ici : pouvoir swapper l'implémentation sans toucher au code métier.

---

## IStorage — Module Storage

### 1. L'interface

```typescript
// apps/api/src/storage/interfaces/storage.interface.ts

export interface IStorage {
  upload(file: Buffer, key: string, mimetype: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}
```

### 2. La classe concrète (S3)

```typescript
// apps/api/src/storage/s3.service.ts

import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorage } from './interfaces/storage.interface';

@Injectable()
export class S3Service implements IStorage {
  private readonly client = new S3Client({ region: 'eu-west-3' });
  private readonly bucket = process.env.AWS_S3_BUCKET;

  async upload(file: Buffer, key: string, mimetype: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimetype,
    }));
    return `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn }
    );
  }
}
```

### 3. Le module — on déclare qui joue le rôle de IStorage

```typescript
// apps/api/src/storage/storage.module.ts

import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

@Module({
  providers: [
    {
      provide: 'IStorage',
      useClass: S3Service,
    },
  ],
  exports: ['IStorage'],
})
export class StorageModule {}
```

### 4. Utilisation dans PhotosService

```typescript
// apps/api/src/photos/photos.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { IStorage } from '../storage/interfaces/storage.interface';

@Injectable()
export class PhotosService {
  constructor(
    @Inject('IStorage') private readonly storage: IStorage,
  ) {}

  async uploadPhoto(file: Express.Multer.File, userId: string) {
    const key = `photos/${userId}/${Date.now()}-${file.originalname}`;
    const url = await this.storage.upload(file.buffer, key, file.mimetype);
    // sauvegarder l'url en base...
    return url;
  }

  async deletePhoto(key: string) {
    await this.storage.delete(key);
  }
}
```

---

## Alternative simple — injecter S3Service directement

Si tu ne veux pas gérer l'interface et le token, tu peux injecter `S3Service` directement. C'est plus simple et suffisant si tu ne prévois pas de changer de provider.

```typescript
// Sans interface
@Injectable()
export class PhotosService {
  constructor(private readonly storage: S3Service) {}
}
```

```typescript
// storage.module.ts simplifié
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule {}
```

**Quand choisir l'interface :**
- Tu veux pouvoir mocker le storage dans les tests unitaires
- Tu envisages de changer de provider (S3 → R2, S3 → local en dev)

**Quand injecter directement :**
- Tu es sûr de rester sur S3
- Tu veux aller vite

---

## IPhotoService — si AlbumModule et WhiteboardModule en ont besoin

Même principe si tu veux que `AlbumModule` dépende d'un contrat plutôt que directement de `PhotosService` :

```typescript
// photos/interfaces/photo.service.interface.ts

export interface IPhotoService {
  findByIds(ids: string[]): Promise<Photo[]>;
  findByAlbumId(albumId: string): Promise<Photo[]>;
}
```

```typescript
// photos.module.ts
@Module({
  providers: [
    PhotosService,
    {
      provide: 'IPhotoService',
      useClass: PhotosService,
    },
  ],
  exports: ['IPhotoService'],
})
export class PhotosModule {}
```

```typescript
// albums.service.ts
@Injectable()
export class AlbumsService {
  constructor(
    @Inject('IPhotoService') private readonly photoService: IPhotoService,
  ) {}
}
```

> Si `AlbumsService` n'a besoin que de `PhotosService` et que tu ne prévois pas d'alternative, injecte directement `PhotosService` — c'est plus pragmatique.
