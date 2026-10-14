import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'
import { OFFICE_APPS } from '../src/features/tools/office/config/office-apps.ts'

const vendorRoot = fileURLToPath(new URL('../public/vendor/office/', import.meta.url))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

async function prepared(output, app) {
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(output, 'assets.json'), 'utf8'))
    if (manifest.archiveSha256 !== app.sha256 || manifest.version !== app.version || !manifest.assets.length) return false
    for (const asset of manifest.assets) {
      const file = path.resolve(output, asset.name)
      if (!file.startsWith(output + path.sep) || digest(await fs.readFile(file)) !== asset.sha256) return false
    }
    return true
  } catch {
    return false
  }
}

for (const app of Object.values(OFFICE_APPS)) {
  const output = path.join(vendorRoot, `${app.id}-${app.version}`)
  if (await prepared(output, app)) {
    console.log(`${app.name} ${app.version}: verified local assets`)
    continue
  }
  console.log(`Downloading ${app.name} ${app.version}`)
  const response = await fetch(app.url, { signal: AbortSignal.timeout(180000) })
  if (!response.ok) throw new Error(`${app.name}: download failed (${response.status})`)
  const archive = new Uint8Array(await response.arrayBuffer())
  if (digest(archive) !== app.sha256) throw new Error(`${app.name}: archive SHA-256 mismatch`)
  const entries = Object.entries(unzipSync(archive)).filter(([name]) => !name.endsWith('/'))
  const indexName = entries.find(([name]) => name === 'index.html' || name.endsWith('/index.html'))?.[0]
  if (!indexName) throw new Error(`${app.name}: archive has no index.html`)
  const prefix = indexName.slice(0, -'index.html'.length)
  const assets = []
  for (const [archiveName, bytes] of entries) {
    if (!archiveName.startsWith(prefix)) throw new Error(`${app.name}: unexpected archive layout`)
    const name = archiveName.slice(prefix.length)
    const file = path.resolve(output, name)
    if (!name || name.includes('\\') || !file.startsWith(output + path.sep)) throw new Error(`${app.name}: unsafe archive path`)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, bytes)
    assets.push({ name, bytes: bytes.length, sha256: digest(bytes) })
  }
  for (const license of ['LICENSE-MIT', 'LICENSE-APACHE']) {
    if (!assets.some(asset => asset.name === license)) throw new Error(`${app.name}: missing ${license}`)
  }
  // The manifest is the completion marker; an interrupted extraction is never reused.
  await fs.writeFile(path.join(output, 'assets.json'), JSON.stringify({ app: app.id, version: app.version, archiveSha256: app.sha256, assets }, null, 2) + '\n', 'utf8')
  console.log(`${app.name} ${app.version}: prepared ${assets.length} assets`)
}
