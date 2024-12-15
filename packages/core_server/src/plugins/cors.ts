import { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: 'http://localhost:5173',
    credentials: true
  })
}
