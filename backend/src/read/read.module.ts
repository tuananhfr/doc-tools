import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { TrustedWriteGuard } from '../session/trusted-write.guard'
import { ReadController } from './read.controller'
import { ReadLimitRepository } from './read-limit.repository'
import { ReadNetwork } from './read-network'
import { ReadService } from './read.service'

@Module({ imports: [DatabaseModule], controllers: [ReadController], providers: [ReadService, ReadLimitRepository, ReadNetwork, TrustedWriteGuard] })
export class ReadModule {}
