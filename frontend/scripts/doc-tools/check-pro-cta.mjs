// CN-015 + Q7: trang giải trí (tarot, bài Tây, thần số học…) KHÔNG được có lời mời Pro/đăng nhập trong
// nội dung chính và phải có câu miễn trừ. Công cụ Free thì chỉ LIỆT KÊ CTA Pro (Open decision 3).
// TỰ ĐÁNH TRƯỢT: exit 1 khi trang STRICT có CTA Pro hoặc trang DISCLAIMER thiếu `.cn-ent-reference`.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, HUB, mockFreeSession, outDir } from './lib/qa.mjs'

const STRICT = ['tarot', 'bai-tay', 'than-so-hoc', 'lich-am', 'vong-quay', 'kham-pha-giai-tri']
const DISCLAIMER = ['tarot', 'bai-tay', 'than-so-hoc']
const INFO = ['ghep-pdf', 'nen-anh', 'tao-cv', 'doc-to-van-ban', 'tinh-tien', 'tien-dien', 'luong']
// Chỉ quét nội dung chính: nút tài khoản ở header là điều hướng chung, không phải lời mời mua.
const PRO = '.cn-pro-chip, .cn-pro-offer, .cn-ai-invite, a[href$="/tai-khoan"], a[href*="/tai-khoan?"]'
const OUT = outDir('check-pro-cta')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
await mockFreeSession(context)
const page = await context.newPage()

async function scan(slug) {
  await page.goto(`${HUB}/${slug}`)
  await page.locator('#cn-main').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1500)
  const pro = await page.locator('#cn-main').locator(PRO).evaluateAll((items) => items.filter((item) => item.getClientRects().length > 0).map((item) => `${item.tagName.toLowerCase()}.${[...item.classList].join('.')} "${item.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)}"`))
  const disclaimer = (await page.locator('.cn-ent-reference').count()) > 0
  await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: true })
  return { slug, pro, disclaimer }
}

const strict = []
const info = []
for (const slug of STRICT) strict.push(await scan(slug))
for (const slug of INFO) info.push(await scan(slug))
await browser.close()

const failed = [
  ...strict.filter((item) => item.pro.length > 0).map((item) => `${item.slug}: có CTA Pro`),
  ...strict.filter((item) => DISCLAIMER.includes(item.slug) && !item.disclaimer).map((item) => `${item.slug}: thiếu câu miễn trừ`),
]
const report = { strict, disclaimer: DISCLAIMER, info: info.filter((item) => item.pro.length > 0), failed }
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify({ strict: strict.length, infoWithPro: report.info.map((item) => item.slug), failed }))
if (failed.length) process.exit(1)
