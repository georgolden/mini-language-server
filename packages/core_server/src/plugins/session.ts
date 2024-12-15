import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'

async function session(fastify: FastifyInstance) {
  await fastify.register(fastifyCookie)
  await fastify.register(fastifySession, {
    secret: fastify.config.SESSION_SECRET,
    cookie: {
      secure: process.env['NODE_ENV'] === 'production'
    }
  })
}

export const sessionPlugin = fp(session)
