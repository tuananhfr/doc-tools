import { FastifyAdapter } from '@nestjs/platform-fastify'

export function createHttpAdapter() {
  const adapter = new FastifyAdapter({ bodyLimit: 1024, trustProxy: 'loopback' })
  const server = adapter.getInstance()
  // Nest's @RouteConfig stores bodyLimit under `config`, where Fastify never reads it: every route
  // stayed capped at the global 1 KiB. Lift it to the route option Fastify actually applies.
  server.addHook('onRoute', (route) => {
    const limit = (route.config as { bodyLimit?: unknown } | undefined)?.bodyLimit
    if (route.bodyLimit === undefined && typeof limit === 'number') route.bodyLimit = limit
  })
  // Drupal decodes the raw body for this public endpoint regardless of its content type.
  server.removeAllContentTypeParsers()
  server.addContentTypeParser(['application/json', 'text/plain', '*'], { parseAs: 'string' }, (_request, body, done) => {
    try { done(null, JSON.parse(body as string)) }
    catch { done(null, null) }
  })
  // AI uploads send the file as-is; every other route still stops at its own small body limit.
  server.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (_request, body, done) => done(null, body))
  return adapter
}
