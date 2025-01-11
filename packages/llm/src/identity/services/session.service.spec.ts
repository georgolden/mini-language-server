import { Test } from '@nestjs/testing';
import { SessionService } from './session.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role, User as PrismaUser } from '@prisma/client';
import { SessionJwtPayload } from '../types/jwt.types.js';
import { CustomLogger } from '../../logger/logger.service.js';

describe('SessionService', () => {
  let sessionService: SessionService;
  let prismaService: PrismaService;
  let logger: CustomLogger;

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

  const mockSession = {
    id: 1,
    token: 'session-token',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    userId: mockPrismaUser.id,
    user: mockPrismaUser,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: PrismaService,
          useValue: {
            session: {
              create: jest.fn().mockResolvedValue(mockSession),
              findUnique: jest.fn().mockResolvedValue(mockSession),
            },
          },
        },
        {
          provide: CustomLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    sessionService = moduleRef.get<SessionService>(SessionService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    logger = moduleRef.get<CustomLogger>(CustomLogger);
  });

  describe('create', () => {
    it('should create a new session and return JWT token', async () => {
      const input = {
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        user: mockPrismaUser,
      };

      const token = await sessionService.create(input);

      expect(prismaService.session.create).toHaveBeenCalledWith({
        data: {
          ip: input.ip,
          userAgent: input.userAgent,
          user: { connect: { id: input.user.id } },
          token: expect.any(String),
        },
      });
      expect(token).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should verify valid JWT token and return payload', async () => {
      const token = await sessionService.create({
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        user: mockPrismaUser,
      });

      const result = await sessionService.verify(token);

      expect(result).toBeDefined();
      expect(result).toMatchObject<Partial<SessionJwtPayload>>({
        sessionId: expect.any(Number),
        user: {
          id: mockPrismaUser.id,
          role: mockPrismaUser.role,
        },
      });
    });

    it('should return null for invalid token', async () => {
      jest.spyOn(prismaService.session, 'findUnique').mockResolvedValue(null);

      const result = await sessionService.verify('invalid-token');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return null for expired token', async () => {
      const result = await sessionService.verify('expired-token');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
