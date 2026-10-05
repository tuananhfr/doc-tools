import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { DatabaseService } from '../database/database.service'
import { RulesRepository } from '../rules/rules.repository'
import { verifyRulePackage } from '../rules/rule-package'

async function main() {
  const [action, value, actor] = process.argv.slice(2)
  if (!['stage', 'activate', 'rollback'].includes(action) || !value || !actor || !/^[a-zA-Z0-9._@-]{2,128}$/.test(actor)) {
    throw new Error('Usage: rules <stage|activate|rollback> <package.json|kind:digest> <operator>')
  }
  const publicKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
  if (!publicKey) throw new Error('RULE_SIGNING_PUBLIC_KEY_PEM is required')
  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    const repository = new RulesRepository(database)
    if (action === 'stage') {
      const content = await readFile(value, 'utf8')
      if (content.length > 1_100_000) throw new Error('Rule package is too large')
      const { item, digest } = verifyRulePackage(JSON.parse(content) as unknown, publicKey)
      await repository.stage(item, digest, actor)
      process.stdout.write(`Staged ${item.kind}:${digest}\n`)
      return
    }
    const match = /^([a-z][a-z0-9-]{0,63}):([0-9a-f]{64})$/.exec(value)
    if (!match) throw new Error('Expected kind:digest')
    const [, kind, digest] = match
    const item = await repository.getByDigest(kind, digest)
    if (!item || verifyRulePackage(item, publicKey).digest !== digest) throw new Error('Staged package does not verify')
    const today = new Date().toISOString().slice(0, 10)
    if (item.effectiveFrom > today || (item.effectiveTo && item.effectiveTo < today)) throw new Error('Package is outside its effective dates')
    await repository.activate(kind, digest, actor, action as 'activate' | 'rollback')
    process.stdout.write(`${action} ${kind}:${digest}\n`)
  } finally { await database.onModuleDestroy() }
}

void main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
