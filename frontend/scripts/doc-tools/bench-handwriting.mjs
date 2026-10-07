import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const models = JSON.parse(fs.readFileSync(new URL('./benchmark/handwriting-models.json', import.meta.url), 'utf8'))
const dataset = JSON.parse(fs.readFileSync(new URL('./benchmark/ocr-cases-v2.json', import.meta.url), 'utf8'))
const input = process.env.HANDWRITING_INPUT
const sample = input ? { sha256: createHash('sha256').update(fs.readFileSync(input)).digest('hex'), permission: 'user-authorized-local', groundTruth: 'pending' } : null
const report = { status: 'blocked', sample, models: models.candidates, measurableCases: dataset.cases.filter(item => item.source === 'real' && item.groundTruth.status === 'human-approved').length,
  accuracy: null, reason: 'Do not promote a model or report handwriting accuracy without the required evidence.' }
const out = path.resolve(process.env.QA_OUT ?? 'qa-output/handwriting')
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'readiness.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ status: report.status, sampleHash: sample?.sha256 ?? null, measurableCases: report.measurableCases, blockers: models.candidates.flatMap(model => model.blockers) }))
process.exitCode = 2
