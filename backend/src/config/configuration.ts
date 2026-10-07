import { join } from 'node:path'

export type MailTransportMode = 'direct' | 'smtp' | 'log'

const MIB = 1024 * 1024

function list(value: string | undefined) {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean)
}

export function configuration() {
  const password = process.env.DB_PASSWORD
  const salt = process.env.VISIT_HASH_SECRET
  if (password === undefined || !salt) throw new Error('DB_PASSWORD and VISIT_HASH_SECRET must be configured')
  const transport = (process.env.MAIL_TRANSPORT ?? 'log') as MailTransportMode
  if (!['direct', 'smtp', 'log'].includes(transport)) throw new Error('MAIL_TRANSPORT must be direct, smtp or log')
  if (transport === 'smtp' && !process.env.SMTP_HOST) throw new Error('SMTP_HOST is required when MAIL_TRANSPORT=smtp')
  const from = process.env.MAIL_FROM ?? 'contact@lpc.vn'
  const fromDomain = from.split('@')[1]
  return {
    port: Number(process.env.PORT ?? 3003), host: process.env.HOST ?? '127.0.0.1',
    visitHashSecret: salt,
    database: { host: process.env.DB_HOST ?? '127.0.0.1', port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'doc_tools', password, database: process.env.DB_NAME ?? 'doc_tools',
      connectionLimit: 10, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: true },
    mail: {
      transport, from, fromName: process.env.MAIL_FROM_NAME ?? 'Chuyện Nhỏ',
      // Receiving servers compare HELO with the PTR record of our IP; default to the sender domain.
      heloName: process.env.MAIL_HELO_NAME || fromDomain,
      smtp: { host: process.env.SMTP_HOST ?? '', port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === '1',
        user: process.env.SMTP_USER ?? '', pass: process.env.SMTP_PASS ?? '' },
      dkim: { domain: process.env.MAIL_DKIM_DOMAIN || fromDomain, selector: process.env.MAIL_DKIM_SELECTOR ?? '', keyFile: process.env.MAIL_DKIM_KEY_FILE ?? '' },
    },
    auth: {
      otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 600),
      otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
      sessionDays: Number(process.env.SESSION_DAYS ?? 30),
      cookieSecure: process.env.COOKIE_SECURE !== '0',
      // Browsers send Origin on every write; an empty list accepts any origin (local dev only).
      allowedOrigins: list(process.env.SITE_ORIGINS),
    },
    goclaw: {
      url: process.env.GOCLAW_URL ?? 'http://localhost:18790',
      gatewayToken: process.env.GOCLAW_GATEWAY_TOKEN ?? '',
      publicWsUrl: process.env.GOCLAW_PUBLIC_WS_URL ?? '',
      publicFilesUrl: process.env.GOCLAW_PUBLIC_FILES_URL ?? '',
    },
    mcp: { publicUrl: process.env.MCP_PUBLIC_URL ?? '', allowedIps: list(process.env.MCP_ALLOWED_IPS), serverName: 'chuyen-nho' },
    ai: {
      // Development only: lets an openai_compat provider point at a local model server.
      allowPrivateApiBase: process.env.AI_DEV_ALLOW_PRIVATE_API_BASE === '1',
      ticketTtlSeconds: Number(process.env.AI_TICKET_TTL_SECONDS ?? 900),
      uploads: {
        dir: process.env.AI_UPLOAD_DIR || join(process.cwd(), 'data', 'ai-uploads'),
        // GoClaw stops reading a media URL at 10 MiB and keeps the truncated file, so larger files
        // would reach the model cut short without any error.
        maxBytes: Math.min(Number(process.env.AI_UPLOAD_MAX_BYTES ?? 10 * MIB), 10 * MIB),
        dailyBytes: Number(process.env.AI_UPLOAD_DAILY_BYTES ?? 2048 * MIB),
        retentionDays: Number(process.env.AI_UPLOAD_RETENTION_DAYS ?? 7),
        // Base of /api/v1 as GoClaw reaches it; defaults to the host already given for MCP callbacks.
        publicApiUrl: (process.env.AI_UPLOAD_PUBLIC_URL || (process.env.MCP_PUBLIC_URL ?? '').replace(/\/mcp\/sse\/?$/, '')).replace(/\/+$/, ''),
        linkTtlSeconds: 300,
      },
    },
  }
}
