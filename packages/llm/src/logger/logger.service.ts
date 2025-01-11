import { Injectable, LoggerService, Optional, Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common';

interface LogObject {
  message: string;
  [key: string]: unknown;
}

@Injectable()
export class CustomLogger extends Logger implements LoggerService {
  constructor(private defaultContext = 'Application') {
    super();
  }

  setContext(context: string) {
    this.defaultContext = context;
  }

  log(
    message: string | LogObject,
    context: string = this.defaultContext,
  ): void {
    const logObject = typeof message === 'string' ? { message } : message;

    super.log(logObject, context);
  }

  error(
    message: string | LogObject,
    trace?: string,
    context: string = this.defaultContext,
  ): void {
    const logObject = typeof message === 'string' ? { message } : message;

    super.error(logObject, trace, context);
  }

  warn(
    message: string | LogObject,
    context: string = this.defaultContext,
  ): void {
    const logObject = typeof message === 'string' ? { message } : message;

    super.warn(logObject, context);
  }
}