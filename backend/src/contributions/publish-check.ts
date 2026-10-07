import type { DatabaseService } from '../database/database.service'
import { vietnamToday } from '../rules/rule-dates'
import { verifyRulePackage } from '../rules/rule-package'
import { RulesRepository } from '../rules/rules.repository'

/**
 * Re-verifies the staged package a rule contribution will publish; the transaction in
 * `ContributionsRepository.transition` only checks that the digest exists. Shared by the CLI and the admin API.
 */
export async function assertPublishablePackage(database: DatabaseService, domain: string, digest: string) {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('Publish requires a staged rule package digest')
  const publicKey = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
  if (!publicKey) throw new Error('RULE_SIGNING_PUBLIC_KEY_PEM is required')
  const item = await new RulesRepository(database).getByDigest(domain, digest)
  if (!item || verifyRulePackage(item, publicKey).digest !== digest) throw new Error('Staged package signature does not verify')
  if (item.effectiveTo && item.effectiveTo < vietnamToday()) throw new Error('Rule package has already expired')
}
