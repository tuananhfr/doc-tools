import { Controller, Get, Header } from '@nestjs/common'
import { TemplatesService } from './templates.service'

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  // Public, read-only, no cookie — mirrors GET /read/config and GET /rules/:kind.
  @Get('config')
  @Header('Cache-Control', 'no-store')
  config() {
    return this.templates.config()
  }
}
