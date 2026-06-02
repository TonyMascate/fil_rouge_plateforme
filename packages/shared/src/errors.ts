import { z } from "zod";

//  1. Codes erreurs uniques
export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",

  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  PHOTO_NOT_FOUND = "PHOTO_NOT_FOUND",
  PHOTO_S3_MISSING = "PHOTO_S3_MISSING",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",

  ALBUM_NOT_FOUND = "ALBUM_NOT_FOUND",
  ALBUM_PHOTO_ALREADY_EXISTS = "ALBUM_PHOTO_ALREADY_EXISTS",
}

// 2. format des erreurs de champs formulaires
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

// 3. Format des erreurs API
export interface ApiErrorResponse {
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: ValidationErrorDetail[];
}

// 4. Schéma Zod du format d'erreur (utilisé pour la doc Swagger)
export const ApiErrorSchema = z.object({
  code: z.string().describe('Code d\'erreur applicatif (ex: AUTH_INVALID_CREDENTIALS)'),
  statusCode: z.number().int().describe('Code HTTP'),
  message: z.string().describe('Message lisible'),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional().describe('Détails de validation par champ'),
});
