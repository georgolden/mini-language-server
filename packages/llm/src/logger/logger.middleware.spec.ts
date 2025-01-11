import { Test } from '@nestjs/testing';
import { LoggerMiddleware } from './logger.middleware.js';
import { CustomLogger } from './logger.service.js';
import { Request, Response } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let logger: CustomLogger;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggerMiddleware,
        {
          provide: CustomLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<LoggerMiddleware>(LoggerMiddleware);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  it('should log incoming requests', (done) => {
    const req = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
    } as unknown as Request;

    const res = {} as Response;

    middleware.use(req, res, () => {
      expect(logger.log).toHaveBeenCalledWith({
        message: 'Incoming GET /test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
      done();
    });
  });
});
