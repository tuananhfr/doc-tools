import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium, FIX } from './doc-tools/lib/qa.mjs';
const local = createRequire(import.meta.url);
const ts = local('typescript');
const catalogCode = ts.transpileModule(fs.readFileSync(fileURLToPath(new URL('../src/features/tools/hub/config/tool-list.ts', import.meta.url)), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const scope = { exports: {} };
vm.runInNewContext(catalogCode, scope);
const catalog = scope.exports.ALL_TOOLS;
const root = process.env.QA_OUT ?? fileURLToPath(new URL('../qa-output/', import.meta.url));
fs.mkdirSync(root, { recursive: true });
const report = { browser: '', screenshots: [], routes: [], journeys: {}, errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
report.browser = browser.version();

async function pageFor(port, viewport, theme = 'light', mockApi = true) {
  const context = await browser.newContext({ viewport, isMobile: viewport.width < 576, hasTouch: viewport.width < 576, deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: true });
  await context.addInitScript(theme => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme }, version: 0 })), theme);
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ port, url:page.url(), message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({port,url:page.url(),message:message.text()}) });
  if (mockApi) await page.route('**/api/v1/**', route => route.fulfill({ json: route.request().url().endsWith('/me') ? { ok: true, authenticated: false } : { ok: true, total: 0, tools: {} } }));
  return { context, page };
}

for (const theme of ['light', 'dark', 'field']) {
  for (const [width, height] of [[1440,900], [1280,800], [1024,768], [768,1024], [390,844]]) {
    const viewport = { width, height };
    const pair = [];
    for (const port of [3000,3002]) {
      const { context, page } = await pageFor(port, viewport, theme);
      await page.goto('http://localhost:' + port + '/doc-tools');
      await page.locator('.erp-tools-grid').waitFor();
      await page.waitForTimeout(650);
      await page.evaluate(() => document.fonts.ready);
      const files = [];
      for (const position of ['top','bottom']) {
        if (position === 'bottom') await page.locator('.erp-tools-guest').evaluate(element => element.scrollTop = element.scrollHeight);
        await page.waitForTimeout(150);
        const file = path.join(root, theme + '-' + width + '-' + position + '-' + port + '.png');
        await page.screenshot({ path: file });
        files.push(file);
      }
      const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, cards: document.querySelectorAll('.erp-tool-card').length }));
      pair.push({ port, files, geometry });
      await context.close();
    }
    report.screenshots.push({ theme, viewport, pair, byteIdentical: pair[0].files.map((file,index) => fs.readFileSync(file).equals(fs.readFileSync(pair[1].files[index]))) });
    console.log('Screenshot comparison:', theme, width, report.screenshots.at(-1).byteIdentical);
  }
}

const { context, page } = await pageFor(3002, { width:1440, height:900 });
for (const tool of catalog.filter(tool => tool.status === 'ready')) {
  await page.goto('http://localhost:3002/doc-tools/' + tool.slug);
  await page.locator('.erp-tool-crumb__title').waitFor();
  await page.waitForTimeout(350);
  report.routes.push({ slug: tool.slug, heading: await page.locator('.erp-tool-crumb__title').innerText(), expected: tool.name });
}
await page.goto('http://localhost:3002/doc-tools');
await page.getByRole('button', {name:/Xem tất cả/}).click();
report.journeys.catalogCount = await page.locator('.erp-tool-card').count();
await page.getByPlaceholder('Tìm công cụ…').fill('ghep pdf');
report.journeys.search = await page.locator('.erp-tool-card').allTextContents();
await page.goto('http://localhost:3002/doc-tools?tool=merge');
await page.locator('.erp-flow-picker').waitFor();
report.journeys.legacyPath = new URL(page.url()).pathname;
await page.goto('http://localhost:3002/doc-tools/khong-co');
await page.locator('.erp-tools-grid').waitFor();
report.journeys.unknownPath = new URL(page.url()).pathname;
await page.goto('http://localhost:3002/doc-tools/chinh-sua-pdf');
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf']);
await page.locator('.erp-doc-page').first().waitFor({timeout:30000});
const before = await page.locator('.erp-doc-page').count();
await page.evaluate(() => { history.pushState({}, '', '/doc-tools/xem-pdf'); dispatchEvent(new PopStateEvent('popstate')); });
await page.waitForTimeout(300);
report.journeys.sameScreen = { before, after: await page.locator('.erp-doc-page').count() };
await page.locator('.erp-tool-crumb__back').click();
const leave = page.getByRole('dialog').filter({hasText:'Rời trang này?'});
await leave.waitFor();
report.journeys.leaveGuard = true;
await leave.getByRole('button',{name:'Ở lại'}).click();
report.journeys.keptAfterCancel = await page.locator('.erp-doc-page').count();
await context.close();
await browser.close();
report.pass = report.errors.length === 0 && report.routes.every(route => route.heading === route.expected) && report.journeys.catalogCount === catalog.length && report.journeys.sameScreen.before === report.journeys.sameScreen.after && report.journeys.leaveGuard;
fs.writeFileSync(path.join(root,'parity-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({ pass:report.pass, routes:report.routes.length, exactScreenshotPairs:report.screenshots.flatMap(row=>row.byteIdentical).filter(Boolean).length, screenshotPairs:report.screenshots.length*2, errors:report.errors, journeys:report.journeys },null,2));
if(!report.pass) process.exitCode=1;
