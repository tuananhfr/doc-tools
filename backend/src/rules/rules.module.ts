import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { RulesController } from './rules.controller'
import { RulesRepository } from './rules.repository'
import { RulesService } from './rules.service'

@Module({ imports: [DatabaseModule], controllers: [RulesController], providers: [RulesRepository, RulesService] })
export class RulesModule {}
