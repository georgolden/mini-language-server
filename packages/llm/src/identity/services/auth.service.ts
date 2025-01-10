import { Injectable } from '@nestjs/common';
import { OAuthService } from './oauth.service.js';
import { SessionService } from './session.service.js';
import { UserService } from './user.service.js';
import { Context } from '../types/context.types.js';
import {
  hashPassword,
  verifyPassword,
  generateRandomString,
  generatePermalink,
} from '../utils/crypto.js';
import { COOKIE_MAX_AGE, SECURE_COOKIE } from '../config/identity.config.js';

@Injectable()
export class AuthService {
  constructor(
    private oauthService: OAuthService,
    private sessionService: SessionService,
    private userService: UserService,
  ) {}

  getGoogleAuthURL() {
    return this.oauthService.getGoogleAuthURL();
  }

  async githubAuth(input: { code: string }, context: Context) {
    const githubUser = await this.oauthService.getGitHubUser(input.code);
    let user = await this.userService.findOne({
      githubId: String(githubUser.id),
    });

    if (user) {
      user = await this.userService.updateById(user.id, {
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        email: githubUser.email || user.email,
        permalink: generatePermalink(githubUser.name || githubUser.login),
      });
    } else {
      user = await this.userService.create({
        githubId: String(githubUser.id),
        name: githubUser.name || githubUser.login,
        email: githubUser.email,
        avatar: githubUser.avatar_url,
        active: true,
        role: 'USER',
        permalink: generatePermalink(githubUser.name || githubUser.login),
        emailVerificationToken: generateRandomString(32),
      });
    }

    const token = await this.sessionService.create({
      ip: context.req.ip,
      userAgent: context.req.headers['user-agent'],
      user,
    });

    context.res.cookie('token', token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: SECURE_COOKIE,
    });

    return user;
  }

  async googleAuth(input: { code: string }, context: Context) {
    const googleUser = await this.oauthService.getGoogleUser(input.code);
    let user = await this.userService.findOne({
      googleId: String(googleUser.id),
    });

    if (user) {
      user = await this.userService.updateById(user.id, {
        name: `${googleUser.given_name} ${googleUser.family_name}`,
        avatar: googleUser.picture,
        email: googleUser.email || user.email,
        permalink: generatePermalink(
          `${googleUser.given_name} ${googleUser.family_name}`,
        ),
      });
    } else {
      user = await this.userService.create({
        googleId: String(googleUser.id),
        name: `${googleUser.given_name} ${googleUser.family_name}`,
        email: googleUser.email,
        avatar: googleUser.picture,
        active: true,
        role: 'USER',
        permalink: generatePermalink(
          `${googleUser.given_name} ${googleUser.family_name}`,
        ),
        emailVerificationToken: generateRandomString(32),
      });
    }

    const token = await this.sessionService.create({
      ip: context.req.ip,
      userAgent: context.req.headers['user-agent'],
      user,
    });

    context.res.cookie('token', token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: SECURE_COOKIE,
    });

    return user;
  }

  async localAuth(email: string, password: string, context: Context) {
    const user = await this.userService.findOne({ email });

    if (!user?.password) {
      throw new Error('Invalid credentials');
    }

    const isValid = await verifyPassword(user.password, password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = await this.sessionService.create({
      ip: context.req.ip,
      userAgent: context.req.headers['user-agent'],
      user,
    });

    context.res.cookie('token', token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: SECURE_COOKIE,
    });

    return user;
  }

  async register(input: { email: string; password: string; name: string }) {
    const hashedPassword = await hashPassword(input.password);

    return this.userService.create({
      email: input.email,
      password: hashedPassword,
      name: input.name,
      permalink: generatePermalink(input.name),
      emailVerificationToken: generateRandomString(32),
      active: false,
      role: 'USER',
    });
  }

  async logout(context: Context) {
    context.res.clearCookie('token');
    return null;
  }
}
