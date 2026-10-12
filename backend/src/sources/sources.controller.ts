import { Controller, Get, Header, Param } from '@nestjs/common'
import { SourcesService } from './sources.service'

/** Read by tool pages to show where signed figures come from and when they were last checked. */
@Controller('sources')
export class SourcesController {
  constructor(private readonly sources: SourcesService) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  get(@Param('id') id: string) { return this.sources.publicSource(id) }
}
