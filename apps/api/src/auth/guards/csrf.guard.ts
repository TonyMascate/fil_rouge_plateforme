import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSkipped = this.reflector.getAllAndOverride<boolean>('skipCsrf', [context.getHandler(), context.getClass()]);
    if (isSkipped) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'OPTIONS', 'HEAD'].includes(request.method)) {
      return true;
    }

    const secretHeader = request.headers['x-xsrf-token'];
    const secretCookie = request.cookies['XSRF-TOKEN'];

    if (!secretCookie || !secretHeader || secretCookie !== secretHeader) {
      throw new UnauthorizedException('CSRF token invalide');
    }
    return true;
  }
}
