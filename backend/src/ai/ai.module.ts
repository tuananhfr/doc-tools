import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { AiController } from './ai.controller'
import { AiReconcileService } from './ai-reconcile.service'
import { AiUploadsRepository } from './ai-uploads.repository'
import { AiUploadsService } from './ai-uploads.service'
import { AiRepository } from './ai.repository'
import { AiService } from './ai.service'
import { GoclawClient } from './goclaw.client'

@Module({
  imports: [DatabaseModule, AccountsModule, SessionModule],
  controllers: [AiController],
  providers: [AiRepository, GoclawClient, AiService, AiReconcileService, AiUploadsRepository, AiUploadsService],
  exports: [AiRepository, GoclawClient, AiService, AiReconcileService],
})
export class AiModule {}
