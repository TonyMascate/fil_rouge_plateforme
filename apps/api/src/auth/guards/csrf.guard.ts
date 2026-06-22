import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
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

    // 403 et non 401 : un échec CSRF n'est pas une session expirée. Renvoyer 401
    // pousserait le client à tenter un refresh de token inutile (et déclencherait
    // la cascade refresh → rotation cookies → nouveaux échecs CSRF).
    if (!secretCookie || !secretHeader || secretCookie !== secretHeader) {
      throw new ForbiddenException('CSRF token invalide');
    }
    return true;
  }
}
