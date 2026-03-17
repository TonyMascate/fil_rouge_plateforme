import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    let token = req.headers['XSRF-TOKEN'];

    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      const isProduction = this.configService.get('NODE_ENV') === 'production';

      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        ...(isProduction && { domain: this.configService.get('COOKIE_DOMAIN') }),
      });
    }
    next();
  }
}
