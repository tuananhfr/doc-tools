import { Module } from '@nestjs/common'
import { ToolsModule } from './tools/tools.module'
import { RulesModule } from './rules/rules.module'
import { ContributionsModule } from './contributions/contributions.module'
import { AccountsModule } from './accounts/accounts.module'
import { AuthModule } from './auth/auth.module'
import { SettingsModule } from './settings/settings.module'
import { AdminModule } from './admin/admin.module'
import { AiModule } from './ai/ai.module'
import { McpModule } from './mcp/mcp.module'
import { CloudModule } from './cloud/cloud.module'
@Module({ imports: [SettingsModule, ToolsModule, RulesModule, ContributionsModule, AccountsModule, AuthModule, AdminModule, AiModule, McpModule, CloudModule] })
export class AppModule {}
