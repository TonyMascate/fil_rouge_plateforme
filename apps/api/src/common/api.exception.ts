import { HttpException } from '@nestjs/common';
import { ApiErrorResponse, ErrorCode } from '@repo/shared';

export class ApiException extends HttpException {
  constructor(code: ErrorCode, status: number, message: string, details: any[]) {
    const response: ApiErrorResponse = {
      code,
      message,
      statusCode: status,
      details,
    };
    super(response, status);
  }
}
