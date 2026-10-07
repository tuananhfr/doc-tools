import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { ContributionDraftsRepository } from './contribution-drafts.repository'
import { ContributionDraftsService } from './contribution-drafts.service'
import { ContributionsController } from './contributions.controller'
import { ContributionsRepository } from './contributions.repository'
import { ContributionsService } from './contributions.service'
import { MyContributionDraftsController } from './my-contribution-drafts.controller'
import { MyContributionsController } from './my-contributions.controller'

@Module({
  imports: [DatabaseModule, SessionModule],
  controllers: [ContributionsController, MyContributionsController, MyContributionDraftsController],
  providers: [ContributionsRepository, ContributionsService, ContributionDraftsRepository, ContributionDraftsService],
  exports: [ContributionsRepository, ContributionsService, ContributionDraftsService],
})
export class ContributionsModule {}
