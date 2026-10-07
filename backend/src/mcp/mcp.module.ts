import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { McpController } from './mcp.controller'

@Module({ imports: [AiModule], controllers: [McpController] })
export class McpModule {}
