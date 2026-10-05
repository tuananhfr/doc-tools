import fs from 'node:fs'
import path from 'node:path'

const assets = []
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) walk(file)
    else if (/\.(js|css|woff2?|ttf|png|svg)$/.test(file)) assets.push('/_next/' + file.replaceAll('\\', '/').replace(/^\.next\//, ''))
  }
}
walk('.next/static')
const build = fs.readFileSync('.next/BUILD_ID', 'utf8').trim()
const routes = JSON.parse(fs.readFileSync('.next/prerender-manifest.json', 'utf8')).routes
const pages = Object.entries(routes).filter(([url, route]) => url === '/' || url === '/cong-cu' || route.srcRoute === '/[tool]').map(([url]) => url)
const optimizedImages = new Set()
for (const url of pages) {
  const file = path.join('.next/server/app', url === '/' ? 'index.html' : url.slice(1) + '.html')
  const html = fs.readFileSync(file, 'utf8')
  // Precache every emitted image size so a cold offline reload also works at another viewport.
  for (const match of html.matchAll(/\/_next\/image\?[^"\s,<>]+/g)) optimizedImages.add(match[0].replaceAll('&amp;', '&'))
}
const brand = fs.readdirSync('public/brand').filter((name) => /\.(png|webp|svg)$/.test(name)).map((name) => '/brand/' + name)
const manifest = { version: build, assets: [...new Set([...pages, '/auth-background.jpg', '/favicon.svg', '/logo-tekshot.png', ...brand, ...assets, ...optimizedImages])] }
fs.writeFileSync('public/offline-manifest.json', JSON.stringify(manifest), 'utf8')
