export type StaffRole = 'owner' | 'admin' | 'reviewer'

export type Permission =
  | 'dashboard.view' | 'tools.view' | 'contributions.review'
  | 'users.view' | 'users.manage' | 'plans.manage' | 'mail.view' | 'mail.test' | 'ai.view' | 'ai.manage'
  | 'settings.manage' | 'roles.manage' | 'audit.view'

export interface Staff { id: string; email: string; role: StaffRole; permissions: Permission[] }

export interface Paged<T> { page: number; pageSize: number; total: number; items: T[] }

export interface DayValue { day: string; value: number }

export interface ToolCount { tool: string; inRange: number; allTime: number; lastVisitAt: number | null }

export interface Overview {
  users: { total: number; new7: number; new30: number; active7: number; disabled: number; staff: number }
  pro: { active: number; expiring7: number }
  contributions: Partial<Record<ContributionStatus, number>>
  mail7: Partial<Record<MailStatus, number>>
  visits14: DayValue[]
  signups14: DayValue[]
  topTools7: ToolCount[]
}

export interface UserRow {
  id: string; email: string; displayName: string | null; status: 'active' | 'disabled'; role: StaffRole | null
  /** Epoch seconds, exclusive (midnight Vietnam after the last day). */
  proEndsAt: number | null
  contributions: number; createdAt: string; lastLoginAt: string | null
}

export interface UserDetail {
  user: UserRow & { publicAttribution: boolean }
  plans: { startsAt: number; endsAt: number; revokedAt: number | null; grantedBy: string; note: string | null }[]
  sessions: { createdAt: number; lastSeenAt: number; expiresAt: number }[]
  contributions: { id: string; toolId: string; domain: string; status: ContributionStatus; attribution: boolean; createdAt: string }[]
  userAudit: { action: string; actor: string; note: string | null; createdAt: string }[]
  adminAudit: AuditRow[]
}

export const CONTRIBUTION_STATUSES = ['NEEDS_SOURCE', 'NEEDS_REVIEW', 'VERIFIED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'SUPERSEDED', 'REVOKED'] as const
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number]

export interface ContributionRow {
  id: string; toolId: string; domain: string; risk: 'LOW' | 'MEDIUM' | 'HIGH'; status: ContributionStatus
  submitterEmail: string | null; changeCount: number; sourceCount: number; summary: string; createdAt: string
}

export interface ContributionList extends Paged<ContributionRow> { domains: { domain: string; status: ContributionStatus; total: number }[] }

export interface ContributionDetail {
  contribution: {
    id: string; toolId: string; domain: string; risk: ContributionRow['risk']; status: ContributionStatus
    baseSnapshotId: string | null; jurisdiction: string | null
    proposedChanges: { field: string; before: string; after: string }[]
    sourceRefs: { url: string; type: string }[]
    reviewedBy: string | null; approvedBy: string | null; publishedDigest: string | null
    submitterEmail: string | null; attribution: boolean | null; createdAt: string
  }
  trail: { action: string; actor: string; note: string | null; createdAt: string }[]
}

export type Transition = 'verify' | 'approve' | 'reject' | 'publish' | 'supersede' | 'revoke'

export const MAIL_STATUSES = ['pending', 'sending', 'sent', 'failed'] as const
export type MailStatus = (typeof MAIL_STATUSES)[number]

export interface MailRow {
  id: number; to: string; template: string; status: MailStatus; attempts: number
  nextAttemptAt: number | null; expiresAt: number | null; lastError: string | null; createdAt: number; sentAt: number | null
}

export interface SystemStatus {
  mail: {
    transport: 'direct' | 'smtp' | 'log'; from: string; fromName: string; heloName: string
    smtp: { host: string | null; port: number; secure: boolean; userSet: boolean; passwordSet: boolean }
    dkim: { domain: string; selector: string | null; privateKeySet: boolean; keyFileSet: boolean; keyFileReadable: boolean }
  }
  auth: { allowedOrigins: string[]; cookieSecure: boolean; otpTtlSeconds: number; sessionDays: number }
  rules: { signingPublicKeySet: boolean }
  goclaw: { url: string; gatewayTokenSet: boolean; publicWsUrl: string | null; publicFilesUrl: string | null }
  mcp: { publicUrl: string | null; allowedIps: string[] }
}

export interface MailList extends Paged<MailRow> { config: SystemStatus['mail'] }

export type IntegrationGroup = 'mail' | 'goclaw'
export type MailTransport = SystemStatus['mail']['transport']

/** `ui` = set in the admin area, `env` = from the backend `.env`, `null` = not set anywhere. */
export interface SecretState { source: 'ui' | 'env' | null; updatedBy: string | null; updatedAt: string | null; readable: boolean }

export interface MailValues {
  transport: MailTransport; from: string; fromName: string; heloName: string
  smtpHost: string; smtpPort: number; smtpSecure: boolean; smtpUser: string; dkimDomain: string; dkimSelector: string
}
export interface GoclawValues { url: string; publicWsUrl: string; publicFilesUrl: string; mcpPublicUrl: string; mcpAllowedIps: string[] }

interface IntegrationMeta { source: 'ui' | 'env'; updatedBy: string | null; updatedAt: string | null }
export interface DkimRecord { host: string; value: string }

export interface Integrations {
  encryptionReady: boolean; envOnly: boolean
  mail: IntegrationMeta & { values: MailValues; dkimRecord: DkimRecord | null; secrets: { smtpPassword: SecretState; dkimPrivateKey: SecretState } }
  goclaw: IntegrationMeta & { values: GoclawValues; secrets: { gatewayToken: SecretState } }
}

/** A typed secret: new value, `null` to remove, absent to keep. */
export type SecretChange = string | null | undefined

export interface DnsCheck { name: string; host: string; state: 'ok' | 'missing' | 'warning' | 'error'; value: string | null; hint: string }

export interface ToolsStats { days: number; series: DayValue[]; tools: ToolCount[] }

interface SettingBase { key: string; label: string; help: string; overridden: boolean; updatedBy: string | null; updatedAt: string | null }
export type Setting =
  | SettingBase & { type: 'boolean'; default: boolean; value: boolean }
  | SettingBase & { type: 'integer'; default: number; value: number; min: number; max: number; unit?: string }
  | SettingBase & { type: 'choices'; default: string[]; value: string[]; choices: string[] }

export interface RoleHolder { userId: string; email: string; displayName: string | null; role: StaffRole; grantedBy: string; grantedAt: string }

export type AiProviderStatus = 'verifying' | 'ready' | 'failed' | 'disabled'

export interface AiAccountRow {
  userId: string; email: string; type: string; apiBase: string; model: string | null; status: AiProviderStatus; lastError: string | null
  /** Epoch seconds. */
  verifiedAt: number | null; updatedAt: number
  agentStatus: 'active' | 'inactive' | null; agentKey: string | null; promptVersion: number | null
}

export interface AiAccountList extends Paged<AiAccountRow> { promptVersion: number }

export interface AiStatus {
  configured: boolean; reachable: boolean; url: string; publicWsUrl: string | null; mcpPublicUrl: string | null; mcpServerName: string
  mcpRegistered: boolean; mcpEnabled?: boolean | null; mcpUrl?: string | null; allowPrivateApiBase: boolean; promptVersion: number
  backgroundProvider: string | null; error: string | null
  /** Last hourly reconciliation in this server process; null until the first run (5 minutes after start). */
  reconcile: { at: number; checked: number; expired: number; drift: number; stray: number; errors: number } | null
}

export interface AuditRow { id: number; actorId: string; actorEmail: string; action: string; targetType: string; targetId: string | null; detail: string | null; createdAt: string }
