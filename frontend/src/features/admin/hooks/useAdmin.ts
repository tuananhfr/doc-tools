import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService, type AiQuery, type ContributionQuery, type UserQuery } from '../services/admin.service'
import type { IntegrationGroup, Integrations, StaffRole, Transition, UserDetail } from '../types/admin.types'

const ADMIN = ['admin'] as const
const key = {
  whoami: [...ADMIN, 'whoami'] as const,
  overview: [...ADMIN, 'overview'] as const,
  users: [...ADMIN, 'users'] as const,
  contributions: [...ADMIN, 'contributions'] as const,
  tools: [...ADMIN, 'tools'] as const,
  mail: [...ADMIN, 'mail'] as const,
  settings: [...ADMIN, 'settings'] as const,
  roles: [...ADMIN, 'roles'] as const,
  audit: [...ADMIN, 'audit'] as const,
  ai: [...ADMIN, 'ai'] as const,
  integrations: [...ADMIN, 'integrations'] as const,
}

// Staff errors (signed out, not staff, stale session) are answers, not glitches: retrying only delays them.
const once = { retry: false } as const

export function useWhoami() { return useQuery({ queryKey: key.whoami, queryFn: adminService.whoami, ...once, staleTime: 60_000 }) }
export function useOverview() { return useQuery({ queryKey: key.overview, queryFn: adminService.overview, ...once }) }

export function useUsers(params: UserQuery) {
  return useQuery({ queryKey: [...key.users, 'list', params], queryFn: () => adminService.users(params), placeholderData: keepPreviousData, ...once })
}
export function useUser(id: string | null) {
  return useQuery({ queryKey: [...key.users, 'detail', id], queryFn: () => adminService.user(id!), enabled: Boolean(id), ...once })
}

/** Every user action answers with the fresh detail, so the cache is written instead of refetched. */
export function useUserAction<A>(id: string, run: (args: A) => Promise<UserDetail>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (detail) => {
      client.setQueryData([...key.users, 'detail', id], detail)
      void client.invalidateQueries({ queryKey: [...key.users, 'list'] })
      void client.invalidateQueries({ queryKey: key.overview })
    },
  })
}

export function useDeleteUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmEmail }: { id: string; confirmEmail: string }) => adminService.deleteUser(id, confirmEmail),
    onSuccess: () => client.invalidateQueries({ queryKey: key.users }),
  })
}

export function useContributions(params: ContributionQuery) {
  return useQuery({ queryKey: [...key.contributions, 'list', params], queryFn: () => adminService.contributions(params), placeholderData: keepPreviousData, ...once })
}
export function useContribution(id: string | null) {
  return useQuery({ queryKey: [...key.contributions, 'detail', id], queryFn: () => adminService.contribution(id!), enabled: Boolean(id), ...once })
}
export function useTransition(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ action, note, digest }: { action: Transition; note: string; digest: string }) => adminService.transition(id, action, note, digest),
    // Failures too: a 409 means someone else moved it, and the screen should show where it is now.
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: key.contributions }), client.invalidateQueries({ queryKey: key.overview })]),
  })
}

export function useAiAccounts(params: AiQuery) {
  return useQuery({ queryKey: [...key.ai, 'list', params], queryFn: () => adminService.aiAccounts(params), placeholderData: keepPreviousData, ...once })
}
export function useAiStatus() {
  return useQuery({ queryKey: [...key.ai, 'status'], queryFn: adminService.aiStatus, staleTime: 30_000, ...once })
}
export function useAiSwitch() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, enable }: { userId: string; enable: boolean }) => enable ? adminService.enableAi(userId) : adminService.disableAi(userId),
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: [...key.ai, 'list'] }), client.invalidateQueries({ queryKey: key.audit })]),
  })
}

export function useToolsStats(days: number) {
  return useQuery({ queryKey: [...key.tools, days], queryFn: () => adminService.tools(days), placeholderData: keepPreviousData, ...once })
}

export function useMail(status: string | undefined, page: number) {
  return useQuery({ queryKey: [...key.mail, status, page], queryFn: () => adminService.mail(status, page), placeholderData: keepPreviousData, ...once })
}
export function useMailDns(enabled: boolean) {
  return useQuery({ queryKey: [...key.mail, 'dns'], queryFn: adminService.mailDns, enabled, staleTime: 5 * 60_000, ...once })
}
export function useSendTestMail() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (to: string) => adminService.sendTestMail(to), onSuccess: () => client.invalidateQueries({ queryKey: key.mail }) })
}

export function useSettings() { return useQuery({ queryKey: key.settings, queryFn: adminService.settings, ...once }) }
export function useSettingMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ settingKey, value }: { settingKey: string; value: unknown | undefined }) => value === undefined ? adminService.resetSetting(settingKey) : adminService.updateSetting(settingKey, value),
    onSuccess: (data) => client.setQueryData(key.settings, data),
  })
}

export function useIntegrations(enabled: boolean) {
  return useQuery({ queryKey: key.integrations, queryFn: adminService.integrations, enabled, ...once })
}

/** The mail queue, GoClaw status and settings screens all show the merged configuration, so all three refresh. */
function useIntegrationWrite<A, R extends Integrations>(run: (args: A) => Promise<R>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (data) => {
      client.setQueryData(key.integrations, data)
      void Promise.all([key.mail, key.ai, key.settings, key.audit].map((queryKey) => client.invalidateQueries({ queryKey })))
    },
  })
}
export function useSaveIntegration() {
  return useIntegrationWrite(({ group, password, values, secrets }: { group: IntegrationGroup; password: string; values: object; secrets: Record<string, string | null> }) => adminService.saveIntegration(group, password, values, secrets))
}
export function useResetIntegration() {
  return useIntegrationWrite(({ group, password }: { group: IntegrationGroup; password: string }) => adminService.resetIntegration(group, password))
}
export function useGenerateDkim() {
  return useIntegrationWrite(({ password, selector }: { password: string; selector: string }) => adminService.generateDkim(password, selector))
}
export function useVerifySmtp() { return useMutation({ mutationFn: adminService.verifySmtp }) }

export function useRegisterMcp() {
  const client = useQueryClient()
  return useMutation({ mutationFn: adminService.registerMcp, onSettled: () => client.invalidateQueries({ queryKey: key.ai }) })
}
export function useSyncAgents() {
  const client = useQueryClient()
  return useMutation({ mutationFn: adminService.syncAgents, onSettled: () => client.invalidateQueries({ queryKey: key.ai }) })
}

export function useRoles() { return useQuery({ queryKey: key.roles, queryFn: adminService.roles, ...once }) }
export function useRoleMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { grant: { email: string; role: StaffRole } } | { revoke: string }) => 'grant' in input ? adminService.grantRole(input.grant.email, input.grant.role) : adminService.revokeRole(input.revoke),
    onSuccess: (data) => {
      client.setQueryData(key.roles, data)
      void client.invalidateQueries({ queryKey: key.users })
    },
  })
}

export function useAudit(actor: string | undefined, target: string | undefined, page: number) {
  return useQuery({ queryKey: [...key.audit, actor, target, page], queryFn: () => adminService.audit(actor, target, page), placeholderData: keepPreviousData, ...once })
}

export function useForgetAdmin() {
  const client = useQueryClient()
  return () => client.removeQueries({ queryKey: ADMIN })
}
