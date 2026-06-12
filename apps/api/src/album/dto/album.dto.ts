import { createZodDto } from 'nestjs-zod';
import { CreateAlbumSchema, UpdateAlbumSchema, AddPhotosSchema, AddMemberSchema } from '@repo/shared';

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

export { CreateAlbumSchema, UpdateAlbumSchema, AddPhotosSchema, AddMemberSchema };

export class CreateAlbumDto extends createZodDto(CreateAlbumSchema) {}
export class UpdateAlbumDto extends createZodDto(UpdateAlbumSchema) {}
export class AddPhotosDto extends createZodDto(AddPhotosSchema) {}
export class AddMemberDto extends createZodDto(AddMemberSchema) {}
