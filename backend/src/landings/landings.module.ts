import { Module } from '@nestjs/common'
import { AdminModule } from '../admin/admin.module'
import { DatabaseModule } from '../database/database.module'
import { SessionModule } from '../session/session.module'
import { AdminLandingsController } from './admin-landings.controller'
import { LandingsController } from './landings.controller'
import { LandingsRepository } from './landings.repository'
import { LandingsService } from './landings.service'

@Module({
  imports: [DatabaseModule, SessionModule, AdminModule],
  controllers: [LandingsController, AdminLandingsController],
  providers: [LandingsRepository, LandingsService],
})
export class LandingsModule {}
