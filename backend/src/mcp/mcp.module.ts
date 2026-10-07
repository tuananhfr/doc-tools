import { Module } from '@nestjs/common'
import { AiModule } from '../ai/ai.module'
import { ContributionsModule } from '../contributions/contributions.module'
import { RulesModule } from '../rules/rules.module'
import { McpController } from './mcp.controller'
import { McpToolsService } from './mcp-tools.service'

@Module({ imports: [AiModule, RulesModule, ContributionsModule], controllers: [McpController], providers: [McpToolsService] })
export class McpModule {}
