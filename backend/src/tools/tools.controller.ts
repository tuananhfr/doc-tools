import { BadRequestException, Body, Controller, Get, Header, HttpCode, Post, Req } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { ToolsService } from './tools.service'
@Controller('tools')
export class ToolsController {
  constructor(private readonly tools: ToolsService) {}
  @Post('visits')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async visit(@Body() body: unknown, @Req() request: FastifyRequest) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException({ ok: false, message: 'Body phải là JSON và header Content-Type phải là application/json. Trong Postman: tab Body → chọn "raw" → đổi kiểu sang "JSON" (không dùng form-data).' })
    }
    const tool = (body as { tool?: unknown }).tool
    if (typeof tool !== 'string' || !/^[a-z0-9][a-z0-9-]{0,47}$/.test(tool)) {
      throw new BadRequestException({ ok: false, message: 'Tên công cụ không hợp lệ.', errors: { tool: 'Chỉ gồm a-z, 0-9 và dấu gạch ngang.' } })
    }
    return this.tools.visit(tool, request.ip)
  }
  @Get('stats')
  @Header('Cache-Control', 'no-store')
  stats() { return this.tools.stats() }
}
