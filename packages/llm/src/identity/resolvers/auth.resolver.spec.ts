import { Test } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver.js';
import { AuthService } from '../services/auth.service.js';
import { Role } from '@prisma/client';
import { Context } from '../types/context.types.js';

describe('AuthResolver', () => {
  let authResolver: AuthResolver;
  let authService: AuthService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    permalink: 'test-user',
    active: true,
    role: Role.USER,
    createdAt: new Date(),
    githubId: null,
    googleId: null,
    avatar: null,
    bio: null,
  };

  const mockContext: Context = {
    req: {
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    },
    res: {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    },
  } as unknown as Context;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: {
            getGoogleAuthURL: jest
              .fn()
              .mockReturnValue('http://google.auth.url'),
            googleAuth: jest.fn().mockResolvedValue(mockUser),
            githubAuth: jest.fn().mockResolvedValue(mockUser),
            localAuth: jest.fn().mockResolvedValue(mockUser),
            register: jest.fn().mockResolvedValue(mockUser),
            logout: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    authResolver = moduleRef.get<AuthResolver>(AuthResolver);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  describe('Queries', () => {
    it('should get Google auth URL', () => {
      const url = authResolver.getGoogleAuthURL();
      expect(url).toBe('http://google.auth.url');
      expect(authService.getGoogleAuthURL).toHaveBeenCalled();
    });

    it('should handle Google auth', async () => {
      const result = await authResolver.googleAuth(
        { code: 'test-code' },
        mockContext,
      );
      expect(result).toEqual(mockUser);
      expect(authService.googleAuth).toHaveBeenCalledWith(
        { code: 'test-code' },
        mockContext,
      );
    });

    it('should handle GitHub auth', async () => {
      const result = await authResolver.githubAuth(
        { code: 'test-code' },
        mockContext,
      );
      expect(result).toEqual(mockUser);
      expect(authService.githubAuth).toHaveBeenCalledWith(
        { code: 'test-code' },
        mockContext,
      );
    });
  });

  describe('Mutations', () => {
    it('should handle sign in', async () => {
      const result = await authResolver.signIn(
        'test@example.com',
        'password',
        mockContext,
      );
      expect(result).toEqual(mockUser);
      expect(authService.localAuth).toHaveBeenCalledWith(
        'test@example.com',
        'password',
        mockContext,
      );
    });

    it('should handle sign up', async () => {
      const result = await authResolver.signUp(
        'test@example.com',
        'password',
        'Test User',
      );
      expect(result).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      });
    });

    it('should handle logout', async () => {
      const result = await authResolver.logout(mockContext);
      expect(result).toBe(true);
      expect(authService.logout).toHaveBeenCalledWith(mockContext);
    });
  });
});
