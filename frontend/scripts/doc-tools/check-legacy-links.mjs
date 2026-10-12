// NAV01 / CN-014: URL cũ vẫn mở đúng chỗ. Chỉ HTTP (không trình duyệt): mọi <loc> trong sitemap trả 200,
// `/doc-tools<đường dẫn>` chuyển 308 về đúng đường dẫn, `?tool=<khoá>` chuyển về đúng công cụ.
// TỰ ĐÁNH TRƯỢT: exit 1 khi có URL hỏng hoặc thiếu khoá link cũ bắt buộc (compress → nen-pdf).
import fs from 'node:fs'
import path from 'node:path'
import { HUB, outDir } from './lib/qa.mjs'

const catalog = fs.readFileSync(new URL('../../src/features/tools/hub/config/tool-catalog.ts', import.meta.url), 'utf8')
const block = catalog.match(/LEGACY_TOOL_QUERY[^{]*\{([^}]*)\}/)?.[1] ?? ''
const legacy = Object.fromEntries([...block.matchAll(/'?([\w-]+)'?\s*:\s*'([\w-]+)'/g)].map((match) => [match[1], match[2]]))
// Spec v2 CN-014 nói đích danh "nén PDF".
const REQUIRED = { compress: 'nen-pdf' }
const missingLegacyKeys = Object.keys(REQUIRED).filter((key) => legacy[key] !== REQUIRED[key])

const failures = []
let checked = 0
const target = (response) => new URL(response.headers.get('location') ?? '', HUB).pathname
async function expect(url, status, pathname) {
  checked++
  try {
    const response = await fetch(HUB + url, { redirect: 'manual' })
    if (response.status !== status || (pathname && target(response) !== pathname)) failures.push({ url, status: response.status, location: response.headers.get('location'), want: { status, pathname } })
  } catch (error) {
    failures.push({ url, error: String(error).slice(0, 160) })
  }
}

const sitemap = await (await fetch(HUB + '/sitemap.xml')).text()
const pages = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1].trim()).pathname))]
if (pages.length === 0) failures.push({ url: '/sitemap.xml', error: 'sitemap rỗng' })
for (let index = 0; index < pages.length; index += 8) await Promise.all(pages.slice(index, index + 8).map((page) => expect(page, 200)))
// Link /doc-tools/* từ thời ERPCons / lpc.vn: lấy 30 trang đầu của sitemap (đủ phủ mọi nhóm, không quá chậm).
for (const page of ['/', ...pages.slice(0, 30)]) await expect('/doc-tools' + (page === '/' ? '' : page), 308, page)
for (const [key, slug] of Object.entries({ ...legacy, ...REQUIRED })) {
  await expect(`/?tool=${encodeURIComponent(key)}`, 307, `/${slug}`)
  await expect(`/doc-tools?tool=${encodeURIComponent(key)}`, 308, `/${slug}`)
}

const report = { hub: HUB, checked, pages: pages.length, legacy, missingLegacyKeys, failures }
fs.writeFileSync(path.join(outDir('check-legacy-links'), 'results.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify({ checked, failures: failures.length, missingLegacyKeys }))
if (failures.length || missingLegacyKeys.length) process.exit(1)
