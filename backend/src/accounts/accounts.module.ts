import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'
import { PlansRepository } from './plans.repository'
import { UsersRepository } from './users.repository'

@Module({
  imports: [DatabaseModule, SessionModule],
  controllers: [AccountsController],
  providers: [UsersRepository, PlansRepository, AccountsService],
  exports: [UsersRepository, PlansRepository, AccountsService],
})
export class AccountsModule {}
