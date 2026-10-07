import { isRecord, stringAt } from '@/utils/saved-payload'

export interface AddressInput { addresses: string; mappingText: string; useVerified: boolean }

// The page's own textarea caps; a saved item bigger than the cloud cap is refused by the server.
const ADDRESSES = 100_000
const MAPPING = 1_000_000

/** With the verified package in use the manual table is not needed to reopen, so it is left out. */
export function addressSnapshot(input: AddressInput): Record<string, unknown> | null {
  if (!input.addresses.trim()) return null
  return { v: 1, addresses: input.addresses, mappingText: input.useVerified ? '' : input.mappingText, useVerified: input.useVerified }
}

export function parseAddressSaved(payload: unknown): AddressInput | null {
  if (!isRecord(payload) || payload.v !== 1 || typeof payload.useVerified !== 'boolean') return null
  const addresses = stringAt(payload, 'addresses', ADDRESSES)
  const mappingText = stringAt(payload, 'mappingText', MAPPING)
  return addresses !== null && mappingText !== null ? { addresses, mappingText, useVerified: payload.useVerified } : null
}
