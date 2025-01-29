import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatService } from './chat.service.js';
import type { Chat, Message } from './dto/chat.types.js';
import type { ClaudeChain } from '../llm/llms/claude.agent.js';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  const mockChat: Chat = {
    id: 1,
    title: 'Test Chat',
    type: 'group',
    metadata: 'test metadata',
    createdAt: new Date(),
    messages: [],
  };

  const mockMessage: Message = {
    id: 1,
    chatId: 1,
    content: 'Test message',
    role: 'user',
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            chat: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            message: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Agent management', () => {
    it('should store and retrieve agent for chat', () => {
      const mockAgent = {} as ClaudeChain;
      service.setAgent(1, mockAgent);
      expect(service.getAgent(1)).toBe(mockAgent);
    });

    it('should return undefined for non-existent agent', () => {
      expect(service.getAgent(999)).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('returns all chats with messages', async () => {
      const mockChatsWithMessages = [
        { ...mockChat, messages: [mockMessage] },
        { ...mockChat, id: 2, messages: [] },
      ];
      jest.spyOn(prisma.chat, 'findMany').mockResolvedValue(mockChatsWithMessages);
      const result = await service.findAll();
      expect(result).toEqual(mockChatsWithMessages);
    });
  });

  describe('findOne', () => {
    it('returns chat with messages when found', async () => {
      const chatWithMessages = { ...mockChat, messages: [mockMessage] };
      jest.spyOn(prisma.chat, 'findUnique').mockResolvedValue(chatWithMessages);
      const result = await service.findOne(1);
      expect(result).toEqual(chatWithMessages);
    });
  });

  describe('create', () => {
    it('creates chat with valid data', async () => {
      jest.spyOn(prisma.chat, 'create').mockResolvedValue(mockChat);
      const result = await service.create({
        title: 'Test Chat',
        type: 'group',
      });
      expect(result).toEqual(mockChat);
    });
  });

  describe('addMessage', () => {
    it('adds message to chat', async () => {
      jest.spyOn(prisma.message, 'create').mockResolvedValue(mockMessage);
      const result = await service.addMessage(1, {
        content: 'Test message',
        role: 'user',
      });
      expect(result).toEqual(mockMessage);
    });
  });
});
