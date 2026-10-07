import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { MailOutboxRepository } from './mail-outbox.repository'
import { MailService } from './mail.service'

@Module({ imports: [DatabaseModule], providers: [MailOutboxRepository, MailService], exports: [MailService] })
export class MailModule {}
