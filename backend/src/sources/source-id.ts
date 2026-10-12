// Lowercase slug, 3-64 chars: it is printed in signed packages and URLs, so no case or encoding games.
export const SOURCE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,62})[a-z0-9]$/

export function isSourceId(value: unknown): value is string {
  return typeof value === 'string' && SOURCE_ID_PATTERN.test(value)
}
