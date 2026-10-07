import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const manifest = JSON.parse(fs.readFileSync(new URL('./doc-tools/benchmark/handwriting-models.json', import.meta.url), 'utf8'))
const approved = manifest.candidates.filter(model => model.status === 'approved')
for (const model of approved) {
  if (!model.weightsLicense || !model.weightsSha256 || !model.browserArtifact || !model.tokenizerArtifact || !model.tokenizerSha256 || !model.browserValidation?.passed) throw new Error(`Incomplete model evidence: ${model.id}`)
  const input = path.resolve(model.browserArtifact)
  const bytes = fs.readFileSync(input)
  if (createHash('sha256').update(bytes).digest('hex') !== model.weightsSha256) throw new Error(`Model hash mismatch: ${model.id}`)
  const tokenizer = fs.readFileSync(path.resolve(model.tokenizerArtifact))
  if (createHash('sha256').update(tokenizer).digest('hex') !== model.tokenizerSha256) throw new Error(`Tokenizer hash mismatch: ${model.id}`)
  const directory = path.resolve('public/vendor/ocr', model.id)
  fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, path.basename(input)), bytes)
  fs.writeFileSync(path.join(directory, path.basename(model.tokenizerArtifact)), tokenizer)
}
console.log(JSON.stringify({ installed: approved.map(model => model.id), blocked: manifest.candidates.filter(model => model.status !== 'approved').map(model => model.id) }))
