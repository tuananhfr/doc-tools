import 'dotenv/config'
import { DatabaseService } from '../database/database.service'
import { PlansRepository } from '../accounts/plans.repository'
import { UsersRepository } from '../accounts/users.repository'
import { normalizeEmail } from '../accounts/profile-input'
import { endOfVietnamDay } from '../accounts/plan-dates'
import { isRole, ROLES } from '../roles/roles'
import { RolesRepository } from '../roles/roles.repository'

const USAGE = 'Usage: accounts <grant-pro <email> <YYYY-MM-DD> <operator> [note] | revoke-pro <email> <operator> [note] | show <email> | list-pro | grant-role <email> <owner|admin|reviewer> <operator> | revoke-role <email> <operator> | list-roles>'

function operator(value: string | undefined) {
  if (!/^[a-zA-Z0-9._@-]{2,128}$/.test(value || '')) throw new Error('Named operator is required')
  return value!
}

async function main() {
  const [action, ...args] = process.argv.slice(2)
  if (!['grant-pro', 'revoke-pro', 'show', 'list-pro', 'grant-role', 'revoke-role', 'list-roles'].includes(action)) throw new Error(USAGE)
  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    const users = new UsersRepository(database)
    const plans = new PlansRepository(database)
    const roles = new RolesRepository(database)
    const now = Math.floor(Date.now() / 1000)
    if (action === 'list-pro') {
      for (const row of await plans.listActive(now)) process.stdout.write(`${row.email}\t${new Date(row.endsAt * 1000).toISOString()}\n`)
      return
    }
    if (action === 'list-roles') {
      for (const row of await roles.list()) process.stdout.write(`${row.role}\t${row.email}\t${row.grantedBy}\n`)
      return
    }
    const email = normalizeEmail(args[0])
    if (!email) throw new Error(USAGE)
    if (action === 'grant-pro') {
      const endsAt = endOfVietnamDay(args[1] || '')
      if (endsAt <= now) throw new Error('End date is already in the past')
      const actor = operator(args[2])
      // Granting before the person ever signs in is allowed; the code login later finds this row.
      const user = await users.findOrCreate(email)
      await plans.grant(user.id, endsAt, actor, args.slice(3).join(' ').trim() || null, now)
      await users.audit(user.id, 'PRO_GRANTED', actor, `until ${args[1]}`)
      process.stdout.write(`${email} → Pro until ${new Date(endsAt * 1000).toISOString()}\n`)
      return
    }
    if (action === 'grant-role') {
      if (!isRole(args[1])) throw new Error(`Role must be one of ${ROLES.join(', ')}`)
      const actor = operator(args[2])
      // Creating the account here bootstraps the first owner before the site has any staff to do it.
      const user = await users.findOrCreate(email)
      await roles.set(user.id, args[1], actor)
      // Older sessions keep their 30-day lifetime; ending them makes the next sign-in a 12-hour staff session.
      await database.pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [user.id])
      await users.audit(user.id, 'ROLE_GRANTED', actor, args[1])
      process.stdout.write(`${email} → ${args[1]}\n`)
      return
    }
    const user = await users.findByEmail(email)
    if (!user) throw new Error('User not found')
    if (action === 'revoke-role') {
      const actor = operator(args[1])
      await roles.remove(user.id)
      await users.audit(user.id, 'ROLE_REVOKED', actor)
      process.stdout.write(`${email} → no role\n`)
      return
    }
    if (action === 'revoke-pro') {
      const actor = operator(args[1])
      const revoked = await plans.revoke(user.id, now)
      await users.audit(user.id, 'PRO_REVOKED', actor, args.slice(2).join(' ').trim() || null)
      process.stdout.write(`${email} → ${revoked} grant(s) revoked\n`)
      return
    }
    const endsAt = await plans.proEndsAt(user.id, now)
    process.stdout.write(`${JSON.stringify({ ...user, proUntil: endsAt === null ? null : new Date(endsAt * 1000).toISOString(), plans: await plans.history(user.id) }, null, 2)}\n`)
  } finally { await database.onModuleDestroy() }
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
