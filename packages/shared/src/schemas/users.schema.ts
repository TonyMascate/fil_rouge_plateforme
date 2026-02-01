import { z } from 'zod';

// --- 1. Register DTO (Entrée) ---
export const UserSchema = z.object({
  email: z.email({ message: "Format d'email invalide" }).trim(),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit faire au moins 8 caractères" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir un chiffre" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir une majuscule" }),
  firstName: z.string().min(2, { message: "Prénom trop court" }).trim(),
  lastName: z.string().min(2, { message: "Nom trop court" }).trim(),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = UserSchema.omit({ createdAt: true });

export type UserCreateDto = z.infer<typeof UserCreateSchema>; 

export const UserResponseSchema = UserSchema.omit({ password: true });

export type UserResponseDto = z.infer<typeof UserResponseSchema>;


