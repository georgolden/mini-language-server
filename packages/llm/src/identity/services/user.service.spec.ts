import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserService } from './user.service.js';
import { User } from '../dto/user.types.js';
import { Role } from '@prisma/client';

describe('UserService', () => {
  let userService: UserService;
  let prismaService: PrismaService;

  const mockUser: User = {
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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn().mockResolvedValue(mockUser),
              update: jest.fn().mockResolvedValue(mockUser),
              findMany: jest.fn().mockResolvedValue([mockUser]),
              findFirst: jest.fn().mockResolvedValue(mockUser),
              findUnique: jest.fn().mockResolvedValue(mockUser),
            },
          },
        },
      ],
    }).compile();

    userService = moduleRef.get<UserService>(UserService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        permalink: 'test-user',
      };

      const result = await userService.create(userData);
      expect(result).toEqual(mockUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });
    });
  });

  describe('updateById', () => {
    it('should update user by id', async () => {
      const updateData = { name: 'Updated Name' };
      const result = await userService.updateById(1, updateData);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      const result = await userService.findAll();

      expect(result).toEqual([mockUser]);
      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should find user by criteria', async () => {
      const criteria = { email: 'test@example.com' };
      const result = await userService.findOne(criteria);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: criteria,
      });
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const result = await userService.findById(1);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('findByPermalink', () => {
    it('should find user by permalink', async () => {
      const result = await userService.findByPermalink('test-user');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { permalink: 'test-user' },
      });
    });
  });
});
