import Fastify from 'fastify'
import fp from 'fastify-plugin'
import { configPlugin } from './plugins/config.js'
import { corsPlugin } from './plugins/cors.js'
import { sessionPlugin } from './plugins/session.js'
import { authPlugin } from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'

async function buildServer() {
  const fastify = Fastify({
    logger: true
  })

  // Register config first and wrap it with fastify-plugin to ensure it's loaded
  await fastify.register(fp(configPlugin))
  
  // Now register other plugins that depend on config
  await fastify.register(corsPlugin)
  await fastify.register(sessionPlugin)
  await fastify.register(authPlugin)

  // Register routes last
  await fastify.register(authRoutes)

  return fastify
}

async function start() {
  try {
    const server = await buildServer()
    await server.listen({
      port: server.config.PORT,
      host: server.config.HOST
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()
