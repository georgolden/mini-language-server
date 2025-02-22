import { Module } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { MembersResolver } from './members.resolver.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [MembersService, MembersResolver],
  exports: [MembersService],
})
export class MembersModule {}
