import { ErrorCode, ValidationErrorDetail } from '@repo/shared';
import { ApiException } from './api.exception';
import { HttpStatus } from '@nestjs/common';

export class ApiValidationException extends ApiException {
  constructor(details: ValidationErrorDetail[]) {
    super(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Erreur de validation des données', details);
  }
}

