import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { chromium } from './lib/qa.mjs'

const require = createRequire(import.meta.url)
const { PDFDocument } = require('pdf-lib')
const base = process.env.ENT_QA_BASE ?? 'http://localhost:3012'
const output = path.resolve(process.env.QA_OUT ?? 'qa-output/entertainment-interpretations')
fs.mkdirSync(output, { recursive: true })
const version = 'cn-ent-interpretation-vi-v1'
const report = { base, buildId: fs.readFileSync('.next/BUILD_ID', 'utf8').trim(), data: 'synthetic API fixtures; real production frontend build', checks: [], shots: [], downloads: [], errors: [] }
const cards = ['HA', 'D7', 'SK', 'C5', 'H9', 'S4', 'D10', 'CJ', 'HQ']
const tarot = ['MAJOR_00', 'CUPS_2', 'WANDS_ACE', 'SWORDS_4', 'PENTACLES_10', 'MAJOR_13', 'WANDS_7', 'CUPS_8', 'PENTACLES_3', 'MAJOR_19']
const browser = await chromium.launch({ channel: 'chrome', headless: true })

async function fixtureContext(width, theme = 'light', options = {}) {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 960 }, hasTouch: width < 600, isMobile: width < 600, acceptDownloads: true, serviceWorkers: 'block' })
  await context.addInitScript(theme => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme }, version: 0 })), theme)
  const requests = []
  let failure = options.failOnce === true
  await context.route('**/api/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const body = request.postDataJSON()
    if (url.pathname.includes('/ent/')) {
      requests.push({ path: url.pathname, body, key: request.headers()['idempotency-key'] })
      if (failure && url.pathname.endsWith('/draw')) { failure = false; return route.fulfill({ status: 503, json: { ok: false, code: 'NETWORK_ERROR' } }) }
      const envelope = result => ({ ok: true, request_id: 'fixture-' + randomUUID(), rule_version: 'fixture-calculation-v1', source_ids: ['synthetic-fixture'], disclaimer_id: 'cn-ent-reference-v1', result })
      if (url.pathname.endsWith('/draw')) {
        const kind = url.pathname.includes('/tarot/') ? 'tarot' : 'cards'
        const result = { kind, expires_at: Math.floor(Date.now() / 1000) + (options.expire ? 2 : 900), cards: (kind === 'tarot' ? tarot : cards).slice(0, body.spread).map((id, i) => ({ id, position: i + 1, orientation: kind === 'tarot' && body.reversed && i === 0 ? 'REVERSED' : 'UPRIGHT' })) }
        return route.fulfill({ json: envelope(result) })
      }
      if (url.pathname.endsWith('/reports')) return route.fulfill({ json: envelope({ kind: 'tarot', cards: [], expires_at: Math.floor(Date.now() / 1000) + 900 }) })
      if (url.pathname.endsWith('/numerology/calculate')) {
        const noVowels = body.name === 'LY'
        const metric = (id, value, total, steps) => ({ id, value, total, steps })
        return route.fulfill({ json: envelope({ normalized_name: noVowels ? 'LY' : 'DANGTHIANH', name_policy: 'AEIOU', master_policy: '11/22/33', personal_year: body.personal_year, metrics: [
          metric('life_path', 6, 15, [15, 6]), metric('birthday', 11, 11, [11]), metric('personal_year', 5, 23, [23, 5]),
          metric('expression', noVowels ? 1 : 5, noVowels ? 10 : 50, noVowels ? [10, 1] : [50, 5]),
          metric('soul_urge', noVowels ? null : 11, noVowels ? 0 : 11, noVowels ? [] : [11]),
          metric('personality', noVowels ? 1 : 3, noVowels ? 10 : 39, noVowels ? [10, 1] : [39, 12, 3]),
        ] }) })
      }
    }
    return route.fulfill({ json: { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null, total: 0, tools: {} } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  return { context, page, requests }
}

async function layout(page, label) {
  const overflow = await page.locator('.cn-ent').evaluate(root => {
    const boundary = root.getBoundingClientRect()
    return [...root.querySelectorAll('*')].filter(el => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && (rect.right > boundary.right + 2 || rect.left < boundary.left - 2)
    }).map(el => el.tagName + '.' + el.className)
  })
  assert.deepEqual(overflow, [], label + ': horizontal overflow')
  assert.equal(await page.locator('.cn-ent img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true, label + ': card images')
  report.checks.push(label)
}

async function shot(page, selector, name) {
  const file = path.join(output, name + '.png')
  if (selector === '.cn-ent') {
    // The tool shell owns scrolling; a tall element shot includes ancestor-clipped blank pixels.
    await page.locator('.cn-ent h2').first().evaluate(element => element.scrollIntoView({ block: 'start' }))
    await page.screenshot({ path: file })
  } else await page.locator(selector).first().screenshot({ path: file })
  report.shots.push(file)
}

async function download(page, label, name) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: label, exact: true }).click()
  const file = await pending
  assert.equal(await file.failure(), null)
  const dest = path.join(output, name + path.extname(file.suggestedFilename()))
  await file.saveAs(dest)
  const bytes = fs.readFileSync(dest)
  assert.ok(bytes.length > 5000)
  const item = { file: dest, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
  if (dest.endsWith('.pdf')) {
    const pdf = await PDFDocument.load(bytes)
    item.pages = pdf.getPageCount()
    assert.ok(item.pages >= 2, 'interpretation export should contain multiple nonempty pages')
  } else {
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
    item.width = bytes.readUInt32BE(16); item.height = bytes.readUInt32BE(20)
  }
  report.downloads.push(item)
}

async function draw(page, slug, amount = 3) {
  await page.goto(`${base}/${slug}`)
  await page.locator('.cn-ent-form').getByRole('combobox').selectOption(String(amount))
  if (slug === 'tarot') await page.getByLabel('Cho phép lá Tarot ngược').check()
  await page.getByRole('button', { name: 'Xào và rút bài', exact: true }).click()
  await page.locator('.cn-ent-deck').waitFor()
  assert.equal(await page.locator('.cn-ent-meaning').count(), 0)
  await page.getByRole('button', { name: 'Lật lá ở vị trí 1', exact: true }).click()
  assert.equal(await page.locator('.cn-ent-meaning').count(), 1)
  assert.equal(await page.locator('.cn-ent-overview').count(), amount === 1 ? 1 : 0)
  if (amount > 1) assert.equal(await page.getByRole('button', { name: 'Tải PDF', exact: true }).isDisabled(), true)
  if (amount > 1) await page.getByRole('button', { name: 'Lật tất cả', exact: true }).click()
  assert.equal(await page.locator('.cn-ent-meaning').count(), amount)
  await page.locator('.cn-ent-overview').waitFor()
  assert.equal(await page.locator('.cn-ent-overview li').count(), amount)
  if (slug === 'tarot') {
    assert.ok((await page.locator('.cn-ent-overview').innerText()).includes('Kẻ Khờ (ngược)'))
    if (amount >= 3) {
      assert.ok((await page.locator('.cn-ent-overview').innerText()).includes(`${amount === 7 ? 'Tình huống' : 'Trở ngại'} · 2 Cốc (xuôi)`))
      assert.ok((await page.locator('.cn-ent-overview').innerText()).includes('tình cảm được đáp lại'))
    }
  } else if (amount >= 5) assert.ok((await page.locator('.cn-ent-overview').innerText()).includes('lá điều ước'))
  await page.locator('.cn-ent-meaning').first().locator('summary').click()
  await page.locator('.cn-ent-meaning').first().locator('summary').click()
  assert.equal(await page.locator('.cn-ent-meaning').first().getAttribute('open'), '')
  if (slug === 'tarot') assert.ok((await page.locator('.cn-ent-meaning').first().innerText()).includes('Vội vàng'))
  await page.locator('.cn-ent-card').first().click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Đóng ảnh', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}

async function calculate(page, name = 'Đặng Thị Ánh') {
  await page.goto(`${base}/than-so-hoc`)
  await page.getByLabel('Ngày sinh dương lịch', { exact: true }).fill('2000-02-29')
  await page.getByLabel('Họ tên (không bắt buộc)', { exact: true }).fill(name)
  await page.getByLabel('Năm cần tính chỉ số cá nhân', { exact: true }).fill('2026')
  await page.getByLabel(/^Tôi đồng ý gửi dữ liệu vừa nhập/).check()
  await page.getByRole('button', { name: 'Tính chỉ số', exact: true }).click()
  await page.locator('.cn-ent-overview').waitFor()
  assert.equal(await page.locator('.cn-ent-meaning').count(), 6)
  assert.ok((await page.locator('.cn-ent-meaning').first().innerText()).includes('coi trọng gia đình'))
  assert.ok((await page.locator('.cn-ent-meaning').first().innerText()).includes('khó từ chối'))
  assert.ok((await page.locator('.cn-ent-overview').innerText()).includes('Năm cá nhân 2026: 5'))
  const year = page.locator('.cn-ent-meaning').nth(2)
  await year.locator('summary').click()
  assert.ok((await year.innerText()).includes('Nên tập trung'))
  assert.ok((await year.innerText()).includes('Cần tránh'))
  assert.ok((await year.innerText()).includes('thay đổi và thử trải nghiệm mới'))
  await year.locator('summary').click()
}

try {
  for (const width of [360, 768, 1440]) for (const theme of ['light', 'dark']) {
    const { context, page } = await fixtureContext(width, theme)
    try {
      for (const slug of ['tarot', 'bai-tay', 'than-so-hoc']) {
        if (slug === 'than-so-hoc') await calculate(page)
        else await draw(page, slug)
        await page.evaluate(() => document.fonts.ready)
        await layout(page, `${slug}-${width}-${theme}`)
        await shot(page, '.cn-ent', `${slug}-${width}-${theme}-viewport`)
        await shot(page, '.cn-ent-overview', `${slug}-${width}-${theme}-overview`)
        await shot(page, '.cn-ent-meaning', `${slug}-${width}-${theme}-meaning`)
        await shot(page, '.cn-ent-export', `${slug}-${width}-${theme}-exports`)
        if (theme === 'light' && slug !== 'bai-tay') {
          const index = slug === 'tarot' ? 1 : 2
          const detail = page.locator('.cn-ent-meaning').nth(index)
          await detail.locator('summary').click()
          const file = path.join(output, `${slug}-${width}-second-example.png`)
          await detail.screenshot({ path: file })
          report.shots.push(file)
          await detail.locator('summary').click()
        }
        if (width === 1440 && theme === 'light') {
          await page.getByText('Nguồn bộ luận giải', { exact: true }).click()
          assert.ok((await page.locator('.cn-ent-reading-source').innerText()).includes(version))
          await download(page, 'Tải PDF', slug + '-report')
          await download(page, 'Tải ảnh PNG', slug + '-report')
        }
        await page.getByRole('button', { name: 'Bắt đầu phiên mới', exact: true }).click()
        assert.equal(await page.locator('.cn-ent-meaning').count(), 0)
      }
    } finally { await context.close() }
  }
  const extra = await fixtureContext(360)
  try {
    for (const amount of [1, 5, 7, 10]) { await draw(extra.page, 'tarot', amount); await layout(extra.page, 'tarot-' + amount + '-slots') }
    for (const amount of [5, 7, 9]) { await draw(extra.page, 'bai-tay', amount); await layout(extra.page, 'cards-' + amount + '-slots') }
    await calculate(extra.page, 'LY')
    const missing = extra.page.locator('.cn-ent-meaning').nth(4)
    await missing.locator('summary').click()
    assert.ok((await missing.innerText()).includes('Không có chữ phù hợp'))
    assert.equal(await missing.locator('.cn-ent-keywords').count(), 0)
    report.checks.push('null soul-urge: no fabricated interpretation')
    await extra.page.goto(`${base}/en/tarot`)
    await extra.page.getByRole('button', { name: 'Shuffle and draw', exact: true }).click()
    await extra.page.getByRole('button', { name: 'Reveal all', exact: true }).click()
    assert.equal(await extra.page.locator('.cn-ent-meaning-body').first().getAttribute('lang'), 'vi')
    await layout(extra.page, 'English UI / Vietnamese corpus')
  } finally { await extra.context.close() }
  const retry = await fixtureContext(360, 'light', { failOnce: true })
  try {
    await retry.page.goto(`${base}/tarot`)
    await retry.page.getByRole('button', { name: 'Xào và rút bài', exact: true }).click()
    await retry.page.getByRole('button', { name: 'Thử lại', exact: true }).click()
    await retry.page.locator('.cn-ent-deck').waitFor()
    assert.equal(retry.requests.filter(item => item.path.endsWith('/draw'))[0].key, retry.requests.filter(item => item.path.endsWith('/draw'))[1].key)
    report.checks.push('retry retains immutable draw key')
  } finally { await retry.context.close() }
  const expiry = await fixtureContext(360, 'light', { expire: true })
  try {
    await expiry.page.goto(`${base}/tarot`)
    await expiry.page.getByRole('button', { name: 'Xào và rút bài', exact: true }).click()
    await expiry.page.getByText(/^Phiên đã hết hạn/).waitFor()
    assert.equal(await expiry.page.getByRole('button', { name: 'Lật tất cả', exact: true }).isDisabled(), true)
    assert.equal(await expiry.page.getByRole('button', { name: 'Tải PDF', exact: true }).isDisabled(), true)
    assert.equal(await expiry.page.locator('.cn-ent-meaning').count(), 0)
    report.checks.push('expired hidden draw: no reveal/export')
  } finally { await expiry.context.close() }
  assert.deepEqual(report.errors, [])
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.failure = String(error.stack ?? error)
  throw error
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  await browser.close()
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, screenshots: report.shots.length, downloads: report.downloads.length, failure: report.failure }))
}
