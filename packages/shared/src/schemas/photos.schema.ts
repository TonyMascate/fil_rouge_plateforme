import { z } from "zod";

export enum PhotoStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// --- Exploration chromatique : atlas de couleurs fixe ---
//
// La logique de l'atlas (cellules, conversions OKLCH, classement) vit dans
// `../color`. Ici on ne déclare que les contrats d'API (DTO).

export const ColorAtlasCellSchema = z.object({
  cellId: z.string(),
  kind: z.enum(["chromatic", "neutral"]),
  hueIndex: z.number().int().nullable(),
  lightIndex: z.number().int(),
  hex: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
});
export type ColorAtlasCellDto = z.infer<typeof ColorAtlasCellSchema>;

export const ColorAtlasResponseSchema = z.array(ColorAtlasCellSchema);
export type ColorAtlasResponseDto = z.infer<typeof ColorAtlasResponseSchema>;

export const PhotoStatusResponseSchema = z.object({
  id: z.uuid(),
  status: z.enum([PhotoStatus.PENDING, PhotoStatus.PROCESSING, PhotoStatus.COMPLETED, PhotoStatus.FAILED]),
  url: z.url().nullable(),
});

export type PhotoStatusResponseDto = z.infer<typeof PhotoStatusResponseSchema>;

export const PhotoResponseSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  originalName: z.string(),
  createdAt: z.coerce.date(),
  shareToken: z.string().nullable(),
});

export type PhotoResponseDto = z.infer<typeof PhotoResponseSchema>;

export const UploadRegisteredResponseSchema = z.object({
  photoId: z.uuid(),
  status: z.enum([PhotoStatus.PENDING, PhotoStatus.PROCESSING, PhotoStatus.COMPLETED, PhotoStatus.FAILED]),
});

export type UploadRegisteredResponseDto = z.infer<typeof UploadRegisteredResponseSchema>;

export const PhotoListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(['desc', 'asc']).default('desc'),
});

export type PhotoListQueryDto = z.infer<typeof PhotoListQuerySchema>;

export const PhotoListResponseSchema = z.object({
  items: z.array(PhotoResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PhotoListResponseDto = z.infer<typeof PhotoListResponseSchema>;

// Photos d'une cellule de l'atlas (mêmes items que la galerie → réutilise PhotoGrid).
export const ColorCellPhotosResponseSchema = z.object({
  cellId: z.string(),
  items: z.array(PhotoResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type ColorCellPhotosResponseDto = z.infer<typeof ColorCellPhotosResponseSchema>;

export const QuotaResponseSchema = z.object({
  usedBytes: z.number().int().min(0),
  maxBytes: z.number().int().min(0),
});

export type QuotaResponseDto = z.infer<typeof QuotaResponseSchema>;

// --- Partage public d'une photo ---

export const ShareResponseSchema = z.object({
  shareToken: z.string(),
});

export type ShareResponseDto = z.infer<typeof ShareResponseSchema>;

export const PublicPhotoResponseSchema = z.object({
  url: z.url(),
  originalName: z.string(),
  createdAt: z.coerce.date(),
});

export type PublicPhotoResponseDto = z.infer<typeof PublicPhotoResponseSchema>;

// --- Multipart upload (presigned URLs via NestJS, remplace Companion) ---

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;

export const CreateMultipartSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  fileSize: z.number().int().min(1).max(50 * 1024 * 1024),
});
export type CreateMultipartDto = z.infer<typeof CreateMultipartSchema>;

export const CreateMultipartResponseSchema = z.object({
  uploadId: z.string(),
  key: z.string(),
});
export type CreateMultipartResponseDto = z.infer<typeof CreateMultipartResponseSchema>;

export const SignPartSchema = z.object({
  key: z.string().regex(/^raw\//, { message: "key doit commencer par raw/" }),
  uploadId: z.string().min(1),
  partNumber: z.coerce.number().int().min(1).max(10000),
});
export type SignPartDto = z.infer<typeof SignPartSchema>;

export const SignPartResponseSchema = z.object({
  url: z.url(),
});
export type SignPartResponseDto = z.infer<typeof SignPartResponseSchema>;

export const MultipartKeySchema = z.object({
  key: z.string().regex(/^raw\//),
  uploadId: z.string().min(1),
});
export type MultipartKeyDto = z.infer<typeof MultipartKeySchema>;

export const CompletedPartSchema = z.object({
  PartNumber: z.number().int().min(1).max(10000),
  ETag: z.string().min(1),
});

export const CompleteMultipartSchema = z.object({
  key: z.string().regex(/^raw\//),
  uploadId: z.string().min(1),
  parts: z.array(CompletedPartSchema).min(1),
  originalName: z.string().trim().min(1).max(255),
});
export type CompleteMultipartDto = z.infer<typeof CompleteMultipartSchema>;
