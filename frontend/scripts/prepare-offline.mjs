import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { OFFICE_APPS } from '../src/features/tools/office/config/office-apps.ts'

// scripts/deploy.sh builds into another directory and publishes the manifest only after the swap.
const dist = process.env.NEXT_DIST_DIR || '.next'
const manifestOut = process.env.OFFLINE_MANIFEST_OUT || 'public/offline-manifest.json'
const basePath = JSON.parse(fs.readFileSync(`${dist}/required-server-files.json`, 'utf8')).config.basePath ?? ''
const withBase = url => basePath + url
const assets = []
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name)
    if (item.isDirectory()) walk(file)
    // Message chunks of the other 14 languages load on demand and enter the runtime cache when used.
    else if (/\.(js|css|woff2?|ttf|png|svg)$/.test(file) && !/[\\/]i18n-(?!vi-)[^\\/]*$/.test(file)) assets.push('/_next/' + file.replaceAll('\\', '/').slice(dist.length + 1))
  }
}
walk(`${dist}/static`)
const build = fs.readFileSync(`${dist}/BUILD_ID`, 'utf8').trim()
const routes = JSON.parse(fs.readFileSync(`${dist}/prerender-manifest.json`, 'utf8')).routes
// Every prerendered page (it has an RSC payload); og images, robots and sitemap do not, and `/_*` are Next internals.
// Pages live under app/[lang]: precache the default locale only, at the unprefixed URL the proxy serves it from.
// The staff-only admin shell is never needed offline and must not ship to every visitor's cache.
// `/cong-cu` now redirects to `/`; cache the real directory and `/gioi-thieu` instead of the alias.
const pages = Object.entries(routes).filter(([url, route]) => route.dataRoute?.endsWith('.rsc') && (url === '/vi' || url.startsWith('/vi/')) && url !== '/vi/cong-cu' && !/^\/vi\/quan-tri(\/|$)/.test(url)).map(([url]) => url)
const optimizedImages = new Set()
for (const url of pages) {
  const file = path.join(`${dist}/server/app`, url.slice(1) + '.html')
  const html = fs.readFileSync(file, 'utf8')
  // Precache every emitted image size so a cold offline reload also works at another viewport.
  for (const match of html.matchAll(/\/_next\/image\?[^"\s,<>]+/g)) optimizedImages.add(withBase(match[0].replaceAll('&amp;', '&')))
}
// Cả logo hệ sinh thái và icon cài đặt phải có sẵn khi mở app ngoại tuyến.
const brand = fs.readdirSync('public/brand', { recursive: true }).filter((name) => /\.(png|jpe?g|webp|svg)$/.test(name)).map((name) => '/brand/' + name.replaceAll('\\', '/'))
const icons = fs.readdirSync('public/icons').filter((name) => /\.png$/.test(name)).map((name) => '/icons/' + name)
const videoVendor = '/vendor/ffmpeg/core-0.12.10-wrapper-0.12.15/'
// Group builder lives in the app source so the download button and this script cannot drift apart.
const { optionalAssetGroups } = await import(pathToFileURL(path.resolve('src/features/tools/hub/config/offline-asset-groups.ts')).href)
// Keep the large engines lazy; the worker's runtime cache stores them after first use or an explicit download.
const officeAssets = Object.values(OFFICE_APPS).flatMap(({ id, version }) => {
  const vendor = '/vendor/office/' + id + '-' + version + '/'
  return JSON.parse(fs.readFileSync('public' + vendor + 'assets.json', 'utf8')).assets.map(({ name }) => vendor + name)
})
const optionalGroups = optionalAssetGroups({
  officeAssets,
  videoVendor,
  videoAssets: JSON.parse(fs.readFileSync('public' + videoVendor + 'assets.json', 'utf8')).assets,
  backgroundModel: JSON.parse(fs.readFileSync('src/features/tools/image/services/background-removal-model.json', 'utf8')),
  ttsVoice: JSON.parse(fs.readFileSync('src/features/tools/accessibility/config/piper-voice.json', 'utf8')),
  withBase,
})
const optionalAssets = [...new Set(Object.values(optionalGroups).flat())]
const pageUrls = pages.map(url => withBase(url.slice('/vi'.length) || '/'))
// Prefixed languages are not precached; the worker sends their unvisited pages to the Vietnamese twin when offline.
const locales = Object.entries(routes).filter(([url, route]) => route.dataRoute?.endsWith('.rsc') && /^\/[a-z][a-z-]*$/.test(url) && url !== '/vi').map(([url]) => url.slice(1))
const manifest = { version: build, assets: [...new Set([...pageUrls,...['/auth-background.jpg', '/logo-tekshot.png', ...brand, ...icons, ...assets].map(withBase), ...optimizedImages])], optionalAssets, optionalGroups, locales }
fs.writeFileSync(manifestOut, JSON.stringify(manifest), 'utf8')
