import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const model = JSON.parse(fs.readFileSync(path.join(root, 'src/features/tools/image/services/background-removal-model.json'), 'utf8'))
const vendor = path.join(root, 'public/vendor/background-removal')
const modelBytes = fs.readFileSync(path.join(vendor, model.file))
if (createHash('sha256').update(modelBytes).digest('hex') !== model.sha256) throw new Error('Background-removal model checksum mismatch')
const runtimeRoot = path.resolve(path.dirname(require.resolve('onnxruntime-web/wasm')), '..')
const { version } = JSON.parse(fs.readFileSync(path.join(runtimeRoot, 'package.json'), 'utf8'))
if (version !== model.runtimeVersion) throw new Error('Background-removal runtime version mismatch')
const output = path.join(vendor, `ort-${version}`)
fs.mkdirSync(output, { recursive: true })
for (const name of model.runtimeFiles) fs.copyFileSync(path.join(runtimeRoot, 'dist', name), path.join(output, name))
console.log(`Prepared ${model.model} CPU runtime ${version}`)
