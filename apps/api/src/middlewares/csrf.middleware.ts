import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let token = req.headers['XSRF-TOKEN'];

    if (!token) {
      token = crypto.randomBytes(32).toString('hex');

      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
  }
}
