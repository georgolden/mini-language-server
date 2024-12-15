import { FastifyInstance } from 'fastify'
import fastifyEnv from '@fastify/env'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      PORT: number
      HOST: string
      GOOGLE_CLIENT_ID: string
      GOOGLE_CLIENT_SECRET: string
      GITHUB_CLIENT_ID: string
      GITHUB_CLIENT_SECRET: string
      SESSION_SECRET: string
    }
  }
}

const schema = {
  type: 'object',
  required: ['PORT', 'HOST', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET'],
  properties: {
    PORT: { type: 'number', default: 3000 },
    HOST: { type: 'string', default: '0.0.0.0' },
    GOOGLE_CLIENT_ID: { type: 'string' },
    GOOGLE_CLIENT_SECRET: { type: 'string' },
    GITHUB_CLIENT_ID: { type: 'string' },
    GITHUB_CLIENT_SECRET: { type: 'string' },
    SESSION_SECRET: { type: 'string' }
  }
}

export async function configPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true
  })
}
