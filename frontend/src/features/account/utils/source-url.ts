import { checkSourceUrl } from '@/features/community/utils/contribution-check'

export function isHttpsUrl(value: string): boolean {
  return Boolean(value.trim()) && checkSourceUrl(value.trim()) === 'ok'
}
