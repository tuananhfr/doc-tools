import { Module } from '@nestjs/common'
import { ToolsModule } from './tools/tools.module'
import { RulesModule } from './rules/rules.module'
import { ContributionsModule } from './contributions/contributions.module'
import { AccountsModule } from './accounts/accounts.module'
import { AuthModule } from './auth/auth.module'
@Module({ imports: [ToolsModule, RulesModule, ContributionsModule, AccountsModule, AuthModule] })
export class AppModule {}
