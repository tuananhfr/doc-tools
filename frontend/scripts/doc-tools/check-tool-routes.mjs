import fs from 'node:fs'
import { chromium, FIX, outDir, HUB, APP_HUB, mockSession } from './lib/qa.mjs'

const OUT = outDir('tool-routes')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const checks = {}
const picker = () => page.locator('.erp-flow-picker__title')
const where = async () => ({ path: new URL(page.url()).pathname + new URL(page.url()).search, title: await page.title() })

// `.erp-tools-grid` = trang chọn công cụ: slug lạ và công cụ "Sắp có" phải rơi về đó.
// `.erp-flow-picker` = công cụ nhanh (luồng ba bước); `.erp-doc-drop` = trình chỉnh sửa.
async function open(path) {
  await page.goto(HUB + path)
  await page.waitForFunction(() => document.querySelector('.erp-doc-drop, .erp-doc-page, .erp-flow-picker, .erp-tools-grid'))
  await page.waitForTimeout(400)
}

await page.goto(HUB)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)

await open('')
checks.hub = {
  ...(await where()),
  cards: await page.locator('.erp-tool-card').count(),
  ready: await page.locator('a.erp-tool-card').count(),
  soon: await page.locator('.erp-tool-card.is-soon').count(),
}
await page.screenshot({ path: `${OUT}${theme}-${vw}-hub.png`, fullPage: true })

await open('/anh-sang-pdf')
checks.deepLink = { ...(await where()), picker: await picker().innerText() }
await page.screenshot({ path: `${OUT}${theme}-${vw}-anh-sang-pdf.png` })

await open('?tool=merge')
checks.legacy = await where()
await open('/khong-co')
checks.unknown = await where()
await open('/ma-buu-chinh')
checks.soon = await where()
await open('/Tach-PDF')
checks.capitals = await where()

// Từ thẻ công cụ vào công cụ rồi quay về bằng đường dẫn đầu trang.
await open('')
await page.locator('a.erp-tool-card', { hasText: 'Nén PDF' }).click()
await picker().waitFor()
checks.card = { ...(await where()), picker: await picker().innerText() }
await page.locator('.erp-tool-crumb__back').click()
await page.locator('.erp-tools-grid').waitFor()
checks.crumb = { ...(await where()), recent: await page.locator('.erp-tools-recent__name').allInnerTexts() }

const go = (slug) =>
  page.evaluate((next) => {
    history.pushState({}, '', location.pathname.replace(/[^/]+$/, next))
    dispatchEvent(new PopStateEvent('popstate'))
  }, slug)

// Hai công cụ nhanh là hai màn khác nhau: sang công cụ khác thì bắt đầu lại, không mang tệp theo.
await open('/ghep-pdf')
await page.locator('.erp-flow-picker input[type=file]').setInputFiles([FIX + 'hop-dong.pdf', FIX + 'phu-luc.pdf'])
await page.locator('.erp-flow-file').nth(1).waitFor({ timeout: 60000 })
await go('nen-pdf')
await page.waitForTimeout(600)
checks.flowSwitch = { ...(await where()), files: await page.locator('.erp-flow-file').count(), picker: await picker().innerText() }

// Hai slug của trình chỉnh sửa chung MỘT màn (điều hướng phía client): tệp đang làm phải còn.
await open('/chinh-sua-pdf')
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'phu-luc.pdf'])
await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(1200)
const before = await page.locator('.erp-doc-page').count()
await go('xem-pdf')
await page.waitForTimeout(600)
checks.switch = { ...(await where()), before, after: await page.locator('.erp-doc-page').count() }
await page.goBack()
await page.waitForTimeout(600)
checks.back = { ...(await where()), pages: await page.locator('.erp-doc-page').count() }

// ---------- Rời trình chỉnh sửa đang giữ tệp: phải hỏi ----------
// (Hai bước trên — đổi slug chung một màn và nút Back về slug cũ — KHÔNG hỏi: màn không bị gỡ.)
const leaveModal = page.getByRole('dialog').filter({ hasText: 'Rời trang này?' })
checks.leave = { askedOnSameScreen: await leaveModal.count() }
await page.locator('.erp-tool-crumb__back').click()
await leaveModal.waitFor({ timeout: 5000 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}${theme}-${vw}-leave-guard.png` })
checks.leave.focus = await page.evaluate(() => document.activeElement?.textContent?.trim())
await leaveModal.getByRole('button', { name: 'Ở lại' }).click()
await page.waitForTimeout(400)
checks.leave.stay = { ...(await where()), pages: await page.locator('.erp-doc-page').count(), modal: await leaveModal.count() }
// Đóng tab / F5: chỉ trình duyệt hỏi được.
const native = []
page.once('dialog', (dialog) => {
  native.push(dialog.type())
  void dialog.dismiss()
})
await page.reload().catch(() => undefined)
await page.waitForTimeout(600)
checks.leave.reload = { dialog: native, pagesAfterDismiss: await page.locator('.erp-doc-page').count() }
await page.locator('.erp-tool-crumb__back').click()
await leaveModal.getByRole('button', { name: 'Rời trang' }).click()
await page.locator('.erp-tools-grid').waitFor()
checks.leave.proceed = await where()
// Chưa thả tệp nào thì không có gì để mất: rời thẳng, không hỏi.
await open('/chinh-sua-pdf')
await page.locator('.erp-tool-crumb__back').click()
await page.locator('.erp-tools-grid').waitFor()
checks.leave.emptyEditor = { ...(await where()), modal: await leaveModal.count() }

// ---------- Hai nhánh: `/doc-tools` (công khai, khung khách) và `/tools` (trong khung app) ----------
const pathOf = (target) => new URL(target.url()).pathname
const frames = (target) => target.evaluate(() => ({ guest: document.querySelectorAll('.erp-tools-guest').length, shell: document.querySelectorAll('.erp-shell').length }))

// Khách: trang công khai vẽ NGAY, không chờ `/me` (giữ `/me` lại 4 giây để thấy rõ).
{
  const slow = await browser.newContext({ viewport: { width: vw, height: vh } })
  await slow.route('**/api/v1/me', async (route) => {
    await new Promise((done) => setTimeout(done, 4000))
    await route.continue().catch(() => undefined)
  })
  const guest = await slow.newPage()
  const started = Date.now()
  await guest.goto(HUB)
  await guest.locator('.erp-tools-grid').waitFor({ timeout: 3500 }).catch(() => undefined)
  checks.guestNoWait = {
    gridAfterMs: (await guest.locator('.erp-tools-grid').count()) ? Date.now() - started : null,
    buttonWhileIdle: await guest.locator('.erp-tools-hero__trials').count(),
  }
  await guest.locator('.erp-tools-hero__trials').waitFor({ timeout: 15000 })
  checks.guestNoWait.buttonAfter = await guest.locator('.erp-tools-hero__trials').innerText()
  // Khách mở link của nhánh trong app: về trang đăng nhập.
  await guest.goto(`${APP_HUB}/ghep-pdf`)
  await guest.waitForURL(/\/login/, { timeout: 15000 }).catch(() => undefined)
  checks.guestAppBranch = pathOf(guest)
  await slow.close()
}

// Đã đăng nhập (API giả).
{
  const signed = await browser.newContext({ viewport: { width: vw, height: vh } })
  await mockSession(signed)
  const app = await signed.newPage()
  app.on('pageerror', (e) => errors.push(String(e)))

  await app.goto(APP_HUB)
  await app.locator('.erp-tools-grid').waitFor({ timeout: 30000 })
  checks.appHub = {
    path: pathOf(app),
    ...(await frames(app)),
    cardHref: await app.locator('a.erp-tool-card', { hasText: 'Ghép PDF' }).getAttribute('href'),
    activeMenu: await app.locator('.erp-sider__item--active').allInnerTexts(),
  }
  await app.screenshot({ path: `${OUT}${theme}-${vw}-app-hub.png` })

  // Ra màn khác rồi quay lại bằng điều hướng phía client: khung app KHÔNG bị dựng lại.
  await app.evaluate(() => {
    document.querySelector('.erp-shell').dataset.qaKept = '1'
  })
  await app.locator('a.erp-tool-card', { hasText: 'Ghép PDF' }).click()
  await app.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
  checks.appTool = {
    path: pathOf(app),
    crumbHref: await app.locator('.erp-tool-crumb__back').getAttribute('href'),
    activeMenu: await app.locator('.erp-sider__item--active').allInnerTexts(),
    ...(await frames(app)),
  }
  await app.evaluate((hub) => {
    history.pushState({}, '', hub.replace(/\/tools$/, '/'))
    dispatchEvent(new PopStateEvent('popstate'))
  }, new URL(APP_HUB).pathname)
  await app.waitForTimeout(1200)
  const away = pathOf(app)
  await app.goBack()
  await app.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
  checks.appShellKept = { away, back: pathOf(app), kept: await app.evaluate(() => document.querySelector('.erp-shell')?.dataset.qaKept === '1') }

  // Slug lạ và link `?tool=` cũ ở nhánh trong app ở lại nhánh đó.
  await app.goto(`${APP_HUB}/khong-co`)
  await app.locator('.erp-tools-grid').waitFor({ timeout: 30000 })
  checks.appUnknown = pathOf(app)
  await app.goto(`${APP_HUB}?tool=merge`)
  await app.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
  checks.appLegacy = pathOf(app)

  // Đã đăng nhập mà mở link công khai: vẫn khung khách, nút đổi thành "Mở trong ERPcons".
  await app.goto(`${HUB}/ghep-pdf`)
  await app.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
  const jump = app.locator('.erp-tools-guest__login')
  await jump.waitFor({ timeout: 15000 })
  checks.publicSignedIn = { path: pathOf(app), ...(await frames(app)), button: (await jump.innerText()).trim(), href: await jump.getAttribute('href') }
  await app.screenshot({ path: `${OUT}${theme}-${vw}-public-signed-in.png` })
  await jump.click()
  await app.locator('.erp-shell .erp-flow-picker').waitFor({ timeout: 30000 })
  checks.publicSignedIn.after = { path: pathOf(app), ...(await frames(app)) }
  await signed.close()
}

console.log(JSON.stringify({ theme, vw, checks, errors }, null, 1))
await browser.close()
