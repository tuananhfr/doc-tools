import 'dotenv/config'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseService } from '../database/database.service'
import { RulesRepository } from '../rules/rules.repository'
import { MAX_RULE_DATA_LENGTH, verifyRulePackage, type RulePackage } from '../rules/rule-package'
import { checkRuleData, compareRuleData, type RuleCheck } from '../rules/rule-kinds'
import { buildFromSpec, generateSigningKeys, signRulePackage } from '../rules/rule-signing'
import { vietnamToday } from '../rules/rule-dates'

const USAGE = `Usage:
  rules keygen <out-dir>
  rules sign <spec.json> <private-key.pem> <out.json>
  rules check <package.json>
  rules list <kind>
  rules stage <package.json> <operator>
  rules activate <kind>:<digest> <operator>     publish; a future effectiveFrom schedules it
  rules rollback <kind>:<digest> <operator>     withdraw; the previous package applies again`

const print = (line = '') => process.stdout.write(`${line}\n`)
const KIND_DIGEST = /^([a-z][a-z0-9-]{0,63}):([0-9a-f]{64})$/
const OPERATOR = /^[a-zA-Z0-9._@-]{2,128}$/

function publicKeyPem(): string {
  const key = process.env.RULE_SIGNING_PUBLIC_KEY_PEM?.replace(/\\n/g, '\n')
  if (!key) throw new Error('RULE_SIGNING_PUBLIC_KEY_PEM is required')
  return key
}

async function withRepository<T>(run: (repository: RulesRepository) => Promise<T>): Promise<T> {
  const database = new DatabaseService()
  await database.onModuleInit()
  try { return await run(new RulesRepository(database)) }
  finally { await database.onModuleDestroy() }
}

async function readPackage(file: string): Promise<{ item: RulePackage; digest: string }> {
  const content = await readFile(file, 'utf8')
  // Room for the envelope around the largest allowed data block.
  if (content.length > MAX_RULE_DATA_LENGTH + 500_000) throw new Error('Rule package is too large')
  return verifyRulePackage(JSON.parse(content) as unknown, publicKeyPem())
}

function report(check: RuleCheck) {
  for (const line of check.notes) print(`  note: ${line}`)
  for (const line of check.warnings) print(`  warning: ${line}`)
  for (const line of check.errors) print(`  error: ${line}`)
}

function describeDates(item: RulePackage, today: string) {
  const until = item.effectiveTo ? ` to ${item.effectiveTo}` : ''
  if (item.effectiveTo && item.effectiveTo < today) return `expired (effective ${item.effectiveFrom}${until})`
  if (item.effectiveFrom > today) return `scheduled from ${item.effectiveFrom}${until}`
  return `in effect from ${item.effectiveFrom}${until}`
}

async function keygen(outDir: string) {
  const keys = generateSigningKeys()
  const file = path.resolve(outDir, 'rule-signing-private.pem')
  await mkdir(path.resolve(outDir), { recursive: true })
  // `wx` refuses to overwrite: losing the old private key means no further packages for that key.
  await writeFile(file, keys.privatePem, { flag: 'wx', mode: 0o600 })
  print(`Private key written to ${file}. Keep it offline; never commit or upload it.`)
  print('\nbackend .env:')
  print(`RULE_SIGNING_PUBLIC_KEY_PEM="${keys.publicPem.trim().replace(/\n/g, '\\n')}"`)
  print('\nfrontend .env:')
  print(`NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI=${keys.spkiBase64Url}`)
}

async function signSpec(specPath: string, keyPath: string, outPath: string) {
  const { unsigned, notes } = await buildFromSpec(specPath)
  for (const line of notes) print(`note: ${line}`)
  const check = checkRuleData(unsigned.kind, unsigned.data)
  report(check)
  if (check.errors.length) throw new Error('Not signed: fix the errors above')
  const { item, digest } = signRulePackage(unsigned, await readFile(keyPath, 'utf8'))
  await writeFile(outPath, `${JSON.stringify(item)}\n`, { flag: 'wx' })
  print(`Signed ${item.kind}:${digest} -> ${outPath}`)
}

async function checkPackage(file: string) {
  const { item, digest } = await readPackage(file)
  const today = vietnamToday()
  print(`${item.kind}:${digest}`)
  print(`  signature: valid (key ${item.keyId}); ${describeDates(item, today)}`)
  print(`  source: ${item.source.title} <${item.source.url}>`)
  const check = checkRuleData(item.kind, item.data)
  report(check)
  try {
    await withRepository(async repository => {
      const current = await repository.getEffective(item.kind, today)
      if (!current) { print('  dry run: no package of this kind is in effect today'); return }
      print(`  dry run against the package in effect (from ${current.effectiveFrom}):`)
      for (const line of compareRuleData(item.kind, current.data, item.data)) print(`    ${line}`)
    })
  } catch (error) {
    print(`  dry run skipped: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (check.errors.length) process.exitCode = 1
}

async function list(kind: string) {
  const today = vietnamToday()
  await withRepository(async repository => {
    const [rows, current] = await Promise.all([repository.schedule(kind), repository.getEffective(kind, today)])
    if (!rows.length) { print(`No packages for ${kind}`); return }
    const currentDigest = current ? verifyRulePackage(current, publicKeyPem()).digest : null
    for (const row of rows) {
      const status = !row.publishedAt ? 'staged only'
        : row.digest === currentDigest ? 'IN EFFECT'
          : row.effectiveTo && row.effectiveTo < today ? 'expired'
            : row.effectiveFrom > today ? 'scheduled'
              : 'superseded'
      print(`${row.digest}  ${row.effectiveFrom} -> ${row.effectiveTo ?? 'open'}  ${status}`)
    }
  })
}

async function main() {
  const [action, value, ...rest] = process.argv.slice(2)
  if (action === 'keygen' && value) return keygen(value)
  if (action === 'sign' && value && rest.length === 2) return signSpec(value, rest[0], rest[1])
  if (action === 'check' && value) return checkPackage(value)
  if (action === 'list' && /^[a-z][a-z0-9-]{0,63}$/.test(value ?? '')) return list(value)

  const actor = rest[0]
  if (!['stage', 'activate', 'rollback'].includes(action) || !value || !actor || !OPERATOR.test(actor)) throw new Error(USAGE)
  if (action === 'stage') {
    const { item, digest } = await readPackage(value)
    const check = checkRuleData(item.kind, item.data)
    report(check)
    if (check.errors.length) throw new Error('Not staged: fix the errors above')
    await withRepository(repository => repository.stage(item, digest, actor))
    print(`Staged ${item.kind}:${digest} (${describeDates(item, vietnamToday())})`)
    return
  }
  const match = KIND_DIGEST.exec(value)
  if (!match) throw new Error('Expected kind:digest')
  const [, kind, digest] = match
  await withRepository(async repository => {
    if (action === 'rollback') {
      await repository.withdraw(kind, digest, actor)
      const current = await repository.getEffective(kind, vietnamToday())
      print(`Withdrew ${kind}:${digest}; ${current ? `now in effect: package from ${current.effectiveFrom}` : 'no package of this kind is in effect'}`)
      return
    }
    const item = await repository.getByDigest(kind, digest)
    if (!item || verifyRulePackage(item, publicKeyPem()).digest !== digest) throw new Error('Staged package does not verify')
    const today = vietnamToday()
    if (item.effectiveTo && item.effectiveTo < today) throw new Error('Package has already expired')
    await repository.publish(kind, digest, actor)
    print(`Published ${kind}:${digest} (${describeDates(item, today)})`)
  })
}

void main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
