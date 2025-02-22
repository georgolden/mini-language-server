import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMemberInput } from './members.input.js';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async createMember(data: CreateMemberInput) {
    return this.prisma.member.create({
      data: {
        ...data,
        createdAt: new Date(),
      },
    });
  }

  async updateMemberTools(id: string, tools: string[]) {
    return this.prisma.member.update({
      where: { id },
      data: { tools },
    });
  }

  async toggleHistory(id: string, enabled: boolean) {
    return this.prisma.member.update({
      where: { id },
      data: { hasHistoryEnabled: enabled },
    });
  }

  async updateSystemPrompt(id: string, systemPrompt: string) {
    return this.prisma.member.update({
      where: { id },
      data: { systemPrompt },
    });
  }

  async findAll() {
    return this.prisma.member.findMany();
  }

  async findOne(id: string) {
    return this.prisma.member.findUnique({
      where: { id },
    });
  }
}
