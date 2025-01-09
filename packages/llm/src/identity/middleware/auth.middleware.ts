import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { AuthenticatedRequest } from '../types/context.types';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private sessionService: SessionService) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = req.cookies.token;

    if (token) {
      const session = await this.sessionService.verify(token);
      if (session) {
        req.user = session.user;
      }
    }

    next();
  }
}
