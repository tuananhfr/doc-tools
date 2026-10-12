// WP4-B — thẻ "Link bài viết" của /doc-to-van-ban với API GIẢ (không gọi backend, không ra Internet):
// cờ tắt thì thẻ ẩn; cờ bật thì lấy bài, gửi đúng một trường `url` không kèm cookie, nguồn link vào trình đọc;
// lỗi PAYWALL (ReadErrorNotice của WP4-A, bám `data-code` chứ không bám câu chữ) có lối "Dán văn bản thay thế";
// đổi thẻ không mất đường dẫn; không tràn ngang. Chụp màn hình thẻ Link theo WIDTHS x THEMES vào QA_OUT/<OUT_NAME>.
//
//   node scripts/doc-tools/check-read-link.mjs
//   WIDTHS=360 THEMES=dark OUT_NAME=wp4b-read-link node scripts/doc-tools/check-read-link.mjs
import { chromium, outDir, mockFreeSession, HUB } from './lib/qa.mjs'

const widths = (process.env.WIDTHS ?? '360,390,768,1366').split(',').map(Number)
const themes = (process.env.THEMES ?? 'light,dark').split(',')
const OUT = outDir(process.env.OUT_NAME ?? 'read-link')
const ARTICLE = {
  ok: true,
  document: { title: 'Bài thử', sourceUrl: 'https://news.example.com/bai', checkedAt: '2026-10-12T00:00:00.000Z', segments: [{ id: 's1', text: 'Bài thử', kind: 'heading' }, { id: 's2', text: 'Đoạn thứ nhất của bài thử.', kind: 'paragraph' }] },
  warnings: [],
}

const result = { hiddenWhenOff: false, tabShown: false, loaded: false, requestOk: false, paywallMessage: false, pasteFallback: false, keptUrl: false, maxOverflow: 0, screenshots: 0, errors: [] }
const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function open({ width, theme, enabled, extract }) {
  const mobile = width < 768
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
  await context.addInitScript((t) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
  await mockFreeSession(context)
  // Đăng ký SAU mockFreeSession: Playwright ưu tiên route khai sau.
  await context.route('**/api/v1/read/config', (route) => route.fulfill({ json: { ok: true, linkEnabled: enabled } }))
  const requests = []
  await context.route('**/api/v1/read/extract', (route) => { requests.push(route.request()); return extract(route) })
  const page = await context.newPage()
  page.on('pageerror', (error) => result.errors.push(String(error).slice(0, 200)))
  await page.goto(`${HUB}/doc-to-van-ban`)
  await page.locator('.erp-tool-tabs').first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(500)
  return { context, page, requests }
}
// Nhãn thẻ là `accessibility:readAloud.tabLink` (vi) của WP4-A.
const linkTab = (page) => page.locator('.erp-tool-tab', { hasText: 'Link bài viết' })
const urlInput = (page) => page.getByLabel('Đường dẫn bài viết (HTTPS)')
const fetchButton = (page) => page.getByRole('button', { name: 'Lấy nội dung' })
const notice = (page, code) => page.locator(`[data-code="${code}"]`)
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

try {
  {
    const { context, page } = await open({ width: 390, theme: 'light', enabled: false, extract: (route) => route.abort() })
    result.hiddenWhenOff = (await linkTab(page).count()) === 0
    await context.close()
  }
  {
    const { context, page, requests } = await open({ width: 390, theme: 'light', enabled: true, extract: (route) => route.fulfill({ json: ARTICLE }) })
    result.tabShown = (await linkTab(page).count()) === 1
    await linkTab(page).click()
    await urlInput(page).fill('news.example.com/bai')
    await fetchButton(page).click()
    const loaded = page.getByRole('status').filter({ hasText: 'news.example.com' })
    await loaded.waitFor({ timeout: 10000 })
    // Ô Dán chữ vẫn trống, nên nút "Đọc văn bản" bật được chỉ khi nguồn link đã vào trình đọc của WP4-A.
    result.loaded = (await loaded.innerText()).includes('Đã lấy nội dung') && await page.getByRole('button', { name: 'Đọc văn bản', exact: true }).isEnabled()
    const sent = requests[0]
    result.requestOk = Boolean(sent) && JSON.stringify(sent.postDataJSON()) === JSON.stringify({ url: 'https://news.example.com/bai' })
      && sent.headers()['x-cn-request'] === '1' && !sent.headers().cookie
    await context.close()
  }
  {
    const { context, page } = await open({ width: 390, theme: 'light', enabled: true, extract: (route) => route.fulfill({ status: 422, json: { ok: false, code: 'PAYWALL', message: 'x' } }) })
    await linkTab(page).click()
    await urlInput(page).fill('https://paid.example.com/bai')
    await fetchButton(page).click()
    await notice(page, 'PAYWALL').waitFor({ timeout: 10000 })
    result.paywallMessage = (await notice(page, 'PAYWALL').getAttribute('role')) === 'alert'
    await notice(page, 'PAYWALL').getByRole('button', { name: 'Dán văn bản thay thế' }).click()
    result.pasteFallback = (await page.locator('textarea:visible').count()) > 0
    await linkTab(page).click()
    result.keptUrl = (await urlInput(page).inputValue()) === 'https://paid.example.com/bai'
    await context.close()
  }
  for (const theme of themes) {
    for (const width of widths) {
      const { context, page } = await open({ width, theme, enabled: true, extract: (route) => route.fulfill({ status: 422, json: { ok: false, code: 'ROBOTS_DENIED', message: 'x' } }) })
      await linkTab(page).click()
      await urlInput(page).fill('https://news.example.com/mot-duong-dan-rat-dai-de-thu-xem-o-nhap-co-tran-ngang-hay-khong')
      await fetchButton(page).click()
      await notice(page, 'ROBOTS_DENIED').waitFor({ timeout: 10000 })
      result.maxOverflow = Math.max(result.maxOverflow, await overflow(page))
      await page.screenshot({ path: `${OUT}${theme}-${width}-link.png`, fullPage: true })
      result.screenshots++
      await context.close()
    }
  }
} catch (error) {
  result.errors.push(String(error).slice(0, 300))
} finally {
  await browser.close()
}

console.log(JSON.stringify(result))
const passed = result.hiddenWhenOff && result.tabShown && result.loaded && result.requestOk && result.paywallMessage && result.pasteFallback && result.keptUrl
  && result.maxOverflow <= 0 && result.screenshots === widths.length * themes.length && result.errors.length === 0
process.exit(passed ? 0 : 1)
