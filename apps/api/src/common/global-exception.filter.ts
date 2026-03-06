import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@repo/shared';
import { ZodValidationException } from 'nestjs-zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // 1. On prépare la réponse par défaut
    let errorResponse = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Une erreur imprévue est survenue.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: [] as any[],
    };

    // 2. On affine selon le type d'erreur
    if (exception instanceof ZodValidationException) {
      const zodResponse = exception.getResponse() as any;
      errorResponse = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Erreur de validation des données',
        statusCode: HttpStatus.BAD_REQUEST,
        details: zodResponse.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    } else if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      errorResponse = {
        code: res.code || 'HTTP_ERROR',
        message: res.message || (typeof res === 'string' ? res : res.message),
        statusCode: exception.getStatus(),
        details: res.details || [],
      };
    } else {
      console.error('CRITICAL ERROR : ', exception);
    }

    // 4. Envoi de la réponse.
    response.status(errorResponse.statusCode).json(errorResponse);
  }
}
