import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

export function validateDataset(dataset) {
  const issues = []
  if (dataset.version !== 2 || !Array.isArray(dataset.cases)) return ['Expected dataset version 2 with cases']
  const ids = new Set(), writers = new Map()
  for (const item of dataset.cases) {
    const fail = message => issues.push(`${item.id ?? '?'}: ${message}`)
    if (!item.id || ids.has(item.id)) fail('missing or duplicate id')
    ids.add(item.id)
    if (!['synthetic', 'real'].includes(item.source)) fail('invalid source')
    if (!['tuning', 'holdout', 'unassigned'].includes(item.split)) fail('invalid split')
    if (item.permission !== (item.source === 'real' ? 'user-authorized-local' : 'generated')) fail('permission does not match source')
    if (!Array.isArray(item.tags)) fail('missing tags')
    const truth = item.copyTruth ? dataset.cases.find(other => other.id === item.copyTruth)?.groundTruth : item.groundTruth
    if (!truth || !['generated', 'pending', 'human-approved'].includes(truth.status)) fail('invalid ground truth status')
    if (item.source === 'real' && truth?.status === 'generated') fail('real input cannot have generated ground truth')
    if (truth?.status === 'human-approved' && (!truth.reviewer || !truth.reviewedAt || !Number.isFinite(Date.parse(truth.reviewedAt)))) fail('approved ground truth requires reviewer and date')
    if (truth?.status !== 'pending' && typeof truth?.text !== 'string') fail('measurable ground truth requires text')
    if (item.source === 'real' && item.split !== 'unassigned') {
      if (!item.writerId) fail('real split requires writer id')
      else if (writers.has(item.writerId) && writers.get(item.writerId) !== item.split) fail('writer leaks between tuning and holdout')
      else writers.set(item.writerId, item.split)
    }
    if (item.inputSha256 && !/^[a-f0-9]{64}$/.test(item.inputSha256)) fail('invalid input hash')
    const occupied = new Set()
    for (const cell of truth?.cells ?? []) {
      if (![cell.row, cell.column].every(value => Number.isInteger(value) && value >= 0) || typeof cell.text !== 'string') fail('invalid cell ground truth')
      const spans = [cell.rowSpan ?? 1, cell.columnSpan ?? 1]
      if (!spans.every(value => Number.isInteger(value) && value > 0 && value <= 64)) { fail('invalid cell spans'); continue }
      for (let row = cell.row; row < cell.row + spans[0]; row++) for (let column = cell.column; column < cell.column + spans[1]; column++) {
        const key = `${row}:${column}`
        if (occupied.has(key)) fail('overlapping cells')
        occupied.add(key)
        if (truth.rows && row >= truth.rows || truth.columns && column >= truth.columns) fail('cell exceeds table dimensions')
      }
      if (cell.quad && (cell.quad.length !== 4 || cell.quad.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y)))) fail('invalid cell coordinates')
    }
    for (const field of truth?.fields ?? []) if (!field.id || typeof field.text !== 'string' || !['text', 'money', 'date', 'identifier'].includes(field.kind)) fail('invalid field ground truth')
  }
  return issues
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dataset = JSON.parse(fs.readFileSync(process.argv[2] ?? new URL('./benchmark/ocr-cases-v2.json', import.meta.url), 'utf8'))
  const issues = validateDataset(dataset)
  console.log(JSON.stringify({ version: dataset.version, cases: dataset.cases.length, measurable: dataset.cases.filter(item => item.groundTruth.status !== 'pending').length,
    pending: dataset.cases.filter(item => item.groundTruth.status === 'pending').map(item => item.id), issues }, null, 2))
  if (issues.length) process.exitCode = 1
}
