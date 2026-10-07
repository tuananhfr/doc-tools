import { normalizeTextSearch } from '@/utils/text-search'
import { SEARCH_INTENTS, SEARCH_TYPOS } from '../config/intent-registry'
import type { ToolDefinition, ToolFilter } from '../types/tool.types'

const STOPWORDS = new Set('toi minh ban muon can lam cach nao co the giup cho voi mot hai ba cac nhung tep file qua nay duoc khong de thi va tu'.split(' '))
const tokensOf = (text: string): string[] => [...new Set(normalizeTextSearch(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean))]
const queryTokens = (text: string) => tokensOf(text).flatMap(token => (SEARCH_TYPOS[token] ?? token).split(' ')).filter(token => !STOPWORDS.has(token))
const INTENTS = SEARCH_INTENTS.map(intent => ({ intent, phrases: [intent.canonical, ...intent.aliases].map(queryTokens),
  required: intent.requiredTerms?.map(group => group.map(queryTokens)), excluded: intent.excludedTerms?.map(queryTokens) }))

function closeWord(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    const different = [...a].map((char, i) => char === b[i] ? -1 : i).filter(i => i >= 0)
    return different.length === 1 || (different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]])
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  let skipped = false
  let index = 0
  for (const char of long) {
    if (char === short[index]) index++
    else if (skipped) return false
    else skipped = true
  }
  return index === short.length
}

function intentScore(query: string[], words: string[]): number {
  if (!words.length || words.some(word => !query.some(token => closeWord(token, word)))) return 0
  const coverage = query.filter(token => words.some(word => closeWord(token, word))).length / query.length
  return coverage >= 0.7 ? coverage * 100 + words.length : 0
}

/** Rank only usable tools; an empty query retains the original directory order. */
export function searchTools<T extends ToolDefinition>(catalog: readonly T[], keyword: string, filter: ToolFilter = 'all'): T[] {
  const available = catalog.filter(tool => filter === 'all' || tool.categories.includes(filter))
  if (!keyword.trim()) return [...available]
  const query = queryTokens(keyword.slice(0, 4000))
  if (!query.length) return []
  const ready = available.filter(tool => tool.status === 'ready')
  const contains = (words: string[]) => words.every(word => query.includes(word))
  const intents = INTENTS.map(({ intent, phrases, required, excluded }) => {
    const operationMatch = phrases.some(words => words.length >= 2 && contains(words))
    const conceptScore = required?.every(group => group.some(contains)) && !excluded?.some(contains) ? 80 + required.length + (operationMatch ? 20 : 0) : 0
    return { intent, score: Math.max(conceptScore, ...phrases.map(words => intentScore(query, words))) }
  })
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score)
  if (intents.length) {
    const best = intents[0]
    const ids = [best.intent.preferredTool, ...best.intent.acceptableTools]
    return ids.flatMap(id => ready.filter(tool => tool.id === id && !best.intent.forbiddenTools.includes(id)))
  }
  return ready.map((tool, index) => {
    const name = tokensOf(tool.name)
    const synonyms = tool.synonyms.map(tokensOf)
    const description = tokensOf(tool.description)
    const fields = [...name, ...synonyms.flat(), ...description]
    if (!query.every(token => fields.some(word => closeWord(token, word)))) return { tool, score: 0, index }
    const exactName = query.length === name.length && query.every(token => name.includes(token))
    const exactAlias = synonyms.some(words => query.length === words.length && query.every(token => words.includes(token)))
    const score = (exactName ? 100 : exactAlias ? 80 : 0) + query.reduce((sum, token) => sum + (name.includes(token) ? 8 : synonyms.some(words => words.includes(token)) ? 5 : description.includes(token) ? 2 : 1), 0)
    return { tool, score, index }
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.tool)
}
