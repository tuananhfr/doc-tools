import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

/** Removes data held outside this database (GoClaw agent, cloud files); throwing aborts the deletion. */
export type DeletionCleanup = (userId: string) => Promise<void>

@Injectable()
export class AccountDeletionService {
  private readonly cleanups: { name: string; run: DeletionCleanup }[] = []

  constructor(private readonly database: DatabaseService) {}

  /** Modules that keep per-user data elsewhere register here from `onModuleInit`. */
  addCleanup(name: string, run: DeletionCleanup) { this.cleanups.push({ name, run }) }

  /**
   * External data goes first: a half-finished deletion must leave the account in place so it can be
   * retried, never an orphaned agent that still holds the user's API key.
   * Contributions stay (they may be published) but lose the link to the person.
   */
  async delete(userId: string, actor: string) {
    for (const cleanup of this.cleanups) {
      try { await cleanup.run(userId) }
      catch (error) { throw new Error(`${cleanup.name}: ${error instanceof Error ? error.message : String(error)}`) }
    }
    const connection = await this.database.pool.getConnection()
    try {
      await connection.beginTransaction()
      for (const table of ['user_sessions', 'user_roles', 'contribution_submitters', 'contribution_drafts', 'ai_source_checks', 'saved_items', 'plan_notices', 'user_plans']) {
        await connection.execute(`DELETE FROM ${table} WHERE user_id = ?`, [userId])
      }
      await connection.execute('DELETE FROM users WHERE id = ?', [userId])
      // Kept with the bare id only, so the trail shows a deletion happened without keeping the email.
      await connection.execute('INSERT INTO user_audit (user_id, action, actor) VALUES (?, ?, ?)', [userId, 'DELETED', actor])
      await connection.commit()
    } catch (error) { await connection.rollback(); throw error }
    finally { connection.release() }
  }
}
