import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext, GqlContextType } from '@nestjs/graphql';
import { AuthGuard } from './auth.guard.js';
import { SessionService } from '../services/session.service.js';
import { Test } from '@nestjs/testing';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let sessionService: SessionService;

  const mockGqlContext = {
    getContext: () => ({
      req: {
        cookies: {
          token: 'valid-token',
        },
      },
    }),
  } as GqlExecutionContext;

  const createMockExecutionContext = (): ExecutionContext => {
    const context = new ExecutionContextHost([]);
    context.setType<GqlContextType>('graphql');
    return context;
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: SessionService,
          useValue: {
            verify: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    guard = moduleRef.get<AuthGuard>(AuthGuard);
    sessionService = moduleRef.get<SessionService>(SessionService);
  });

  it('should allow access with valid token', async () => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlContext);

    const result = await guard.canActivate(createMockExecutionContext());
    expect(result).toBe(true);
    expect(sessionService.verify).toHaveBeenCalledWith('valid-token');
  });

  it('should deny access with invalid token', async () => {
    jest.spyOn(sessionService, 'verify').mockResolvedValue(null);
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue(mockGqlContext);

    const result = await guard.canActivate(createMockExecutionContext());
    expect(result).toBe(false);
  });

  it('should deny access with no token', async () => {
    const mockGqlContextNoToken = {
      getContext: () => ({
        req: {
          cookies: {},
        },
      }),
    } as GqlExecutionContext;

    jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue(mockGqlContextNoToken);

    const result = await guard.canActivate(createMockExecutionContext());
    expect(result).toBe(false);
  });
});
