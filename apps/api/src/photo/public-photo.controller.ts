import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '@app/common/dto/api-error.dto';
import { PublicPhotoResponseDto } from './dto/photo-response.dto';
import { PhotoService } from './photo.service';

// Pas de JwtAuthGuard : route publique. C'est un GET → le CsrfGuard global le laisse passer.
@ApiTags('Photos')
@Controller('share')
export class PublicPhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Consulter une photo partagée publiquement (sans authentification)' })
  @ApiParam({ name: 'token', type: String })
  @ApiResponse({ status: 200, type: PublicPhotoResponseDto })
  @ApiResponse({ status: 404, description: 'Lien invalide ou partage révoqué', type: ApiErrorDto })
  getPublic(@Param('token') token: string) {
    return this.photoService.getPublicByToken(token);
  }
}
