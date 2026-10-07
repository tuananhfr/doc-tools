import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { MailModule } from '../mail/mail.module'
import { PlanLifecycleRepository } from './plan-lifecycle.repository'
import { PlanLifecycleService } from './plan-lifecycle.service'

@Module({ imports: [DatabaseModule, MailModule], providers: [PlanLifecycleRepository, PlanLifecycleService], exports: [PlanLifecycleService] })
export class LifecycleModule {}
