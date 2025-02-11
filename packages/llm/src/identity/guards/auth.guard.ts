import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { SessionService } from '../services/session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private sessionService: SessionService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
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
