import { Global, Module } from '@nestjs/common';
import { CustomLogger } from './logger.service.js';

@Global()
@Module({
  providers: [CustomLogger],
  exports: [CustomLogger],
})
export class LoggerModule {}
