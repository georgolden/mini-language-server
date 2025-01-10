import { Injectable } from '@nestjs/common';
import jsonwebtoken from 'jsonwebtoken';
import { SIGNING_KEY } from '../config/identity.config.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionJwtPayload } from '../types/jwt.types.js';
import { generateRandomString } from '../utils/crypto.js';
import { User } from '../dto/user.types.js';

console.log(jsonwebtoken);

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

    return jsonwebtoken.sign({ user: input.user, sessionId: session.id }, SIGNING_KEY, {
      expiresIn: '1y',
    });
  }

  async verify(token: string) {
    try {
      const decoded = jsonwebtoken.verify(token, SIGNING_KEY) as SessionJwtPayload;
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
