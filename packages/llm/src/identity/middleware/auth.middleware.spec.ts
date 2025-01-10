import { AuthMiddleware } from './auth.middleware.js';
import { SessionService } from '../services/session.service.js';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types/context.types.js';
import { Response } from 'express';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let sessionService: SessionService;

  const mockSession = {
    user: {
      id: 1,
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthMiddleware,
        {
          provide: SessionService,
          useValue: {
            verify: jest.fn().mockResolvedValue(mockSession),
          },
        },
      ],
    }).compile();

    middleware = moduleRef.get<AuthMiddleware>(AuthMiddleware);
    sessionService = moduleRef.get<SessionService>(SessionService);
  });

  it('should attach user to request when valid token exists', async () => {
    const req = {
      cookies: {
        token: 'valid-token',
      },
    } as unknown as AuthenticatedRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.user).toEqual(mockSession.user);
    expect(sessionService.verify).toHaveBeenCalledWith('valid-token');
    expect(next).toHaveBeenCalled();
  });

  it('should not attach user when token is invalid', async () => {
    jest.spyOn(sessionService, 'verify').mockResolvedValue(null);

    const req = {
      cookies: {
        token: 'invalid-token',
      },
    } as unknown as AuthenticatedRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should not attach user when no token exists', async () => {
    const req = {
      cookies: {},
    } as AuthenticatedRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(req.user).toBeUndefined();
    expect(sessionService.verify).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
