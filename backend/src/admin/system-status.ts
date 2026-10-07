import { existsSync } from 'node:fs'
import { configuration } from '../config/configuration'

/**
 * Which `.env` secrets and endpoints are configured. Values are never returned, only whether they
 * are set, so this is safe to show to any staff member who can open the settings screen.
 */
export function systemStatus() {
  const config = configuration()
  const { mail, auth, goclaw, mcp } = config
  return {
    mail: {
      transport: mail.transport, from: mail.from, fromName: mail.fromName, heloName: mail.heloName,
      smtp: { host: mail.smtp.host || null, port: mail.smtp.port, secure: mail.smtp.secure, userSet: Boolean(mail.smtp.user), passwordSet: Boolean(mail.smtp.pass) },
      dkim: { domain: mail.dkim.domain, selector: mail.dkim.selector || null, keyFileSet: Boolean(mail.dkim.keyFile), keyFileReadable: Boolean(mail.dkim.keyFile) && existsSync(mail.dkim.keyFile) },
    },
    auth: { allowedOrigins: auth.allowedOrigins, cookieSecure: auth.cookieSecure, otpTtlSeconds: auth.otpTtlSeconds, sessionDays: auth.sessionDays },
    rules: { signingPublicKeySet: Boolean(process.env.RULE_SIGNING_PUBLIC_KEY_PEM) },
    goclaw: { url: goclaw.url, gatewayTokenSet: Boolean(goclaw.gatewayToken), publicWsUrl: goclaw.publicWsUrl || null, publicFilesUrl: goclaw.publicFilesUrl || null },
    mcp: { publicUrl: mcp.publicUrl || null, allowedIps: mcp.allowedIps },
  }
}
