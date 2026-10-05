import { Module } from '@nestjs/common'
import { ToolsModule } from './tools/tools.module'
import { RulesModule } from './rules/rules.module'
import { ContributionsModule } from './contributions/contributions.module'
@Module({ imports: [ToolsModule, RulesModule, ContributionsModule] })
export class AppModule {}
