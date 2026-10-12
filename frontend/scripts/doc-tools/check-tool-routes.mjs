// Đường vào công cụ (NAV01, CN-001 phần tìm, CN-014): mọi slug "Dùng ngay", link `?tool=` và `/doc-tools/*`
// cũ, slug lạ, trang nhóm, ô tìm + việc thường dùng ở trang chủ, thanh tab nhóm việc, `?nhom=`, danh mục →
// công cụ → quay lại, đổi slug chung màn giữ tệp, hộp hỏi khi rời. In JSON; exit 1 khi có ca hỏng.
//
//   node scripts/doc-tools/check-tool-routes.mjs                (app ở BASE, mặc định cổng 3002)
//   VIEW=390x844 THEME=dark node scripts/doc-tools/check-tool-routes.mjs
// Cần tệp mẫu (`node scripts/doc-tools/make-fixtures.mjs`). Backend không cần chạy: `/api/v1/**` bị giả.
import { chromium, FIX, outDir, HUB, APP_HUB, mockSession, mockFreeSession } from './lib/qa.mjs'
import { buildToolCatalog } from '../export-tool-catalog.mjs'

const OUT = outDir('tool-routes')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const catalog = await buildToolCatalog()
// hub-pages.ts chỉ có `import type` nên Node nạp thẳng (type stripping), như export-tool-catalog.mjs.
const { HUB_PAGE_LIST } = await import(new URL('../../src/features/site/config/hub-pages.ts', import.meta.url).href)

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
await mockFreeSession(context)
// Theme nằm trong store zustand persist `erpcons.app` — phải có trước khi app hydrate.
await context.addInitScript((t) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
const checks = {}
const failures = []
const expectThat = (name, ok, detail) => { if (!ok) failures.push({ name, detail }) }
const pathNow = () => { const url = new URL(page.url()); return url.pathname + url.search }
const picker = () => page.locator('.erp-flow-picker__title')
const where = async () => ({ path: pathNow(), title: await page.title() })

// `.cn-tool-intro` = một công cụ; `.cn-landing-hero` = trang chủ; `.erp-tools-grid` = `/cong-cu`; `.cn-hub` = trang nhóm.
// Dev server biên dịch từng màn lần đầu nên chờ lâu.
async function open(path) {
  await page.goto(HUB + path, { timeout: 120000 })
  await page.waitForFunction(() => document.querySelector('.cn-tool-intro, .cn-landing-hero, .erp-tools-grid, .cn-hub'), null, { timeout: 120000 })
  await page.waitForTimeout(300)
}

// ---------- NAV01: mọi slug "Dùng ngay" mở đúng màn, URL giữ nguyên ----------
checks.slugs = { total: 0, failed: [] }
for (const tool of catalog.tools.filter((item) => item.status === 'ready')) {
  await open('/' + tool.slug)
  checks.slugs.total++
  if (pathNow() !== '/' + tool.slug || (await page.locator('.cn-tool-intro h1').count()) !== 1) checks.slugs.failed.push({ slug: tool.slug, path: pathNow() })
}
expectThat('slugs', checks.slugs.total > 0 && checks.slugs.failed.length === 0, checks.slugs)

// ---------- CN-014 + link cũ: proxy đổi `?tool=` và `/doc-tools/*` trước khi tới app ----------
const LEGACY = [
  ['/?tool=merge', '/ghep-pdf'], ['/?tool=split', '/tach-pdf'], ['/?tool=image-to-pdf', '/anh-sang-pdf'], ['/?tool=pdf-to-word', '/pdf-sang-word'],
  ['/?tool=compress', '/nen-pdf'], ['/?tool=compress-pdf', '/nen-pdf'], ['/?tool=COMPRESS-PDF', '/nen-pdf'], ['/?tool=nen-pdf', '/nen-pdf'],
  ['/doc-tools/nen-pdf', '/nen-pdf'], ['/doc-tools?tool=compress', '/nen-pdf'], ['/?tool=khong-co', '/'],
]
checks.legacy = []
for (const [from, to] of LEGACY) {
  await open(from)
  const row = { from, to, path: pathNow() }
  checks.legacy.push(row)
  expectThat(`legacy ${from}`, row.path === to, row)
}

// Slug lạ / "Sắp có" / viết hoa: Next trả trang 404 chung có link về trang chủ (không phải ngõ cụt).
checks.notFound = []
for (const path of ['/khong-co', '/nhac-viec', '/Tach-PDF']) {
  const response = await page.goto(HUB + path, { timeout: 120000 })
  const row = { path, status: response?.status() ?? null, homeLink: await page.locator('a[href="/"]').count() }
  checks.notFound.push(row)
  expectThat(`notFound ${path}`, row.status === 404 && row.homeLink > 0, row)
}

// ---------- Danh mục → công cụ → quay lại; hàng "Nhóm công cụ" ----------
await open('/cong-cu')
checks.directory = { cards: await page.locator('a.erp-tool-card').count(), groups: await page.locator('.cn-directory-controls .cn-hub-links a').count() }
expectThat('directory', checks.directory.cards > 0 && checks.directory.groups === HUB_PAGE_LIST.length, checks.directory)
await page.screenshot({ path: `${OUT}${theme}-${vw}-directory.png` })
await page.locator('a.erp-tool-card', { hasText: 'Nén PDF' }).first().click()
await picker().waitFor({ timeout: 120000 })
checks.card = await where()
expectThat('card', checks.card.path === '/nen-pdf', checks.card)
await page.locator('.erp-tool-crumb__back').click()
await page.locator('.erp-tools-grid').waitFor()
checks.crumb = { ...(await where()), recent: await page.locator('.cn-recent a').allInnerTexts() }
expectThat('crumb', checks.crumb.path.startsWith('/cong-cu') && checks.crumb.recent.some((name) => name.includes('Nén PDF')), checks.crumb)

// Khách: danh mục vẽ NGAY, không chờ `/me` (giữ `/me` lại 4 giây).
{
  const slow = await browser.newContext({ viewport: { width: vw, height: vh } })
  await slow.route('**/api/v1/**', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith('/api/v1/me')) await new Promise((done) => setTimeout(done, 4000))
    await route.fulfill({ json: { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null, total: 0, tools: {} } }).catch(() => undefined)
  })
  const guest = await slow.newPage()
  const started = Date.now()
  await guest.goto(HUB + '/cong-cu', { timeout: 120000 })
  const shown = await guest.locator('.erp-tools-grid').waitFor({ timeout: 3500 }).then(() => true, () => false)
  checks.guestNoWait = { gridAfterMs: shown ? Date.now() - started : null }
  expectThat('guestNoWait', shown, checks.guestNoWait)
  // Khách mở link của nhánh trong app: về trang đăng nhập (chỉ khi chạy với ERPCons).
  if (APP_HUB) {
    await guest.goto(`${APP_HUB}/ghep-pdf`)
    await guest.waitForURL(/\/login/, { timeout: 15000 }).catch(() => undefined)
    checks.guestAppBranch = new URL(guest.url()).pathname
  }
  await slow.close()
}

// ---------- Trang nhóm ----------
checks.hubs = []
for (const hubPage of HUB_PAGE_LIST) {
  await open('/' + hubPage.slug)
  const row = { slug: hubPage.slug, path: pathNow(), cards: await page.locator('.cn-hub-card').count(), title: await page.locator('.cn-hub h1').count() }
  checks.hubs.push(row)
  expectThat(`hub ${hubPage.slug}`, row.path === '/' + hubPage.slug && row.cards > 0 && row.title === 1, row)
}

// ---------- Trang chủ: ô tìm ở màn đầu, 6–8 việc thường dùng, CN-001 ----------
await open('')
checks.home = {
  tasks: await page.locator('.cn-landing-quick__tasks a').count(),
  searchInViewport: await page.locator('#tim-trang-chu').evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight),
}
expectThat('home', checks.home.tasks >= 6 && checks.home.tasks <= 8 && checks.home.searchInViewport, checks.home)
await page.screenshot({ path: `${OUT}${theme}-${vw}-home.png` })
await page.locator('#tim-trang-chu').fill('đọc truyện pdf cho bà nghe')
await page.locator('#tim-trang-chu').press('Enter')
await page.waitForURL('**/cong-cu?q=**', { timeout: 60000 })
const readAloudFirst = await page.waitForFunction(() => document.querySelector('a.erp-tool-card')?.getAttribute('href')?.endsWith('/doc-to-van-ban'), null, { timeout: 15000 }).then(() => true, () => false)
checks.cn001 = { path: pathNow(), first: await page.locator('a.erp-tool-card').first().getAttribute('href').catch(() => null) }
expectThat('cn001', readAloudFirst, checks.cn001)

// ---------- Thanh tab nhóm việc + `?nhom=` ----------
await open('/tao-ma-qr')
const tabs = page.locator('.cn-workspace-tabs a')
await tabs.first().waitFor({ timeout: 60000 })
checks.qrTabs = { count: await tabs.count(), current: await page.locator('.cn-workspace-tabs a[aria-current="page"]').getAttribute('href') }
await page.screenshot({ path: `${OUT}${theme}-${vw}-qr-tabs.png` })
await tabs.filter({ hasText: 'VietQR' }).click()
await page.waitForURL('**/vietqr-chuyen-khoan', { timeout: 60000 })
checks.qrTabs.after = pathNow()
expectThat('qrTabs', checks.qrTabs.count === 4 && checks.qrTabs.current === '/tao-ma-qr' && checks.qrTabs.after === '/vietqr-chuyen-khoan', checks.qrTabs)
await open('/tinh-tien?nhom=vat')
const pressed = page.locator('[role=group][aria-label="Loại phép tính"] button[aria-pressed="true"]')
await pressed.waitFor({ timeout: 60000 })
checks.moneyGroup = { pressed: await pressed.innerText(), tabs: await page.locator('.cn-workspace-tabs a').count() }
expectThat('moneyGroup', checks.moneyGroup.pressed.includes('Thuế') && checks.moneyGroup.tabs === 4, checks.moneyGroup)

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
expectThat('flowSwitch', checks.flowSwitch.path === '/nen-pdf' && checks.flowSwitch.files === 0, checks.flowSwitch)

// Hai slug của trình chỉnh sửa chung MỘT màn (điều hướng phía client): tệp đang làm phải còn.
await open('/chinh-sua-pdf')
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'phu-luc.pdf'])
await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(1200)
const before = await page.locator('.erp-doc-page').count()
await go('xem-pdf')
await page.waitForTimeout(600)
// `/xem-pdf` vẽ trình đọc từng trang thay cho lưới: đếm số trang ở ô chọn trang của nó.
checks.switch = { ...(await where()), before, after: await page.locator('.cn-pdf-reader__page option').count() }
expectThat('switch', before > 0 && checks.switch.path === '/xem-pdf' && checks.switch.after === before, checks.switch)
await page.goBack()
await page.waitForTimeout(600)
checks.back = { ...(await where()), pages: await page.locator('.erp-doc-page').count() }
expectThat('back', checks.back.path === '/chinh-sua-pdf' && checks.back.pages === before, checks.back)

// ---------- Rời trình chỉnh sửa đang giữ tệp: phải hỏi ----------
const leaveModal = page.getByRole('dialog').filter({ hasText: 'Rời trang này?' })
checks.leave = { askedOnSameScreen: await leaveModal.count() }
await page.locator('.erp-tool-crumb__back').click()
await leaveModal.waitFor({ timeout: 5000 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}${theme}-${vw}-leave-guard.png` })
await leaveModal.getByRole('button', { name: 'Ở lại' }).click()
await page.waitForTimeout(400)
checks.leave.stay = { ...(await where()), pages: await page.locator('.erp-doc-page').count(), modal: await leaveModal.count() }
// Đóng tab / F5: chỉ trình duyệt hỏi được — ghi lại, không kiểm (headless có thể không bật hộp).
const native = []
page.once('dialog', (dialog) => {
  native.push(dialog.type())
  void dialog.dismiss()
})
await page.reload().catch(() => undefined)
await page.waitForTimeout(600)
checks.leave.reload = { dialog: native, pagesAfterDismiss: await page.locator('.erp-doc-page').count() }
await page.locator('.erp-tool-crumb__back').click()
// Huỷ reload thì tệp còn nên hộp hỏi hiện ra sau cú bấm một nhịp — chờ nó thay vì đếm ngay.
if (await leaveModal.waitFor({ timeout: 3000 }).then(() => true, () => false)) await leaveModal.getByRole('button', { name: 'Rời trang' }).click()
await page.locator('.erp-tools-grid').waitFor()
checks.leave.proceed = await where()
// Chưa thả tệp nào thì không có gì để mất: rời thẳng, không hỏi.
await open('/chinh-sua-pdf')
await page.locator('.erp-tool-crumb__back').click()
await page.locator('.erp-tools-grid').waitFor()
checks.leave.emptyEditor = { ...(await where()), modal: await leaveModal.count() }
expectThat('leave', checks.leave.askedOnSameScreen === 0 && checks.leave.stay.modal === 0 && checks.leave.stay.pages === before && checks.leave.proceed.path.startsWith('/cong-cu') && checks.leave.emptyEditor.modal === 0, checks.leave)

// ---------- Nhánh trong khung app (`/tools`) chỉ có ở ERPCons ----------
const pathOf = (target) => new URL(target.url()).pathname
const frames = (target) => target.evaluate(() => ({ guest: document.querySelectorAll('.erp-tools-guest').length, shell: document.querySelectorAll('.erp-shell').length }))

// Đã đăng nhập (API giả).
if (APP_HUB) {
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

console.log(JSON.stringify({ theme, vw, checks, failures, errors }, null, 1))
await browser.close()
process.exitCode = failures.length || errors.length ? 1 : 0
