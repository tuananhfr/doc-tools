// Writes backend/data/tool-catalog.json: the tool list, its text in every language and the guides,
// for the AI assistant's `cn_*` MCP tools. The backend is deployed on its own and cannot read the
// frontend sources, so the file is committed; `tool-catalog-export.test.ts` fails when it is stale.
// Run: node scripts/export-tool-catalog.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const CATALOG_OUTPUT = path.resolve(root, '..', 'backend', 'data', 'tool-catalog.json')
const SYNONYM_SEPARATOR = /\s*[,，、،]\s*/

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

export async function buildToolCatalog() {
  // Both files hold data with `import type` only, so Node's type stripping can load them directly.
  const { ALL_TOOLS } = await import(pathToFileURL(path.join(root, 'src/features/tools/hub/config/tool-list.ts')).href)
  const { GUIDES } = await import(pathToFileURL(path.join(root, 'src/features/site/config/guides.ts')).href)
  const messagesDir = path.join(root, 'src/i18n/messages')
  const locales = fs.readdirSync(messagesDir).filter((name) => fs.existsSync(path.join(messagesDir, name, 'catalog.json'))).sort()
  const catalog = Object.fromEntries(locales.map((locale) => [locale, readJson(path.join(messagesDir, locale, 'catalog.json'))]))
  const guides = Object.fromEntries(locales.map((locale) => [locale, readJson(path.join(messagesDir, locale, 'guides.json'))]))

  return {
    locales,
    tools: ALL_TOOLS.map((tool) => ({
      id: tool.id, slug: tool.slug, status: tool.status, noFile: Boolean(tool.noFile), categories: tool.categories,
      text: Object.fromEntries(locales.flatMap((locale) => {
        const text = catalog[locale].tools?.[tool.id]
        if (!text?.name) return []
        return [[locale, { name: text.name, description: text.description ?? '', synonyms: text.synonyms ? text.synonyms.split(SYNONYM_SEPARATOR).filter(Boolean) : [], ...(text.privacyNote ? { privacyNote: text.privacyNote } : {}) }]]
      })),
    })),
    guides: GUIDES.map((guide) => ({
      slug: guide.slug, toolIds: guide.toolIds,
      text: Object.fromEntries(locales.flatMap((locale) => {
        const text = guides[locale].items?.[guide.slug]
        if (!text?.title) return []
        return [[locale, {
          title: text.title, summary: text.summary, intro: text.intro,
          steps: guide.steps.map((id) => text.steps?.[id]).filter(Boolean),
          tips: guide.tips.map((id) => text.tips?.[id]).filter(Boolean),
          notes: guide.notes.map((id) => text.notes?.[id]).filter(Boolean),
        }]]
      })),
    })),
  }
}

export const serializeCatalog = (catalog) => JSON.stringify(catalog) + '\n'

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await buildToolCatalog()
  fs.mkdirSync(path.dirname(CATALOG_OUTPUT), { recursive: true })
  fs.writeFileSync(CATALOG_OUTPUT, serializeCatalog(catalog))
  console.log(`${catalog.tools.length} tools, ${catalog.guides.length} guides, ${catalog.locales.length} locales -> ${path.relative(process.cwd(), CATALOG_OUTPUT)}`)
}
