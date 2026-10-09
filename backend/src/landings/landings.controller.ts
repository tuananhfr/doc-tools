import { Controller, Get, Header, Param, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { LandingsService } from './landings.service'

/** Read by the frontend server when it renders a host site's intro page; only published pages answer. */
@Controller('landings')
export class LandingsController {
  constructor(private readonly landings: LandingsService) {}

  @Get('assets/:id')
  async asset(@Param('id') id: string, @Res() reply: FastifyReply) {
    const opened = await this.landings.openAsset(id)
    if (!opened) return reply.code(404).header('cache-control', 'no-store').send({ ok: false, code: 'NOT_FOUND' })
    return reply.headers({
      'content-type': opened.asset.mimeType, 'content-length': String(opened.asset.size), 'x-content-type-options': 'nosniff',
      // The id is the hash of the bytes, so the content behind a URL never changes.
      'cache-control': 'public, max-age=31536000, immutable',
      // Host sites on other domains show these pictures.
      'cross-origin-resource-policy': 'cross-origin',
    }).send(opened.stream)
  }

  @Get(':key')
  @Header('Cache-Control', 'no-store')
  published(@Param('key') key: string) { return this.landings.published(key) }
}
