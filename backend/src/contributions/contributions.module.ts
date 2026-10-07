import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { ContributionsController } from './contributions.controller'
import { ContributionsRepository } from './contributions.repository'
import { ContributionsService } from './contributions.service'
import { MyContributionsController } from './my-contributions.controller'

@Module({ imports: [DatabaseModule, SessionModule], controllers: [ContributionsController, MyContributionsController], providers: [ContributionsRepository, ContributionsService] })
export class ContributionsModule {}
