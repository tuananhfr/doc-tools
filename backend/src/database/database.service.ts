import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import { createPool, type Pool } from 'mysql2/promise'
import { configuration } from '../config/configuration'
import { migrateLegacyRuleActive } from './migrations'
import { SCHEMA } from './schema'
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool = createPool(configuration().database)
  async onModuleInit() {
    for (const statement of SCHEMA) await this.pool.query(statement)
    await migrateLegacyRuleActive(this.pool)
  }
  async onModuleDestroy() { await this.pool.end() }
}
