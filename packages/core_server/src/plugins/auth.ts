import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyOauth2, { FastifyOAuth2Options } from '@fastify/oauth2';
import { randomBytes } from 'node:crypto';

async function auth(fastify: FastifyInstance) {
  // Google OAuth2
  const googleOAuthConfig: FastifyOAuth2Options = {
    name: 'googleOAuth2',
    scope: ['email', 'profile'],
    credentials: {
      client: {
        id: fastify.config.GOOGLE_CLIENT_ID,
        secret: fastify.config.GOOGLE_CLIENT_SECRET,
      },
      auth: {
        tokenHost: 'https://oauth2.googleapis.com',
        tokenPath: '/token',
        authorizePath: 'https://accounts.google.com/o/oauth2/v2/auth',
      },
    },
    startRedirectPath: '/login/google',
    callbackUri: 'http://localhost:3000/login/google/callback',
    generateStateFunction: function (this: FastifyInstance, request: FastifyRequest): string {
      return randomBytes(10).toString('hex');
    },
    checkStateFunction: function (this: FastifyInstance, request: FastifyRequest): boolean {
      return true;
    },
  };
  await fastify.register(fastifyOauth2, googleOAuthConfig);

  // GitHub OAuth2
  await fastify.register(fastifyOauth2, {
    name: 'githubOAuth2',
    scope: ['user:email'],
    credentials: {
      client: {
        id: fastify.config.GITHUB_CLIENT_ID,
        secret: fastify.config.GITHUB_CLIENT_SECRET,
      },
      auth: {
        tokenHost: 'https://github.com',
        authorizePath: '/login/oauth/authorize',
        tokenPath: '/login/oauth/access_token',
      },
    },
    startRedirectPath: '/login/github',
    callbackUri: 'http://localhost:3000/login/github/callback',
  } satisfies FastifyOAuth2Options);
}

export const authPlugin = fp(auth);
