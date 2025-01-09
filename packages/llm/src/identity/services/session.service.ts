import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { SIGNING_KEY } from '../config/identity.config';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionJwtPayload } from '../types/jwt.types';
import { generateRandomString } from '../utils/crypto';
import { User } from '../dto/user.types';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async create(input: { ip?: string; userAgent?: string; user: User }) {
    const session = await this.prisma.session.create({
      data: {
        ip: input.ip,
        userAgent: input.userAgent,
        user: { connect: { id: input.user.id } },
        token: generateRandomString(32),
      },
    });

    return sign({ user: input.user, sessionId: session.id }, SIGNING_KEY, {
      expiresIn: '1y',
    });
  }

  async verify(token: string) {
    try {
      const decoded = verify(token, SIGNING_KEY) as SessionJwtPayload;
      const session = await this.prisma.session.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      return session ? decoded : null;
    } catch (e) {
      return null;
    }
  }
}
