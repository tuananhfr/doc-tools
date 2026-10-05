import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { chromium, FIX } from './doc-tools/lib/qa.mjs'
const targetRequire = createRequire(import.meta.url)
const { PDFDocument } = targetRequire('pdf-lib')
const out = path.join(process.env.QA_OUT ?? fileURLToPath(new URL('../qa-output/', import.meta.url)), 'extra')
fs.mkdirSync(out, {recursive:true})
const browser = await chromium.launch({channel:'chrome',headless:true})
const report = {errors:[], downloads:[], comparisons:[]}

async function download(page, label, prefix) {
  const [file] = await Promise.all([page.waitForEvent('download',{timeout:60000}),page.getByRole('button',{name:label,exact:true}).click()])
  const dest = path.join(out,prefix+'-'+file.suggestedFilename())
  await file.saveAs(dest)
  const bytes=fs.readFileSync(dest)
  assert.ok(bytes.length>100)
  const result={label,path:dest,bytes:bytes.length}
  if(dest.endsWith('.pdf')) result.pages=(await PDFDocument.load(bytes)).getPageCount()
  report.downloads.push(result)
}

for (const width of [1440,390]) {
  const pair=[]
  for (const port of [3000,3002]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:900},acceptDownloads:true,serviceWorkers:'block',hasTouch:width===390,isMobile:width===390})
    const page=await context.newPage()
    page.on('pageerror',error=>report.errors.push({port,message:error.message}))
    page.on('console',message=>{if(message.type()==='error')report.errors.push({port,message:message.text()})})
    page.on('dialog',dialog=>dialog.accept())
    await page.route('**/api/v1/**',route=>route.fulfill({json:{ok:true,total:0,tools:{}}}))
    const shots=[]
    await page.goto(`http://localhost:${port}/doc-tools/tao-ma-vach`)
    await page.getByLabel('Giá trị',{exact:true}).fill('NETQA7731-001')
    await page.getByRole('button',{name:'Tải PNG',exact:true}).waitFor()
    await page.waitForFunction(()=>!document.querySelector('.erp-flow__run')?.disabled)
    await page.waitForTimeout(450)
    shots.push(path.join(out,`barcode-${width}-${port}.png`))
    await page.screenshot({path:shots.at(-1)})
    if(port===3002&&width===1440) for(const label of ['Tải PNG','SVG để in','PDF đúng khổ']) await download(page,label,'barcode')
    await page.goto(`http://localhost:${port}/doc-tools/huong-nha-la-ban`)
    await page.getByRole('button',{name:'Không có ảnh — chỉ dùng la bàn',exact:true}).click()
    await page.getByRole('button',{name:'Tôi biết số độ',exact:true}).click()
    await page.getByPlaceholder('Ví dụ 132').fill('132,5')
    await page.locator('.erp-orient-result__value').waitFor()
    assert.equal(await page.locator('.erp-orient-result__value').innerText(),'132,5°')
    await page.waitForTimeout(450)
    shots.push(path.join(out,`orientation-${width}-${port}.png`))
    await page.screenshot({path:shots.at(-1)})
    if(port===3002&&width===1440) {
      await download(page,'Lưu ảnh','orientation')
      await page.getByRole('radio',{name:'PDF Một trang, in được'}).check()
      await download(page,'Lưu PDF','orientation')
    }
    pair.push(shots)
    await context.close()
  }
  report.comparisons.push({width,files:pair,identical:pair[0].map((file,i)=>fs.readFileSync(file).equals(fs.readFileSync(pair[1][i])))})
}

const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})
const page=await context.newPage()
page.on('pageerror',error=>report.errors.push({offline:true,message:error.message}))
page.on('dialog',dialog=>dialog.accept())
await page.goto('http://localhost:3002/doc-tools/ghep-pdf')
await page.evaluate(()=>navigator.serviceWorker.ready)
await page.reload()
await page.locator('.erp-flow-picker').waitFor()
report.offline={controlled:await page.evaluate(()=>!!navigator.serviceWorker.controller)}
assert.ok(report.offline.controlled)
await context.setOffline(true)
await page.reload()
await page.locator('.erp-flow-picker').waitFor()
await page.locator('input[type=file]').first().setInputFiles(['hop-dong.pdf','phu-luc.pdf'].map(file=>FIX+file))
await page.locator('.erp-flow-file').nth(1).waitFor()
await page.locator('.erp-flow__run').click()
await page.locator('.erp-flow-result').waitFor({timeout:60000})
await download(page,'Tải về','offline-merge')
report.offline.pages=report.downloads.at(-1).pages
assert.equal(report.offline.pages,17)
await context.close()
await browser.close()
report.pass=report.errors.length===0&&report.comparisons.every(pair=>pair.identical.every(Boolean))
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
if(!report.pass)process.exitCode=1
