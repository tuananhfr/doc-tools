import { BadRequestException, ConflictException, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common'
import { createPublicKey, generateKeyPairSync } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { configuration } from '../config/configuration'
import { applyRuntimeOverrides, type GoclawOverrides, type MailOverrides, type SecretName } from '../config/runtime-config'
import { sealSecret, secretBoxReady } from '../config/secret-box'
import {
  GROUP_SECRETS, IntegrationInputError, parseGoclawInput, parseMailInput, parseSecretValue, TYPED_SECRETS, type IntegrationGroup,
} from './integration.definitions'
import { IntegrationRepository, type IntegrationSnapshot } from './integration.repository'

// Same window as SettingsService: other API instances pick up a change within it.
const RELOAD_MS = 30000

function badInput(error: unknown): never {
  if (error instanceof IntegrationInputError) throw new BadRequestException({ ok: false, code: 'INVALID_INPUT', message: error.message })
  throw error
}

function effectiveMail(): MailOverrides {
  const { mail } = configuration()
  return {
    transport: mail.transport, from: mail.from, fromName: mail.fromName, heloName: mail.heloName,
    smtpHost: mail.smtp.host, smtpPort: mail.smtp.port, smtpSecure: mail.smtp.secure, smtpUser: mail.smtp.user,
    dkimDomain: mail.dkim.domain, dkimSelector: mail.dkim.selector,
  }
}

function effectiveGoclaw(): GoclawOverrides {
  const { goclaw, mcp } = configuration()
  return { url: goclaw.url, publicWsUrl: goclaw.publicWsUrl, publicFilesUrl: goclaw.publicFilesUrl, mcpPublicUrl: mcp.publicUrl, mcpAllowedIps: mcp.allowedIps }
}

function dkimTxt(privateKeyPem: string) {
  const der = createPublicKey(privateKeyPem).export({ type: 'spki', format: 'der' }).toString('base64')
  return `v=DKIM1; k=rsa; p=${der}`
}

/** Mail and GoClaw settings set from the admin area (see config/runtime-config.ts for precedence). */
@Injectable()
export class IntegrationConfigService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('IntegrationConfig')
  private snapshot: IntegrationSnapshot = { overrides: { mail: null, goclaw: null, secrets: {} }, groups: {}, secrets: {} }
  private timer?: NodeJS.Timeout

  constructor(private readonly repository: IntegrationRepository) {}

  // Not onModuleInit: this global module's hook can run before DatabaseService has created the tables.
  async onApplicationBootstrap() {
    await this.reload()
    this.timer = setInterval(() => void this.reload().catch((error) => this.logger.error(error)), RELOAD_MS)
    this.timer.unref()
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  async reload() {
    this.snapshot = await this.repository.snapshot()
    applyRuntimeOverrides(this.snapshot.overrides)
    for (const [name, meta] of Object.entries(this.snapshot.secrets)) {
      if (!meta.readable) this.logger.warn(`${name} cannot be opened: CONFIG_ENCRYPTION_KEY is missing or changed`)
    }
  }

  private secretState(name: SecretName, fromEnv: boolean) {
    const stored = this.snapshot.secrets[name]
    if (stored) return { source: 'ui' as const, updatedBy: stored.updatedBy, updatedAt: stored.updatedAt, readable: stored.readable }
    return { source: fromEnv ? 'env' as const : null, updatedBy: null, updatedAt: null, readable: true }
  }

  view() {
    const config = configuration()
    const { dkim } = config.mail
    let dkimRecord: { host: string; value: string } | null = null
    try {
      const pem = dkim.privateKey || (dkim.keyFile && existsSync(dkim.keyFile) ? readFileSync(dkim.keyFile, 'utf8') : '')
      if (dkim.selector && pem) dkimRecord = { host: `${dkim.selector}._domainkey.${dkim.domain}`, value: dkimTxt(pem) }
    } catch { dkimRecord = null }
    const group = (name: IntegrationGroup) => {
      const meta = this.snapshot.groups[name]
      return { source: meta ? 'ui' as const : 'env' as const, updatedBy: meta?.updatedBy ?? null, updatedAt: meta?.updatedAt ?? null }
    }
    return {
      encryptionReady: secretBoxReady(),
      envOnly: process.env.CONFIG_FROM_ENV_ONLY === '1',
      mail: {
        ...group('mail'), values: effectiveMail(), dkimRecord,
        secrets: {
          smtpPassword: this.secretState('mail.smtpPassword', Boolean(config.mail.smtp.pass)),
          dkimPrivateKey: this.secretState('mail.dkimPrivateKey', Boolean(dkim.keyFile) && existsSync(dkim.keyFile)),
        },
      },
      goclaw: {
        ...group('goclaw'), values: effectiveGoclaw(),
        secrets: { gatewayToken: this.secretState('goclaw.gatewayToken', Boolean(config.goclaw.gatewayToken)) },
      },
    }
  }

  private requireBox() {
    if (!secretBoxReady()) {
      throw new ConflictException({ ok: false, code: 'ENCRYPTION_KEY_MISSING', message: 'Máy chủ chưa có CONFIG_ENCRYPTION_KEY nên chưa lưu được bí mật. Đặt một lần trong .env của backend rồi khởi động lại.' })
    }
  }

  /**
   * Checks a whole group before the password is asked, so a typo does not use up password attempts.
   * Changing the SMTP host or the GoClaw address while a password/token is in use requires typing it
   * again: otherwise the stored one would be sent to the new address.
   */
  prepare(group: IntegrationGroup, values: Record<string, unknown>, secretsInput: Record<string, unknown>) {
    const before = group === 'mail' ? effectiveMail() : effectiveGoclaw()
    let next: MailOverrides | GoclawOverrides
    const typed: Partial<Record<SecretName, string | null>> = {}
    try {
      next = group === 'mail' ? parseMailInput(values) : parseGoclawInput(values)
      for (const [field, value] of Object.entries(secretsInput)) {
        const name = TYPED_SECRETS[group][field]
        if (!name) throw new IntegrationInputError('Có trường bí mật không hợp lệ.')
        const parsed = parseSecretValue(value, field === 'smtpPassword' ? 'Mật khẩu SMTP' : 'Token gateway')
        if (parsed !== undefined) typed[name] = parsed
      }
    } catch (error) { return badInput(error) }
    if (Object.values(typed).some((value) => typeof value === 'string')) this.requireBox()

    const config = configuration()
    const [bound, address, inUse] = group === 'mail'
      ? ['mail.smtpPassword' as const, (next as MailOverrides).smtpHost !== (before as MailOverrides).smtpHost, Boolean(config.mail.smtp.pass)]
      : ['goclaw.gatewayToken' as const, (next as GoclawOverrides).url !== (before as GoclawOverrides).url, Boolean(config.goclaw.gatewayToken)]
    if (address && inUse && typed[bound] === undefined) {
      throw new BadRequestException({ ok: false, code: 'SECRET_REQUIRED', message: group === 'mail' ? 'Đổi máy chủ SMTP thì phải nhập lại mật khẩu SMTP (hoặc chọn xoá mật khẩu).' : 'Đổi địa chỉ GoClaw thì phải nhập lại token gateway (hoặc chọn xoá token).' })
    }
    return { group, before, next, typed, bound, address }
  }

  /** Returns the names of what changed, for the audit log (never the values). */
  async apply({ group, before, next, typed, bound, address }: ReturnType<IntegrationConfigService['prepare']>, actor: string) {
    // Secrets first: if the group write then fails, nothing old is left pointing at a new address.
    const removed = Object.entries(typed).filter(([, value]) => value === null).map(([name]) => name as SecretName)
    if (address && typed[bound] === undefined) removed.push(bound)
    await this.repository.removeSecrets(removed)
    for (const [name, value] of Object.entries(typed)) if (typeof value === 'string') await this.repository.setSecret(name as SecretName, sealSecret(name, value), actor)
    await this.repository.setGroup(group, next, actor)
    await this.reload()

    const changed = Object.keys(next).filter((field) => JSON.stringify((next as unknown as Record<string, unknown>)[field]) !== JSON.stringify((before as unknown as Record<string, unknown>)[field]))
    const secretChanges = Object.entries(typed).map(([name, value]) => `${name}=${value === null ? 'removed' : 'set'}`)
    return [changed.length ? `fields: ${changed.join(', ')}` : '', secretChanges.length ? `secrets: ${secretChanges.join(', ')}` : ''].filter(Boolean).join('; ') || 'no change'
  }

  /** Back to `.env`: the group and every secret of that group set from the admin area. */
  async reset(group: IntegrationGroup) {
    await this.repository.removeSecrets(GROUP_SECRETS[group])
    await this.repository.removeGroup(group)
    await this.reload()
  }

  /** Checked before the password, like `prepare`. */
  dkimSelector(input: unknown) {
    const selector = typeof input === 'string' ? input.trim().toLowerCase() : ''
    if (!/^[a-z0-9-]{1,63}$/.test(selector)) throw new BadRequestException({ ok: false, code: 'INVALID_INPUT', message: 'Selector DKIM chỉ gồm chữ thường, số và dấu gạch ngang.' })
    this.requireBox()
    return selector
  }

  /** The private key never leaves the server; the admin only gets the DNS record to publish. */
  async generateDkim(selector: string, actor: string) {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    await this.repository.setSecret('mail.dkimPrivateKey', sealSecret('mail.dkimPrivateKey', pem), actor)
    await this.repository.setGroup('mail', { ...effectiveMail(), dkimSelector: selector }, actor)
    await this.reload()
    const { dkim } = configuration().mail
    return { selector, host: `${selector}._domainkey.${dkim.domain}`, value: dkimTxt(pem) }
  }
}
