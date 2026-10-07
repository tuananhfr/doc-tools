import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { ContributionsModule } from '../contributions/contributions.module'
import { DatabaseModule } from '../database/database.module'
import { MailModule } from '../mail/mail.module'
import { RolesModule } from '../roles/roles.module'
import { SessionModule } from '../session/session.module'
import { AdminAuditController } from './admin-audit.controller'
import { AdminAuditRepository } from './admin-audit.repository'
import { AdminContributionsController } from './admin-contributions.controller'
import { AdminContributionsRepository } from './admin-contributions.repository'
import { AdminContributionsService } from './admin-contributions.service'
import { AdminMailController } from './admin-mail.controller'
import { AdminMailRepository } from './admin-mail.repository'
import { AdminRolesController } from './admin-roles.controller'
import { AdminSettingsController } from './admin-settings.controller'
import { AdminStatsController } from './admin-stats.controller'
import { AdminStatsRepository } from './admin-stats.repository'
import { AdminUsersController } from './admin-users.controller'
import { AdminUsersRepository } from './admin-users.repository'
import { AdminUsersService } from './admin-users.service'
import { AdminGuard } from './admin.guard'

@Module({
  imports: [DatabaseModule, AccountsModule, SessionModule, RolesModule, MailModule, ContributionsModule],
  controllers: [AdminStatsController, AdminUsersController, AdminContributionsController, AdminMailController, AdminSettingsController, AdminRolesController, AdminAuditController],
  providers: [AdminGuard, AdminAuditRepository, AdminUsersRepository, AdminUsersService, AdminContributionsRepository, AdminContributionsService, AdminMailRepository, AdminStatsRepository],
  exports: [AdminGuard, AdminAuditRepository],
})
export class AdminModule {}
