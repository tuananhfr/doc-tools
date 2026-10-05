import { FastifyAdapter } from '@nestjs/platform-fastify'

export function createHttpAdapter() {
  const adapter = new FastifyAdapter({ bodyLimit: 1024, trustProxy: 'loopback' })
  const server = adapter.getInstance()
  // Drupal decodes the raw body for this public endpoint regardless of its content type.
  server.removeAllContentTypeParsers()
  server.addContentTypeParser(['application/json', 'text/plain', '*'], { parseAs: 'string' }, (_request, body, done) => {
    try { done(null, JSON.parse(body as string)) }
    catch { done(null, null) }
  })
  return adapter
}
