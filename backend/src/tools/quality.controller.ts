import { BadRequestException, Body, Controller, Header, HttpCode, Post, Req } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { qualityInput } from './quality-input'
import { QualityService } from './quality.service'

@Controller('tools/quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  record(@Body() body: unknown, @Req() request: FastifyRequest) {
    const event = qualityInput(body)
    if (!event) throw new BadRequestException({ ok: false, message: 'Invalid aggregate quality event.' })
    return this.quality.record(event, request.ip)
  }
}
