import { SEARCH_INTENTS, SEARCH_INTENT_TEXT_FALLBACK } from '../config/intent-registry'
import { HANDWRITING_RECOGNITION_AVAILABLE } from '../config/tool-capabilities'
import type { ToolDefinition, ToolFilter } from '../types/tool.types'
import { closeWord, meaningfulWords, searchWords, unsupportedQuery } from './search-language'

const tokensOf = meaningfulWords
const INTENTS = SEARCH_INTENTS.map(intent => ({ intent, phrases: [intent.canonical, ...intent.aliases].map(meaningfulWords),
  required: intent.requiredTerms?.map(group => group.map(searchWords)), excluded: intent.excludedTerms?.map(searchWords) }))

function intentScore(query: string[], words: string[]): number {
  if (!words.length || words.some(word => !query.some(token => closeWord(token, word)))) return 0
  const coverage = query.filter(token => words.some(word => closeWord(token, word))).length / query.length
  return coverage >= 0.7 ? coverage * 100 + words.length : 0
}

export interface SearchOptions {
  /** Mặc định theo `SEARCH_INTENT_TEXT_FALLBACK`; test truyền thẳng để kiểm cả hai nhánh. */
  intentFallback?: boolean
}

function rankByText<T extends ToolDefinition>(ready: readonly T[], query: string[]): T[] {
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

/** Rank only usable tools; an empty query retains the original directory order. */
export function searchTools<T extends ToolDefinition>(catalog: readonly T[], keyword: string, filter: ToolFilter = 'all', options: SearchOptions = {}): T[] {
  const { intentFallback = SEARCH_INTENT_TEXT_FALLBACK } = options
  const available = catalog.filter(tool => filter === 'all' || tool.categories.includes(filter))
  if (!keyword.trim()) return [...available]
  const text = keyword.slice(0, 4000)
  const query = meaningfulWords(text)
  const allWords = searchWords(text)
  if (!query.length) return []
  if (unsupportedQuery(text)) return []
  if (!HANDWRITING_RECOGNITION_AVAILABLE && query.includes('tay') && (query.includes('viet') || query.includes('chu'))) return []
  const ready = available.filter(tool => tool.status === 'ready')
  const contains = (words: string[]) => words.length > 0 && words.every(word => allWords.some(token => closeWord(token, word)))
  const intents = INTENTS.map(({ intent, phrases, required, excluded }) => {
    if (excluded?.some(contains)) return { intent, score: 0 }
    if (intent.id === 'image.compress' && /\bnền\b/u.test(text.normalize('NFC').toLowerCase()) && !/\bnén\b/u.test(text.normalize('NFC').toLowerCase())) return { intent, score: 0 }
    const operationMatch = phrases.some(words => words.length >= 2 && contains(words))
    const conceptScore = required?.every(group => group.some(contains)) ? 90 + required.length * 5 + (operationMatch ? 20 : 0) : 0
    return { intent, score: Math.max(conceptScore, ...phrases.map(words => intentScore(query, words))) }
  })
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score)
  if (intents.length) {
    const best = intents[0]
    const ids = [best.intent.preferredTool, ...best.intent.acceptableTools]
    const matches = ids.flatMap(id => ready.filter(tool => tool.id === id && !best.intent.forbiddenTools.includes(id)))
    if (matches.length || !intentFallback) return best.intent.handoff ? matches.map(tool => ({ ...tool, searchParams: new URLSearchParams({ ocrProfile: best.intent.handoff!.profile, ocrOutput: best.intent.handoff!.output }).toString() })) : matches
    return rankByText(ready.filter(tool => !best.intent.forbiddenTools.includes(tool.id)), query)
  }
  return rankByText(ready, query)
}
