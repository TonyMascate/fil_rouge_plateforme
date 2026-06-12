import { z } from "zod";

export const CreateAlbumSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
});
export type CreateAlbumDto = z.infer<typeof CreateAlbumSchema>;

export const UpdateAlbumSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "100 caractères maximum"),
});
export type UpdateAlbumDto = z.infer<typeof UpdateAlbumSchema>;

export const AddPhotosSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(200),
});
export type AddPhotosDto = z.infer<typeof AddPhotosSchema>;

export const AddMemberSchema = z.object({
  email: z.email({ message: "Email invalide" }),
});
export type AddMemberDto = z.infer<typeof AddMemberSchema>;
