import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { SessionService } from '../services/session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);

    if ('socket' in (ctx.getContext()?.req?.extra ?? {})) {
      const token =
        ctx
          .getContext()
          ?.req?.extra?.request?.headers?.cookie?.split('; ')
          ?.find((row) => row.startsWith('token='))
          ?.split('=')[1] ?? null;

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const session = await this.sessionService.verify(token);
      if (!session) {
        throw new UnauthorizedException('Invalid token');
      }

      ctx.getContext().req.user = session.user;
      return true;
    }

    // Regular HTTP request
    const { req } = ctx.getContext();
    const token =
      req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const session = await this.sessionService.verify(token);
    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }

    req.user = session.user;
    return true;
  }
}
