import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { CustomLogger } from './logger.service.js';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(
    private readonly logger: CustomLogger,
    protected readonly httpAdapterHost: HttpAdapterHost,
  ) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const { httpAdapter } = this.httpAdapterHost;
      const ctx = host.switchToHttp();
      const request = ctx.getRequest();

      if (!request) {
        this.logger.error(
          'API Error',
          exception instanceof Error ? exception.stack : '',
          'ExceptionFilter',
        );
        throw exception;
      }

      const httpStatus =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : '',
        'ExceptionFilter',
      );

      const responseBody = {
        statusCode: httpStatus,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(request),
      };

      httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    } else {
      // GraphQL handling
      this.logger.error(
        'GraphQL Error',
        exception instanceof Error ? exception.stack : '',
        'ExceptionFilter',
      );
      // Let GraphQL handle the error response
      if (exception instanceof Error) {
        throw exception;
      }
    }
  }
}
