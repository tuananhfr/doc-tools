import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'public/vendor/ffmpeg/core-0.12.10-wrapper-0.12.15')
const packages = [
  { name: '@ffmpeg/core', version: '0.12.10', files: ['ffmpeg-core.js', 'ffmpeg-core.wasm'] },
  { name: '@ffmpeg/ffmpeg', version: '0.12.15', files: ['worker.js', 'const.js', 'errors.js'] },
]
fs.mkdirSync(output, { recursive: true })
const assets = []
for (const entry of packages) {
  const packagePath = path.join(root, 'node_modules', entry.name)
  const installed = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'))
  if (installed.version !== entry.version) throw new Error(`Unexpected ${entry.name} version: ${installed.version}`)
  for (const name of entry.files) {
    const bytes = fs.readFileSync(path.join(packagePath, 'dist/esm', name))
    fs.writeFileSync(path.join(output, name), bytes)
    assets.push({ name, package: entry.name, version: entry.version, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
}
fs.writeFileSync(path.join(output, 'assets.json'), JSON.stringify({ assets }, null, 2) + '\n', 'utf8')
console.log(`Prepared ${assets.length} local FFmpeg assets`)
