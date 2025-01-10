import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { SessionService } from '../services/session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    const token = req.cookies.token;

    if (!token) {
      return false;
    }

    const session = await this.sessionService.verify(token);
    return !!session;
  }
}
