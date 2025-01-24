import { Module } from '@nestjs/common';
import { AgentService } from './agent.service.js';
import { LoggerModule } from '../logger/logger.module.js';

@Module({
  imports: [LoggerModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
