import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { CodesController } from './codes.controller'
import { CodesRepository } from './codes.repository'
import { CodesService } from './codes.service'
import { TrustedWriteGuard } from '../session/trusted-write.guard'

@Module({ imports: [DatabaseModule], controllers: [CodesController], providers: [CodesRepository, CodesService, TrustedWriteGuard] })
export class CodesModule {}
