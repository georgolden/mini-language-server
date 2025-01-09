import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { SessionService } from './session.service';
import { UserService } from './user.service';
import { Role, User as PrismaUser } from '@prisma/client';
import { GitHubUser, GoogleUser } from '../types/oauth.types';
import { User as GraphQLUser } from '../dto/user.types';
import { Context } from '../types/context.types';
import { hashPassword } from '../utils/crypto';

describe('AuthService', () => {
  let authService: AuthService;
  let oauthService: OAuthService;
  let sessionService: SessionService;
  let userService: UserService;

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

  // Service layer mock (Prisma User)
  const mockPrismaUser: PrismaUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    permalink: 'test-user',
    password: 'hashed_password',
    active: true,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    githubId: null,
    googleId: null,
    avatar: null,
    bio: null,
    emailVerificationToken: 'verification-token',
  };

  // Response expectation mock (GraphQL User)
  const mockGraphQLUser: GraphQLUser = {
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

  const mockGitHubUser: GitHubUser = {
    id: 123,
    name: 'GitHub User',
    login: 'githubuser',
    email: 'github@example.com',
    avatar_url: 'http://avatar.url',
    // ... rest of required GitHubUser properties
  } as GitHubUser;

  const mockGoogleUser: GoogleUser = {
    id: '456',
    given_name: 'Google',
    family_name: 'User',
    email: 'google@example.com',
    picture: 'http://picture.url',
    verified_email: true,
    name: 'Google User',
    locale: 'en',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: OAuthService,
          useValue: {
            getGoogleAuthURL: jest
              .fn()
              .mockReturnValue('http://google.auth.url'),
            getGitHubUser: jest.fn().mockResolvedValue(mockGitHubUser),
            getGoogleUser: jest.fn().mockResolvedValue(mockGoogleUser),
          },
        },
        {
          provide: SessionService,
          useValue: {
            create: jest.fn().mockResolvedValue('session-token'),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockPrismaUser),
            create: jest.fn().mockResolvedValue(mockPrismaUser),
            updateById: jest.fn().mockResolvedValue(mockPrismaUser),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    oauthService = moduleRef.get<OAuthService>(OAuthService);
    sessionService = moduleRef.get<SessionService>(SessionService);
    userService = moduleRef.get<UserService>(UserService);
  });

  describe('getGoogleAuthURL', () => {
    it('should return Google auth URL', () => {
      const url = authService.getGoogleAuthURL();
      expect(url).toBe('http://google.auth.url');
    });
  });

  describe('githubAuth', () => {
    it('should authenticate existing GitHub user', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockPrismaUser);

      const result = await authService.githubAuth(
        { code: 'test-code' },
        mockContext,
      );

      // Compare only the fields that exist in GraphQLUser
      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
      expect(mockContext.res.cookie).toHaveBeenCalledWith(
        'token',
        'session-token',
        expect.any(Object),
      );
    });

    it('should create new GitHub user if not exists', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      const result = await authService.githubAuth(
        { code: 'test-code' },
        mockContext,
      );

      expect(userService.create).toHaveBeenCalled();
      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
    });
  });

  describe('googleAuth', () => {
    it('should authenticate existing Google user', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockPrismaUser);

      const result = await authService.googleAuth(
        { code: 'test-code' },
        mockContext,
      );

      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
      expect(mockContext.res.cookie).toHaveBeenCalled();
    });

    it('should create new Google user if not exists', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      const result = await authService.googleAuth(
        { code: 'test-code' },
        mockContext,
      );

      expect(userService.create).toHaveBeenCalled();
      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
    });
  });

  describe('localAuth', () => {
    it('should authenticate local user with valid credentials', async () => {
      const mockUserWithPassword = {
        ...mockPrismaUser,
        password: await hashPassword('password'),
      };
      jest
        .spyOn(userService, 'findOne')
        .mockResolvedValue(mockUserWithPassword);

      const result = await authService.localAuth(
        'test@example.com',
        'password',
        mockContext,
      );

      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
      expect(mockContext.res.cookie).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      await expect(
        authService.localAuth('wrong@example.com', 'wrong', mockContext),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const registerInput = {
        email: 'new@example.com',
        password: 'password',
        name: 'New User',
      };

      const result = await authService.register(registerInput);

      expect({
        id: result.id,
        email: result.email,
        name: result.name,
        permalink: result.permalink,
        active: result.active,
        role: result.role,
        createdAt: result.createdAt,
        githubId: result.githubId,
        googleId: result.googleId,
        avatar: result.avatar,
        bio: result.bio,
      }).toEqual(mockGraphQLUser);
      expect(userService.create).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear auth cookie', async () => {
      await authService.logout(mockContext);

      expect(mockContext.res.clearCookie).toHaveBeenCalledWith('token');
    });
  });
});
