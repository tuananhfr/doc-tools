// Kiểm Đọc & Nghe (WP4-A): READ04–READ07, CN-001 (phần nghe), CN-002, CN-003.
// Web Speech được thay bằng bản giả ghi lại từng lượt đọc: headless Chrome không có giọng thật, và phải biết chắc
// giọng nào được chọn. Tệp mẫu (TXT, DOCX, PDF chữ, PDF scan) sinh ngay trong script. Mọi /api/v1 bị chặn bằng
// phản hồi giả. Giọng thật trên điện thoại vẫn phải thử tay (xem plan WP4-A, Manual follow-up).
//
//   SITE=http://localhost:3002 QA_OUT=qa-output node scripts/doc-tools/check-read-listen.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'

const require = createRequire(import.meta.url)
const { PDFDocument } = require('pdf-lib')
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = await import('docx')

const site = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
const out = outDir(process.env.OUT_NAME ?? 'read-listen')
const STORY = 'Ngày xưa có một cô bé rất thích nghe bà kể chuyện. Mỗi tối bà đọc truyện cổ tích cho cô nghe. Cô bé ngủ ngon.'
const SENTENCE_1 = 'Ngày xưa có một cô bé rất thích nghe bà kể chuyện.'
const SENTENCE_2 = 'Mỗi tối bà đọc truyện cổ tích cho cô nghe.'
const VOICES = {
  vi: [{ name: 'QA Việt', lang: 'vi-VN', localService: true, default: false, voiceURI: 'qa-vi' }, { name: 'QA English', lang: 'en-US', localService: true, default: true, voiceURI: 'qa-en' }],
  none: [],
  online: [{ name: 'QA Online', lang: 'vi-VN', localService: false, default: false, voiceURI: 'qa-online' }],
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const files = {
  txtBom: { name: 'truyen-bom.txt', mimeType: 'text/plain', buffer: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(STORY, 'utf8')]) },
  // "Tiếng Việt." theo windows-1258 (dấu thanh là ký tự tổ hợp riêng) — Notepad cũ trên Windows tiếng Việt lưu kiểu này.
  txt1258: { name: 'cu-1258.txt', mimeType: 'text/plain', buffer: Buffer.from([0x54, 0x69, 0xea, 0xec, 0x6e, 0x67, 0x20, 0x56, 0x69, 0xea, 0xf2, 0x74, 0x2e]) },
  docx: { name: 'truyen.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await docxFixture() },
  legacyDoc: { name: 'cu.doc', mimeType: 'application/msword', buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
  textPdf: { name: 'truyen-chu.pdf', mimeType: 'application/pdf', buffer: await htmlPdf(STORY) },
  scanPdf: { name: 'truyen-scan.pdf', mimeType: 'application/pdf', buffer: await scanPdf('Bà kể chuyện cho cháu nghe mỗi tối.') },
}
const r = {}
const errors = []

async function docxFixture() {
  const cell = (text) => new TableCell({ children: [new Paragraph(text)] })
  const doc = new Document({ sections: [{ children: [
    new Paragraph('Mở đầu câu chuyện.'),
    new Table({ rows: [new TableRow({ children: [cell('A1'), cell('B1')] }), new TableRow({ children: [cell('A2'), cell('B2')] })] }),
    new Paragraph('Kết thúc.'),
  ] }] })
  return Packer.toBuffer(doc)
}

async function htmlPdf(text) {
  const page = await browser.newPage()
  await page.setContent(`<html lang="vi"><body style="font: 16px Arial"><p>${text}</p></body></html>`)
  const pdf = await page.pdf({ format: 'A4' })
  await page.close()
  return pdf
}

// Chữ to, nét rõ ≈ trang scan tốt: OCR phải ra chữ nhưng vẫn bắt kiểm tra trước khi nghe.
async function scanPdf(text) {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 })
  await page.setContent(`<html lang="vi"><body style="margin:80px;font:36px Arial;background:#fff;color:#000"><p>${text}</p></body></html>`)
  const jpg = await page.screenshot({ type: 'jpeg', quality: 90 })
  await page.close()
  const doc = await PDFDocument.create()
  const image = await doc.embedJpg(jpg)
  doc.addPage([595.28, 841.89]).drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 })
  return Buffer.from(await doc.save())
}

// Chạy trong trang trước khi app nạp. `onstart` của lượt đầu hàng đợi bắn ngay; không tự `onend` để trạng thái đứng yên.
function installFakeSpeech(voices) {
  const spoken = []
  let queue = []
  class FakeUtterance { constructor(text) { this.text = text; this.lang = ''; this.voice = null; this.rate = 1 } }
  const synth = {
    getVoices: () => voices,
    speak(utterance) {
      spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice ? utterance.voice.name : null, rate: utterance.rate })
      queue.push(utterance)
      if (queue.length === 1) setTimeout(() => { if (queue[0] === utterance && utterance.onstart) utterance.onstart() }, 0)
    },
    cancel() { queue = [] },
    pause() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  window.SpeechSynthesisUtterance = FakeUtterance
  window.__speech = { spoken }
}

async function newContext(voices) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await context.addInitScript(installFakeSpeech, voices)
  await mockFreeSession(context)
  return context
}
async function openTool(context, url = `${site}/doc-to-van-ban`) {
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  return page
}
const spoken = (page) => page.evaluate(() => window.__speech.spoken.slice())
const clearSpoken = (page) => page.evaluate(() => { window.__speech.spoken.length = 0 })
const waitSpoken = (page, count = 1) => page.waitForFunction((n) => window.__speech.spoken.length >= n, count, { timeout: 10000 })
const inputTabs = (page) => page.getByRole('group', { name: 'Cách đưa nội dung vào' })
const button = (page, name) => page.getByRole('button', { name, exact: true })
async function chooseFile(page, file) {
  await inputTabs(page).getByRole('button', { name: 'Tệp', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles(file)
}
async function check(name, run) {
  try {
    await run()
  } catch (error) {
    errors.push(`${name}: ${String(error).split('\n')[0]}`)
  }
}

// 1. Thẻ, tốc độ, câu trước/sau, tạm dừng, cỡ chữ (READ07)
await check('player', async () => {
  const context = await newContext(VOICES.vi)
  const page = await openTool(context)
  r.linkTabHidden = (await inputTabs(page).getByRole('button').count()) === 2 && (await page.getByText('Link bài viết').count()) === 0
  await page.locator('textarea:visible').fill(STORY)
  await inputTabs(page).getByRole('button', { name: 'Tệp', exact: true }).click()
  await inputTabs(page).getByRole('button', { name: 'Dán chữ', exact: true }).click()
  r.tabKeepsInput = (await page.locator('textarea:visible').inputValue()) === STORY
  const range = page.locator('input[type=range]')
  r.rateRange = (await range.getAttribute('min')) === '0.75' && (await range.getAttribute('max')) === '1.5' && (await range.getAttribute('step')) === '0.05'
  await button(page, 'Đọc văn bản').click()
  await waitSpoken(page, 3)
  const first = (await spoken(page))[0]
  r.readsFromStart = first.text === SENTENCE_1 && first.lang === 'vi-VN' && first.voice === 'QA Việt'
  await page.waitForTimeout(150)
  await clearSpoken(page)
  await button(page, 'Câu sau').click()
  await waitSpoken(page)
  r.nextText = (await spoken(page))[0].text
  await page.waitForTimeout(150)
  await clearSpoken(page)
  await button(page, 'Câu trước').click()
  await waitSpoken(page)
  r.previousText = (await spoken(page))[0].text
  await page.waitForTimeout(150)
  await button(page, 'Tạm dừng').click()
  const pausedShown = await page.getByText('Đã tạm dừng').first().isVisible()
  await clearSpoken(page)
  await button(page, 'Tiếp tục').click()
  r.pauseResume = pausedShown && (await spoken(page)).length > 0
  await page.getByRole('group', { name: 'Cỡ chữ khung đọc' }).getByRole('button', { name: 'Rất lớn', exact: true }).click()
  const ratio = await page.evaluate(() => {
    const body = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cn-font-body')) || 16
    return parseFloat(getComputedStyle(document.querySelector('.erp-read-view')).fontSize) / body
  })
  r.fontScaleOk = ratio >= 1.45
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({ path: path.join(out, 'reading-390.png') })
  await button(page, 'Dừng').click()
  await context.close()
})

// 2. Nhớ vị trí: tự bật, không lưu chữ, mở lại thì đọc tiếp đúng câu
await check('remember', async () => {
  const context = await newContext(VOICES.vi)
  let page = await openTool(context)
  await page.getByLabel('Nhớ chỗ đang đọc trên máy này').check()
  await page.locator('textarea:visible').fill(STORY)
  await button(page, 'Đọc văn bản').click()
  await waitSpoken(page, 3)
  await page.waitForTimeout(150)
  await button(page, 'Câu sau').click()
  await page.waitForTimeout(300)
  await button(page, 'Dừng').click()
  const stored = await page.evaluate(() => localStorage.getItem('cn.readAloud.positions') ?? '')
  r.rememberNoText = stored.length > 0 && !stored.includes('Ngày xưa') && !stored.includes('cô bé')
  await page.close()
  page = await openTool(context)
  await page.locator('textarea:visible').fill(STORY)
  const resumeButton = button(page, 'Đọc tiếp từ chỗ đã dừng')
  await resumeButton.waitFor({ timeout: 5000 })
  r.rememberOffer = true
  await clearSpoken(page)
  await resumeButton.click()
  await waitSpoken(page)
  r.rememberResumes = (await spoken(page))[0].text === SENTENCE_2
  await context.close()
})

// 3. Tệp: TXT (BOM, windows-1258), DOCX, .doc cũ, PDF chữ, PDF scan (READ04, READ05, CN-001, CN-002)
await check('files', async () => {
  const context = await newContext(VOICES.vi)
  const page = await openTool(context)
  const loadAndRead = async (file) => {
    await chooseFile(page, file)
    await page.getByText(`từ “${file.name}”`).waitFor({ timeout: 60000 })
    await clearSpoken(page)
    await button(page, 'Đọc văn bản').click()
    await waitSpoken(page)
    const texts = (await spoken(page)).map((item) => item.text)
    await button(page, 'Dừng').click()
    return texts
  }
  r.txtBom = (await loadAndRead(files.txtBom))[0] === SENTENCE_1
  r.txt1258 = (await loadAndRead(files.txt1258)).join(' ') === 'Tiếng Việt.' && (await page.getByText('windows-1258').isVisible())
  r.docxOrder = (await loadAndRead(files.docx)).join('|')
  r.textPdf = (await loadAndRead(files.textPdf)).join(' ').replace(/\s+/g, ' ').includes('Mỗi tối bà đọc truyện cổ tích')
  await chooseFile(page, files.legacyDoc)
  const unsupported = page.locator('[data-code="UNSUPPORTED"]')
  await unsupported.waitFor({ timeout: 10000 })
  r.legacyDocUnsupported = true
  r.pasteFallback = await unsupported.getByRole('button', { name: 'Dán văn bản thay thế' }).isVisible()
  await chooseFile(page, files.scanPdf)
  await page.locator('.cn-ocr-review').waitFor({ timeout: 240000 })
  r.ocrUncertainNotice = await page.locator('[data-code="OCR_UNCERTAIN"]').isVisible()
  r.readDisabledDuringReview = await button(page, 'Đọc văn bản').isDisabled()
  // Kiểm từng từ được đánh dấu như người dùng: bấm "Xác nhận và tiếp tục" tới khi không còn từ nào.
  for (let guard = 0; guard < 300 && (await page.locator('.cn-ocr-review__word.needs-review').count()) > 0; guard++) {
    await button(page, 'Xác nhận và tiếp tục').click({ timeout: 30000 })
  }
  await button(page, 'Xuất kết quả đã kiểm tra').click({ timeout: 30000 })
  await page.getByText('từ “truyen-scan.pdf”').waitFor({ timeout: 30000 })
  r.ocrReviewedNote = await page.getByText('Phần chữ nhận dạng từ ảnh scan đã được bạn kiểm tra.').isVisible()
  await clearSpoken(page)
  await button(page, 'Đọc văn bản').click()
  await waitSpoken(page)
  r.scanReadAfterReview = (await spoken(page)).map((item) => item.text).join(' ').trim().length > 0
  await context.close()
})

// 4. Trang /en đọc chữ Việt bằng giọng Việt (READ06, Review Focus 1)
await check('viVoiceOnEn', async () => {
  const context = await newContext(VOICES.vi)
  const page = await openTool(context, `${site}/en/doc-to-van-ban`)
  await page.locator('textarea:visible').fill(STORY)
  await button(page, 'Read text aloud').click()
  await waitSpoken(page)
  const [first] = await spoken(page)
  r.viVoiceOnEn = first.lang === 'vi-VN' && first.voice === 'QA Việt'
  await context.close()
})

// 5. Không có giọng (CN-003): báo thật, văn bản vẫn dùng được
await check('noVoice', async () => {
  const context = await newContext(VOICES.none)
  const page = await openTool(context)
  await page.locator('textarea:visible').fill(STORY)
  await page.locator('[data-code="TTS_UNAVAILABLE"]').waitFor({ timeout: 5000 })
  r.noVoiceNotice = true
  r.noVoiceTextUsable = await page.locator('textarea:visible').isEditable()
  r.noVoiceSuggestsPiper = await button(page, 'Dùng giọng Chuyện Nhỏ (tiếng Việt)').isVisible()
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({ path: path.join(out, 'no-voice-390.png') })
  await context.close()
})

// 6. Giọng online + mất mạng (READ06)
await check('offline', async () => {
  const context = await newContext(VOICES.online)
  const page = await openTool(context)
  await page.locator('textarea:visible').fill(STORY)
  await page.getByText('“QA Online” là giọng online', { exact: false }).waitFor({ timeout: 5000 })
  r.onlineVoiceNotice = true
  await context.setOffline(true)
  await page.locator('[data-code="OFFLINE"]').waitFor({ timeout: 5000 })
  r.offlineNotice = true
  await context.close()
})

// 7. CN-001: hub Đọc & Nghe (WP1) dẫn tới công cụ
await check('hub', async () => {
  const context = await newContext(VOICES.vi)
  const page = await openTool(context, `${site}/doc-va-nghe`)
  r.hubLink = (await page.locator('a[href$="/doc-to-van-ban"]').count()) > 0
  await context.close()
})

await browser.close()
const expected = {
  linkTabHidden: true, tabKeepsInput: true, rateRange: true, readsFromStart: true, nextText: SENTENCE_2, previousText: SENTENCE_1,
  pauseResume: true, fontScaleOk: true, rememberNoText: true, rememberOffer: true, rememberResumes: true,
  txtBom: true, txt1258: true, docxOrder: 'Mở đầu câu chuyện.|A1|B1|A2|B2|Kết thúc.', textPdf: true,
  legacyDocUnsupported: true, pasteFallback: true, ocrUncertainNotice: true, readDisabledDuringReview: true,
  ocrReviewedNote: true, scanReadAfterReview: true, viVoiceOnEn: true, noVoiceNotice: true, noVoiceTextUsable: true,
  onlineVoiceNotice: true, offlineNotice: true, hubLink: true,
}
const failed = Object.entries(expected).filter(([key, value]) => r[key] !== value).map(([key]) => key)
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ site, result: r, failed, errors, info: { noVoiceSuggestsPiper: r.noVoiceSuggestsPiper ?? null } }, null, 2), 'utf8')
console.log(JSON.stringify({ failed, errors }))
process.exitCode = failed.length ? 1 : 0
