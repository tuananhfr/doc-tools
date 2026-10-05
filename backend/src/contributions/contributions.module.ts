import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { ContributionsController } from './contributions.controller'
import { ContributionsRepository } from './contributions.repository'
import { ContributionsService } from './contributions.service'

@Module({ imports: [DatabaseModule], controllers: [ContributionsController], providers: [ContributionsRepository, ContributionsService] })
export class ContributionsModule {}
