import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const models = JSON.parse(fs.readFileSync(new URL('./benchmark/handwriting-models.json', import.meta.url), 'utf8'))
const dataset = JSON.parse(fs.readFileSync(new URL('./benchmark/ocr-cases-v2.json', import.meta.url), 'utf8'))
const input = process.env.HANDWRITING_INPUT
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const sample = input ? { sha256: hash(input), permission: 'user-authorized-local', groundTruth: 'pending' } : null
const approved = dataset.cases.filter(item => item.source === 'real' && item.groundTruth.status === 'human-approved')
const writers = new Set(approved.map(item => item.writerId).filter(Boolean))
const holdout = new Set(approved.filter(item => item.split === 'holdout').map(item => item.writerId).filter(Boolean))
const training = new Set(approved.filter(item => item.split === 'train').map(item => item.writerId).filter(Boolean))
const leakedWriters = [...holdout].filter(writer => training.has(writer))
const artifactCheck = (file, expected) => Boolean(file && expected && fs.existsSync(path.resolve(file)) && hash(path.resolve(file)) === expected)
const checks = [
  { name: 'Real human-approved transcripts', passed: approved.length > 0, count: approved.length },
  { name: 'Independent multi-writer holdout', passed: writers.size >= 2 && holdout.size > 0 && leakedWriters.length === 0, writers: writers.size, holdoutWriters: holdout.size, leakedWriters },
  ...models.candidates.flatMap(model => [
    { model: model.id, name: 'Verified weight license and pinned bytes', passed: Boolean(model.weightsLicense) && artifactCheck(model.weightsFile, model.weightsSha256) },
    { model: model.id, name: 'Pinned browser model and tokenizer', passed: artifactCheck(model.browserArtifact, model.browserArtifactSha256) && artifactCheck(model.tokenizerFile, model.tokenizerSha256) },
    { model: model.id, name: 'Implemented browser inference and real mobile memory evidence', passed: model.runtimeImplemented === true && model.mobileValidation?.status === 'passed' },
  ]),
]
const report = { createdAt: new Date().toISOString(), status: 'blocked', recognitionExecuted: false, kind: 'model and dataset readiness assessment; no handwriting recognition benchmark executed', sample,
  models: models.candidates, measurableCases: approved.length, checks, accuracy: null,
  reason: 'The current repository has no implemented handwriting runtime or verified browser artifacts. Readiness checks are not an accuracy measurement.' }
const out = path.resolve(process.env.QA_OUT ?? 'qa-output/handwriting')
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'readiness.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ status: report.status, recognitionExecuted: false, measurableCases: report.measurableCases, missingEvidence: checks.filter(check => !check.passed).map(check => check.name) }))
process.exitCode = 2
