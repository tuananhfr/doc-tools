import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { EntertainmentController } from './entertainment.controller'
import { EntertainmentRepository } from './entertainment.repository'

@Module({ imports: [DatabaseModule, SessionModule], controllers: [EntertainmentController], providers: [EntertainmentRepository] })
export class EntertainmentModule {}
