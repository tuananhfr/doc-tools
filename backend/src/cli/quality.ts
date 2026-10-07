import 'dotenv/config'
import { DatabaseService } from '../database/database.service'
import { QualityRepository } from '../tools/quality.repository'

async function main() {
  const [from, to] = process.argv.slice(2)
  if (![from, to].every(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)) || from > to) throw new Error('Usage: quality YYYY-MM-DD YYYY-MM-DD')
  const database = new DatabaseService()
  await database.onModuleInit()
  try { process.stdout.write(JSON.stringify({ privacy: 'daily aggregates only', rows: await new QualityRepository(database).report(from, to) }, null, 2) + '\n') }
  finally { await database.onModuleDestroy() }
}
void main().catch(error => { process.stderr.write(String(error instanceof Error ? error.message : error) + '\n'); process.exitCode = 1 })
