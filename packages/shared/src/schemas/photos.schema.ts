import { z } from "zod";

export enum PhotoStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

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

// --- Multipart upload (presigned URLs via NestJS, remplace Companion) ---

export const CreateMultipartSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(127),
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
