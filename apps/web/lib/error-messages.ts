import { ErrorCode } from "@repo/shared";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: "Email ou mot de passe incorrect.",
  [ErrorCode.USER_NOT_FOUND]: "Utilisateur introuvable.",
  [ErrorCode.USER_ALREADY_EXISTS]: "Un compte existe déjà avec cet email.",
  [ErrorCode.VALIDATION_ERROR]: "Les données saisies sont invalides.",
  [ErrorCode.INTERNAL_SERVER_ERROR]: "Une erreur interne est survenue. Veuillez réessayer.",
  [ErrorCode.UNAUTHORIZED]: "Vous devez être connecté pour effectuer cette action.",
  [ErrorCode.FORBIDDEN]: "Vous n'avez pas les droits pour effectuer cette action.",
  [ErrorCode.PHOTO_NOT_FOUND]: "Photo introuvable.",
  [ErrorCode.PHOTO_S3_MISSING]: "Le fichier de la photo est introuvable sur le serveur de stockage.",
  [ErrorCode.QUOTA_EXCEEDED]: "Quota de stockage dépassé. Supprimez des photos avant d'en ajouter de nouvelles.",
  [ErrorCode.ALBUM_NOT_FOUND]: "Album introuvable.",
  [ErrorCode.ALBUM_PHOTO_ALREADY_EXISTS]: "Cette photo est déjà dans l'album.",
};
