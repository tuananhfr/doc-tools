import { BadRequestException, Controller, Get, Header, Param } from '@nestjs/common'
import { RulesService } from './rules.service'

@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}
  @Get(':kind')
  @Header('Cache-Control', 'no-store')
  active(@Param('kind') kind: string) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(kind)) throw new BadRequestException({ ok: false, message: 'Loại quy tắc không hợp lệ.' })
    return this.rules.active(kind)
  }
}
