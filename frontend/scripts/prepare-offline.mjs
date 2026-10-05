import fs from 'node:fs'
import path from 'node:path'
const assets = []
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, item.name)
  if (item.isDirectory()) walk(file)
  else if (/\.(js|css|woff2?|ttf|png|svg)$/.test(file)) assets.push('/_next/' + file.replaceAll('\\', '/').replace(/^\.next\//, ''))
} }
walk('.next/static')
const build = fs.readFileSync('.next/BUILD_ID', 'utf8').trim()
const manifest = { version: build, assets: ['/doc-tools', '/auth-background.jpg', '/favicon.svg', ...assets] }
fs.writeFileSync('public/offline-manifest.json', JSON.stringify(manifest))
