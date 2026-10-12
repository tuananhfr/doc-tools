import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const voice = JSON.parse(fs.readFileSync(path.join(root, 'src/features/tools/accessibility/config/piper-voice.json'), 'utf8'))
const vendor = path.join(root, 'public/vendor/tts')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

if (sha256(fs.readFileSync(path.join(vendor, voice.model.file))) !== voice.model.sha256) throw new Error('TTS voice model checksum mismatch')
const packageRoot = path.dirname(require.resolve(`${voice.phonemizer.package}/package.json`))
const { version } = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
if (version !== voice.phonemizer.version) throw new Error('TTS phonemizer version mismatch')
const output = path.join(vendor, `piper-phonemize-${version}`)
fs.mkdirSync(output, { recursive: true })
for (const asset of [voice.phonemizer.wasm, voice.phonemizer.data]) {
  const bytes = fs.readFileSync(path.join(packageRoot, 'build', asset.file))
  if (sha256(bytes) !== asset.sha256) throw new Error(`TTS phonemizer checksum mismatch: ${asset.file}`)
  fs.writeFileSync(path.join(output, asset.file), bytes)
}
// The shared ONNX runtime is copied by prepare-background-removal.mjs, which must run first.
if (!fs.existsSync(path.join(root, 'public', voice.runtimeDir))) throw new Error('ONNX runtime missing; run prepare-background-removal.mjs first')
console.log(`Prepared ${voice.voice} with piper-phonemize ${version}`)
