import { Test } from '@nestjs/testing';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { CustomLogger } from './logger.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: CustomLogger;
  let httpAdapterHost: HttpAdapterHost;

  const mockHttpAdapter = {
    reply: jest.fn(),
    getRequestUrl: jest.fn().mockReturnValue('/test'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CustomLogger,
          useValue: {
            error: jest.fn(),
          },
        },
        {
          provide: HttpAdapterHost,
          useValue: {
            httpAdapter: mockHttpAdapter,
          },
        },
      ],
    }).compile();

    logger = module.get<CustomLogger>(CustomLogger);
    httpAdapterHost = module.get<HttpAdapterHost>(HttpAdapterHost);
    filter = new AllExceptionsFilter(logger, httpAdapterHost);
  });

  it('should log HTTP exceptions with status and stack trace', () => {
    const httpException = new HttpException(
      'Test error',
      HttpStatus.BAD_REQUEST,
    );
    const mockRequest = {
      method: 'GET',
      url: '/test',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getType: () => 'http',
      getArgs: () => [mockRequest, {}],
      getArgByIndex: (index: number) => [mockRequest, {}][index],
    } as ArgumentsHost;

    filter.catch(httpException, mockContext);

    expect(logger.error).toHaveBeenCalledWith(
      'GET /test',
      expect.any(String),
      'ExceptionFilter',
    );
    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      {},
      {
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String),
        path: '/test',
      },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('should log non-HTTP exceptions as internal server errors', () => {
    const error = new Error('Test error');
    const mockRequest = {
      method: 'POST',
      url: '/test',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getType: () => 'http',
      getArgs: () => [mockRequest, {}],
      getArgByIndex: (index: number) => [mockRequest, {}][index],
    } as ArgumentsHost;

    filter.catch(error, mockContext);

    expect(logger.error).toHaveBeenCalledWith(
      'POST /test',
      expect.any(String),
      'ExceptionFilter',
    );
    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      {},
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        path: '/test',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });
});
