import 'dotenv/config'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { configuration } from '../config/configuration'
import { DatabaseService } from '../database/database.service'
import { normalizeEmail } from '../accounts/profile-input'
import { MailOutboxRepository } from '../mail/mail-outbox.repository'
import { MailService } from '../mail/mail.service'
import { applyRuntimeOverrides } from '../config/runtime-config'
import { IntegrationRepository } from '../settings/integration.repository'

const USAGE = 'Usage: mail <dkim-keygen <directory outside the repo> [selector] | test <email>>'

function dkimKeygen(directory: string, selector: string) {
  if (!/^[a-z0-9-]{1,63}$/.test(selector)) throw new Error('Selector must be lowercase letters, digits or dashes')
  const target = resolve(directory)
  if (target.startsWith(resolve(__dirname, '..', '..'))) throw new Error('Keep the private key outside the repository')
  mkdirSync(target, { recursive: true })
  const keyFile = join(target, `dkim-${selector}.pem`)
  if (existsSync(keyFile)) throw new Error(`${keyFile} already exists`)
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  writeFileSync(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 })
  const der = publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  const { from, dkim } = configuration().mail
  const domain = dkim.domain
  process.stdout.write([
    `Private key: ${keyFile}`, '',
    '# backend .env', `MAIL_DKIM_DOMAIN=${domain}`, `MAIL_DKIM_SELECTOR=${selector}`, `MAIL_DKIM_KEY_FILE=${keyFile}`, '',
    '# DNS records (TXT); long values may need splitting into 255-character strings by your DNS host',
    `${selector}._domainkey.${domain}  TXT  "v=DKIM1; k=rsa; p=${der}"`,
    // The domain's mailbox host already sends as this domain; replacing its SPF record would break that mail.
    `${domain}  TXT  "v=spf1 ip4:<SERVER_IPV4> <existing mechanisms> ~all"   (add ip4 to the existing SPF record; only one is allowed)`,
    `_dmarc.${domain}  TXT  "v=DMARC1; p=none; rua=mailto:${from}"   (tighten to quarantine after reports show SPF/DKIM passing)`, '',
    'Also ask the VPS provider to set the PTR of the server IP to the MAIL_HELO_NAME host, and confirm outbound port 25 is open.', '',
  ].join('\n'))
}

async function sendTest(email: string) {
  const database = new DatabaseService()
  await database.onModuleInit()
  try {
    // Sends through whatever the running server would use, admin-area settings included.
    applyRuntimeOverrides((await new IntegrationRepository(database).snapshot()).overrides)
    const outbox = new MailOutboxRepository(database)
    const id = await outbox.enqueue(email, 'otp', { code: '000000', locale: 'vi', ttlMinutes: 10 }, null, Math.floor(Date.now() / 1000))
    await new MailService(outbox).processDue()
    const result = await outbox.status(id)
    process.stdout.write(`transport=${configuration().mail.transport} status=${result?.status} attempts=${result?.attempts}${result?.lastError ? ` error=${result.lastError}` : ''}\n`)
    if (result?.status !== 'sent') process.exitCode = 1
  } finally { await database.onModuleDestroy() }
}

async function main() {
  const [action, arg, selector] = process.argv.slice(2)
  if (action === 'dkim-keygen' && arg) return dkimKeygen(arg, selector || 'cn1')
  if (action === 'test') {
    const email = normalizeEmail(arg)
    if (!email) throw new Error(USAGE)
    return sendTest(email)
  }
  throw new Error(USAGE)
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1 })
