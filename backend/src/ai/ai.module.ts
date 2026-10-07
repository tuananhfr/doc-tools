import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { AiController } from './ai.controller'
import { AiRepository } from './ai.repository'
import { AiService } from './ai.service'
import { GoclawClient } from './goclaw.client'

@Module({
  imports: [DatabaseModule, AccountsModule, SessionModule],
  controllers: [AiController],
  providers: [AiRepository, GoclawClient, AiService],
  exports: [AiRepository, GoclawClient, AiService],
})
export class AiModule {}
