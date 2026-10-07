import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { SessionRepository } from './session.repository'
import { SessionService } from './session.service'
import { TrustedWriteGuard } from './trusted-write.guard'

@Module({ imports: [DatabaseModule], providers: [SessionRepository, SessionService, TrustedWriteGuard], exports: [SessionService, TrustedWriteGuard] })
export class SessionModule {}
