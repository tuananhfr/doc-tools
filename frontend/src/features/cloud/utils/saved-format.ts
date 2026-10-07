import { dateTimeFormat } from '@/i18n/intl'

/** Server times are Unix seconds; shown in the viewer's language and time zone. */
export const savedStamp = (seconds: number) => dateTimeFormat({ dateStyle: 'short', timeStyle: 'short' }).format(seconds * 1000)

/** Link that opens a saved item inside its tool; the tool's save bar reads `saved` once and drops it. */
export function savedItemPath(toolPath: string, id: string) {
  return `${toolPath}${toolPath.includes('?') ? '&' : '?'}saved=${encodeURIComponent(id)}`
}
