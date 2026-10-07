import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { ToolsController } from './tools.controller'
import { ToolsService } from './tools.service'
import { ToolsRepository } from './tools.repository'
import { QualityController } from './quality.controller'
import { QualityService } from './quality.service'
import { QualityRepository } from './quality.repository'
@Module({ imports: [DatabaseModule], controllers: [ToolsController, QualityController], providers: [ToolsService, ToolsRepository, QualityService, QualityRepository] })
export class ToolsModule {}
