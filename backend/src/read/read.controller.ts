import { Body, Controller, Get, Header, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { RouteConfig } from '@nestjs/platform-fastify'
import type { FastifyRequest } from 'fastify'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { ReadService } from './read.service'

@Controller('read')
export class ReadController {
  constructor(private readonly read: ReadService) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  config() { return this.read.config() }

  // The guard stops other sites from using this server as a fetch proxy through a visitor's browser.
  @Post('extract')
  @HttpCode(200)
  @RouteConfig({ bodyLimit: 4096 })
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @UseGuards(TrustedWriteGuard)
  extract(@Body() body: unknown, @Req() request: FastifyRequest) { return this.read.extract(body, request.ip) }
}
