import { AccountError } from '../services/account.service'
import type { AccountErrorCode } from '../types/account.types'

export function accountErrorCode(error: unknown): AccountErrorCode {
  return error instanceof AccountError ? error.code : 'UNKNOWN'
}
