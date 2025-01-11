import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLogger } from './logger.service.js';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: CustomLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log({
      message: `Incoming ${req.method} ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  }
}
