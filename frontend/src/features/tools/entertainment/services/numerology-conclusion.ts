import { NUMEROLOGY_METRIC_ROLES } from '../config/numerology-method'
import { NUMEROLOGY_CONCLUSION_CUES } from '../data/numerology-conclusion-cues'
import { numberConclusionLink } from '../data/numerology-conclusion-links'
import type { NumerologyMetricId } from '../data/numerology-meanings'
import type { InterpretedMetric } from '../types/conclusion.types'
import { firstSentence, type ReadingSummary } from './reading-summary'

type CoreMetricId = Exclude<NumerologyMetricId, 'personal_year'>
const coreOrder: readonly CoreMetricId[] = ['life_path', 'soul_urge', 'expression', 'personality', 'birthday']
const pairOrder: readonly (readonly [CoreMetricId, CoreMetricId])[] = [
  ['life_path', 'soul_urge'], ['life_path', 'expression'], ['soul_urge', 'personality'],
  ['life_path', 'personality'], ['life_path', 'birthday'], ['expression', 'soul_urge'],
  ['expression', 'personality'], ['soul_urge', 'birthday'], ['expression', 'birthday'], ['personality', 'birthday'],
]

function cueFor(item: InterpretedMetric) {
  return NUMEROLOGY_CONCLUSION_CUES[item.metric.value!]
}

function metricPhrase(item: InterpretedMetric) {
  const id = item.metric.id as CoreMetricId
  return cueFor(item)[id]
}

function pairedParagraph(first: InterpretedMetric, second: InterpretedMetric) {
  const link = numberConclusionLink(cueFor(first).family, cueFor(second).family)
  return { phrases: `${metricPhrase(first)} ${metricPhrase(second)}`, link: link.text, advice: link.advice }
}

export function numerologyConclusion(metrics: readonly InterpretedMetric[], year: number): ReadingSummary | null {
  const known = metrics.filter(item => item.metric.value !== null)
  if (!known.length || known.some(item => !item.meaning || !Object.hasOwn(NUMEROLOGY_CONCLUSION_CUES, item.metric.value!) || !Object.hasOwn(NUMEROLOGY_METRIC_ROLES, item.metric.id))) return null
  if (new Set(known.map(item => item.metric.id)).size !== known.length) return null
  const find = (id: string) => known.find(item => item.metric.id === id)
  const core = coreOrder.flatMap(id => { const item = find(id); return item ? [item] : [] })
  const primaryIds = pairOrder.find(([first, second]) => find(first) && find(second))
  const primary = primaryIds ? pairedParagraph(find(primaryIds[0])!, find(primaryIds[1])!) : null
  // Different metric pairs can share a family pair; repeating its link sentence reads like a copy-paste bug.
  const usedLinks = new Set<string>()
  const withLink = (phrases: string, link: string) => usedLinks.has(link) ? phrases : (usedLinks.add(link), `${phrases} ${link}`)
  const paragraphs = primary ? [withLink(primary.phrases, primary.link)] : core.length ? [metricPhrase(core[0])] : []
  const usedIds: readonly string[] = primaryIds ?? (core[0] ? [core[0].metric.id] : [])
  const remaining = core.filter(item => !usedIds.includes(item.metric.id))
  if (remaining.length >= 2) {
    const second = pairedParagraph(remaining[0], remaining[1])
    paragraphs.push(withLink(second.phrases, second.link))
  } else if (remaining.length === 1 && remaining[0].metric.id !== 'birthday') {
    const anchor = core[0]
    const link = numberConclusionLink(cueFor(anchor).family, cueFor(remaining[0]).family)
    paragraphs.push(withLink(metricPhrase(remaining[0]), link.text))
  }
  const personalYear = find('personal_year')
  const life = find('life_path')
  const period = personalYear ? {
    title: `Năm cá nhân ${year} · ${personalYear.metric.value}`,
    text: cueFor(personalYear).personal_year + (life ? ` ${numberConclusionLink(cueFor(life).family, cueFor(personalYear).family).text}` : ''),
    advice: personalYear.meaning!.advice,
  } : undefined
  return {
    conclusion: { paragraphs, advice: primary?.advice ?? core[0]?.meaning?.advice ?? '', ...(period ? { period } : {}) },
    items: core.map(item => ({
      label: `${NUMEROLOGY_METRIC_ROLES[item.metric.id].name}: ${item.metric.value}`, role: '',
      text: firstSentence(item.meaning!.text),
    })),
  }
}
