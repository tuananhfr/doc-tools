import type { Pool, RowDataPacket } from 'mysql2/promise'

/**
 * Moves rows of the old one-pointer-per-kind `rule_active` table into `rule_published`, then
 * empties it so a package withdrawn later is not copied back on the next start. The unlocked
 * count skips the work on every normal start; the server and the CLI may start at the same time,
 * and a plain INSERT ... SELECT followed by DELETE deadlocks across processes.
 */
export async function migrateLegacyRuleActive(pool: Pool) {
  const [[{ pending }]] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS pending FROM rule_active')
  if (!pending) return
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>('SELECT kind, digest FROM rule_active FOR UPDATE')
    for (const row of rows) await connection.execute('INSERT IGNORE INTO rule_published (kind, digest) VALUES (?, ?)', [row.kind, row.digest])
    await connection.query('DELETE FROM rule_active')
    await connection.commit()
  } catch (error) { await connection.rollback(); throw error }
  finally { connection.release() }
}
