import 'dotenv/config'
import { DatabaseService } from '../database/database.service'
import { ContributionsRepository } from '../contributions/contributions.repository'
import { RulesRepository } from '../rules/rules.repository'
import { verifyRulePackage } from '../rules/rule-package'
import { vietnamToday } from '../rules/rule-dates'

async function main() {
  const [action, id, actor, ...rest] = process.argv.slice(2)
  if (!['show', 'verify', 'approve', 'reject', 'publish', 'supersede', 'revoke'].includes(action) || !/^[0-9a-f-]{36}$/.test(id || '')) throw new Error('Usage: contributions <show|verify|approve|reject|publish|supersede|revoke> <uuid> [operator] [note|digest]')
  if (action !== 'show' && !/^[a-zA-Z0-9._@-]{2,128}$/.test(actor || '')) throw new Error('Named operator is required')
  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    const repository = new ContributionsRepository(database)
    if (action === 'show') {
      const item = await repository.getForReview(id)
      if (!item) throw new Error('Contribution not found')
      process.stdout.write(`${JSON.stringify(item, null, 2)}\n`)
      return
    }
    const note = rest.join(' ').trim() || null
    let digest: string | null = null
    if (action === 'publish') {
      const contribution = await repository.getForReview(id)
      if (!contribution) throw new Error('Contribution not found')
      if (contribution.domain !== 'ideas') {
        if (!/^[0-9a-f]{64}$/.test(note || '')) throw new Error('Publish requires a staged rule package digest')
        digest = note
        const publicKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
        if (!publicKey) throw new Error('RULE_SIGNING_PUBLIC_KEY_PEM is required')
        const item = await new RulesRepository(database).getByDigest(contribution.domain as string, note!)
        if (!item || verifyRulePackage(item, publicKey).digest !== digest) throw new Error('Staged package signature does not verify')
        if (item.effectiveTo && item.effectiveTo < vietnamToday()) throw new Error('Rule package has already expired')
      }
    }
    const result = await repository.transition(id, action as 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke', actor, action === 'publish' ? null : note, digest)
    process.stdout.write(`${id} → ${result}\n`)
  } finally { await database.onModuleDestroy() }
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
