import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export interface MemberDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AlbumResponseDto {
  id: string;
  name: string;
  photoCount: number;
  covers: string[];
  isOwner: boolean;
  ownerId: string;
  members: MemberDto[];
  createdAt: Date;
  updatedAt: Date;
}

export const CreateAlbumSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export class CreateAlbumDto extends createZodDto(CreateAlbumSchema) {}

export const UpdateAlbumSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export class UpdateAlbumDto extends createZodDto(UpdateAlbumSchema) {}

export const AddPhotosSchema = z.object({
  photoIds: z.array(z.uuid()).min(1).max(200),
});
export class AddPhotosDto extends createZodDto(AddPhotosSchema) {}

export const AddMemberSchema = z.object({
  email: z.string().trim().email(),
});
export class AddMemberDto extends createZodDto(AddMemberSchema) {}
