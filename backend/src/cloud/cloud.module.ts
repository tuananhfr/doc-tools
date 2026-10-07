import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { LifecycleModule } from '../lifecycle/lifecycle.module'
import { SessionModule } from '../session/session.module'
import { SavedItemsController } from './saved-items.controller'
import { SavedItemsRepository } from './saved-items.repository'
import { SavedItemsService } from './saved-items.service'

@Module({
  imports: [DatabaseModule, AccountsModule, SessionModule, LifecycleModule],
  controllers: [SavedItemsController],
  providers: [SavedItemsRepository, SavedItemsService],
})
export class CloudModule {}
