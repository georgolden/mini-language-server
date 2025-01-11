import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CustomLogger } from '../logger/logger.service.js';

type GetEvents<T> = T extends Array<Prisma.LogLevel | Prisma.LogDefinition>
  ?
      | Prisma.GetLogType<T[0]>
      | Prisma.GetLogType<T[1]>
      | Prisma.GetLogType<T[2]>
      | Prisma.GetLogType<T[3]>
  : never;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: CustomLogger) {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
        { level: 'error', emit: 'stdout' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    type ExtendedPrismaClient = PrismaClient & {
      $on(
        event: GetEvents<(typeof this.$options)['log']>,
        callback: (event: Prisma.QueryEvent) => void,
      ): void;
    };

    (this as ExtendedPrismaClient).$on('query', (event: Prisma.QueryEvent) => {
      this.logger.log({
        message: 'Prisma Query',
        query: event.query,
        params: event.params,
        duration: event.duration,
        target: event.target,
        timestamp: event.timestamp,
      });
    });

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
