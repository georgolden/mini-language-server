import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GoogleUserInfo, GitHubUserInfo, GitHubEmail } from '../types/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              authenticated: { type: 'boolean' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  provider: { type: 'string', enum: ['google', 'github'] },
                  accessToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest) => {
      const user = request.session.user;
      if (user) {
        return { authenticated: true, user };
      }
      return { authenticated: false };
    },
  );

  fastify.get('/login/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });
      const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

      request.session.user = {
        id: userInfo.id,
        email: userInfo.email,
        provider: 'google',
        accessToken: token.access_token,
      };

      return reply.redirect('/');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  fastify.get('/login/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = await fastify.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const userInfoResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const userInfo = (await userInfoResponse.json()) as GitHubUserInfo;

      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const emails = (await emailResponse.json()) as GitHubEmail[];
      const primaryEmail = emails.find((email) => email.primary)?.email;

      if (!primaryEmail) {
        throw new Error('No primary email found');
      }

      request.session.user = {
        id: userInfo.id.toString(),
        email: primaryEmail,
        provider: 'github',
        accessToken: token.access_token,
      };

      return reply.redirect('/');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  fastify.post(
    '/logout',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              logged_out: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest) => {
      request.session.destroy();
      return { logged_out: true };
    },
  );
}
