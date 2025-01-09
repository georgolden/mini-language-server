import { Test } from '@nestjs/testing';
import { UserResolver } from './user.resolver';
import { UserService } from '../services/user.service';
import { Role } from '@prisma/client';
import { Context } from '../types/context.types';
import { AuthGuard } from '../guards/auth.guard';
import { SessionService } from '../services/session.service';

describe('UserResolver', () => {
  let userResolver: UserResolver;
  let userService: UserService;

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
      user: { id: 1, role: Role.USER },
    },
  } as Context;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([mockUser]),
            findById: jest.fn().mockResolvedValue(mockUser),
            findByPermalink: jest.fn().mockResolvedValue(mockUser),
            updateById: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: SessionService,
          useValue: {
            verify: jest.fn().mockResolvedValue(true),
          },
        },
        AuthGuard,
      ],
    }).compile();

    userResolver = moduleRef.get<UserResolver>(UserResolver);
    userService = moduleRef.get<UserService>(UserService);
  });

  describe('Queries', () => {
    it('should get all users', async () => {
      const result = await userResolver.users();
      expect(result).toEqual([mockUser]);
      expect(userService.findAll).toHaveBeenCalled();
    });

    it('should get current user', async () => {
      const result = await userResolver.me(mockContext);
      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(1);
    });

    it('should return null when no current user', async () => {
      const result = await userResolver.me({ req: {} } as Context);
      expect(result).toBeNull();
    });

    it('should get user by permalink', async () => {
      const result = await userResolver.user({ userPermalink: 'test-user' });
      expect(result).toEqual(mockUser);
      expect(userService.findByPermalink).toHaveBeenCalledWith('test-user');
    });
  });

  describe('Mutations', () => {
    it('should update user', async () => {
      const updateInput = { name: 'Updated Name', bio: 'New bio' };
      const result = await userResolver.updateUser(updateInput, mockContext);
      expect(result).toEqual(mockUser);
      expect(userService.updateById).toHaveBeenCalledWith(1, updateInput);
    });
  });
});
