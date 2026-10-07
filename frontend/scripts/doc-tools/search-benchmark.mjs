import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = path.resolve(import.meta.dirname, '../..')
const cache = new Map()
function load(relative, overrides = {}) {
  const file = path.join(root, relative)
  if (cache.has(file)) return cache.get(file)
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const localRequire = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name]
    let resolved = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(file), name)
    if (!resolved.startsWith(path.join(root, 'src') + path.sep)) throw new Error('Only pure source modules may be loaded')
    if (resolved.endsWith('.json')) return JSON.parse(fs.readFileSync(resolved, 'utf8'))
    if (fs.existsSync(resolved + '.ts')) resolved += '.ts'
    else resolved = path.join(resolved, 'index.ts')
    return load(path.relative(root, resolved))
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, URLSearchParams }, { filename: file })
  cache.set(file, module.exports)
  return module.exports
}
const entries = load('src/features/tools/hub/config/tool-list.ts').ALL_TOOLS
const messages = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/messages/vi/catalog.json'), 'utf8'))
const catalog = load('src/features/tools/hub/utils/tool-text.ts').localizeTools(entries, messages)
const { filterTools } = load('src/features/tools/hub/utils/tool-lookup.ts', { '../config/tool-catalog': { TOOL_CATALOG: catalog } })
const { SEARCH_STORIES, SEARCH_STORIES_VERSION } = load('src/features/tools/hub/config/search-stories.ts')
const cases = SEARCH_STORIES.map(story => {
  const ids = filterTools(catalog, 'all', story.query).map(tool => tool.id)
  return { id: story.id, expected: story.preferredTool, top3: ids.slice(0, 3), top1: story.preferredTool ? ids[0] === story.preferredTool : ids.length === 0, acceptableTop3: story.preferredTool ? ids.slice(0, 3).includes(story.preferredTool) : ids.length === 0, forbidden: ids.filter(id => story.forbiddenTools.includes(id)), zeroResult: ids.length === 0, reviewStatus: story.status }
})
const positive = cases.filter(item => item.expected)
const negative = cases.filter(item => !item.expected)
const report = { version: SEARCH_STORIES_VERSION, scope: 'Vietnamese source benchmark; draft stories, no release thresholds', cases, metrics: { positives: positive.length, negatives: negative.length, top1: positive.filter(item => item.top1).length / positive.length, top3: positive.filter(item => item.acceptableTop3).length / positive.length, zeroResult: positive.filter(item => item.zeroResult).length / positive.length, falseMatch: negative.filter(item => !item.zeroResult).length / negative.length } }
const out = process.env.SEARCH_REPORT
if (out) {
  const file = path.resolve(out)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8')
}
console.log(JSON.stringify(report.metrics))
console.log(JSON.stringify(cases.filter(item => !item.top1 || item.forbidden.length)))
if (process.argv.includes('--check') && cases.some(item => !item.acceptableTop3 || item.forbidden.length)) process.exitCode = 1
