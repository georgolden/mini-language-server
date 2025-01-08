import { middleware } from '../trpc.js';
import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `${process.env['AUTH0_DOMAIN']}/.well-known/jwks.json`
});

export const isAuthed = middleware(async ({ ctx, next }) => {
  const token = ctx.req?.headers?.authorization?.split(' ')[1];
  
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const verifiedToken = await new Promise((resolve, reject) => {
    jwt.verify(
      token,
      (header, callback) => {
        client.getSigningKey(header.kid, (err, key) => {
          callback(null, key?.getPublicKey());
        });
      },
      {
        algorithms: ['RS256'],
        audience: process.env['AUTH0_AUDIENCE'],
        issuer: process.env['AUTH0_DOMAIN']
      },
      (err, decoded) => {
        if (err) reject(err);
        resolve(decoded);
      }
    );
  });

  return next({
    ctx: {
      ...ctx,
      user: verifiedToken
    }
  });
});