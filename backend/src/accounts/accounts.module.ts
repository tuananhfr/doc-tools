import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { AccountDeletionService } from './account-deletion.service'
import { AccountsController } from './accounts.controller'
import { AccountsService } from './accounts.service'
import { PasswordsRepository } from './passwords.repository'
import { PlansRepository } from './plans.repository'
import { UsersRepository } from './users.repository'

@Module({
  imports: [DatabaseModule, SessionModule],
  controllers: [AccountsController],
  providers: [UsersRepository, PlansRepository, PasswordsRepository, AccountsService, AccountDeletionService],
  exports: [UsersRepository, PlansRepository, PasswordsRepository, AccountsService, AccountDeletionService],
})
export class AccountsModule {}
