//  1. Codes erreurs uniques
export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",

  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
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
