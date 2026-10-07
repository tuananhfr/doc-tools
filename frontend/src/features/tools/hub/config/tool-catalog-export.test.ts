import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CATALOG_OUTPUT, buildToolCatalog, serializeCatalog } from '../../../../../scripts/export-tool-catalog.mjs'

describe('backend/data/tool-catalog.json', () => {
  it('matches the tool list, catalog text and guides (run scripts/export-tool-catalog.mjs after editing them)', async () => {
    const committed = fs.readFileSync(CATALOG_OUTPUT, 'utf8').replace(/\r\n/g, '\n')
    expect(committed === serializeCatalog(await buildToolCatalog())).toBe(true)
  })
})
