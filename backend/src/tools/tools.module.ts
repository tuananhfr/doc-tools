import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { ToolsController } from './tools.controller'
import { ToolsService } from './tools.service'
import { ToolsRepository } from './tools.repository'
@Module({ imports: [DatabaseModule], controllers: [ToolsController], providers: [ToolsService, ToolsRepository] })
export class ToolsModule {}
