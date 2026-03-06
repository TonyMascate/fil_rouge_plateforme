import { ErrorCode } from "@repo/shared";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: "Email ou mot de passe incorrect.",
  [ErrorCode.USER_NOT_FOUND]: "Utilisateur introuvable.",
  [ErrorCode.USER_ALREADY_EXISTS]: "Un compte existe déjà avec cet email.",
  [ErrorCode.VALIDATION_ERROR]: "Les données saisies sont invalides.",
  [ErrorCode.INTERNAL_SERVER_ERROR]: "Une erreur interne est survenue. Veuillez réessayer.",
  [ErrorCode.UNAUTHORIZED]: "Vous devez être connecté pour effectuer cette action.",
  [ErrorCode.FORBIDDEN]: "Vous n'avez pas les droits pour effectuer cette action.",
};
