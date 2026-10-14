import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium, mockFreeSession } from './lib/qa.mjs';
import { ALL_TOOLS } from '../../src/features/tools/hub/config/tool-list.ts';

const origin = process.env.BASE ?? 'http://localhost:3002';
const output = process.env.QA_OUT ?? path.join(os.tmpdir(), 'chuyen-nho-tools-redesign', 'routes');
const widths = (process.env.WIDTHS ?? '360,390,768,1024,1440').split(',').map(Number);
const requested = process.env.PAGES?.split(',');
const routes = ALL_TOOLS.filter(tool => tool.status === 'ready' && (!requested || requested.includes(tool.slug)));
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const previous = process.env.RESUME === 'true' && fs.existsSync(path.join(output, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(output, 'report.json'), 'utf8')) : [];
const results = previous.filter(result => result.status === 'pass');
const finished = new Set(results.map(result => result.slug + ':' + result.width));
let next = 0;

async function audit(tool, width, context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  const record = { slug: tool.slug, screen: tool.screen, width, errors, modes: [] };
  try {
    await page.goto(origin + '/' + tool.slug, { waitUntil: 'domcontentloaded' });
    await page.locator('.cn-tool-workspace[data-tool-screen]').waitFor({ timeout: 60000 });
    await page.locator('.cn-tool-workspace :is(.erp-flow, .erp-doc-tools, .erp-notes, .cn-ent):visible').first().waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.waitForTimeout(150);
    record.metrics = await page.evaluate(() => {
      const root = document.querySelector('.cn-tool-workspace');
      const host = document.querySelector('.erp-tools-guest');
      const work = Array.from(root.querySelectorAll('.erp-flow, .erp-doc-tools, .erp-notes, .cn-ent')).find(el => el.getClientRects().length);
      const fields = Array.from(root.querySelectorAll('input:not([type=file],[type=checkbox],[type=radio]),textarea,select')).filter(el => el.getClientRects().length);
      const outside = Array.from(root.querySelectorAll('button,input,select,textarea,summary')).filter(el => {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height || box.right <= innerWidth + 1 && box.left >= -1) return false;
        for (let parent = el.parentElement; parent && parent !== root; parent = parent.parentElement) {
          if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) return false;
        }
        return true;
      }).slice(0, 8).map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 80), class: el.className }));
      return {
        title: root.querySelector('h1')?.textContent,
        workspaceTop: Math.round(work.getBoundingClientRect().top),
        viewportOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        containerOverflow: Boolean(host && host.scrollWidth > host.clientWidth + 1),
        outside,
        firstFieldTop: fields[0] ? Math.round(fields[0].getBoundingClientRect().top) : null,
      };
    });
    record.screenshot = tool.slug + '-' + width + '.png';
    await page.screenshot({ path: path.join(output, record.screenshot) });
    if (width === 390 || width === 1440) {
      const selectors = ['.cn-tool-modes', '.cn-qr-mode-switch', '.cn-family-segment', '.cn-responsive-preview__tabs', '.cn-tool-board__tabs'];
      const groups = [];
      for (const selector of selectors) {
        const matches = page.locator(selector + ':visible');
        for (let index = 0; index < await matches.count(); index++) {
          const group = matches.nth(index);
          groups.push({ selector, index, label: await group.getAttribute('aria-label'), labels: await group.locator('button').allTextContents() });
        }
      }
      for (let group = 0; group < groups.length; group++) {
        const spec = groups[group];
        const locate = () => spec.label
          ? page.locator(spec.selector + ':visible').filter({ has: page.locator('button') }).and(page.locator('[aria-label=' + JSON.stringify(spec.label) + ']')).first()
          : page.locator(spec.selector + ':visible').nth(spec.index);
        for (let option = 1; option < spec.labels.length; option++) {
          const current = locate();
          if (!await current.count()) continue;
          const button = current.locator('button').filter({ hasText: spec.labels[option].trim() }).first();
          if (!await button.count() || !await button.isEnabled()) continue;
          await button.click();
          await page.waitForTimeout(150);
          const modeShot = tool.slug + '-' + width + '-mode-' + group + '-' + option + '.png';
          await page.screenshot({ path: path.join(output, modeShot) });
          const overflow = await page.evaluate(() => {
            const host = document.querySelector('.erp-tools-guest');
            return document.documentElement.scrollWidth > innerWidth + 1 || Boolean(host && host.scrollWidth > host.clientWidth + 1);
          });
          record.modes.push({ group, label: spec.labels[option].trim(), screenshot: modeShot, overflow });
          const original = locate().locator('button').first();
          if (await original.count() && await original.isEnabled()) {
            await original.click();
            await page.waitForTimeout(80);
          }
        }
      }
    }
    record.status = errors.length || record.metrics.viewportOverflow || record.metrics.containerOverflow || record.metrics.outside.length || record.modes.some(mode => mode.overflow) ? 'issue' : 'pass';
  } catch (error) {
    record.status = 'error';
    record.failure = error.message;
    await page.screenshot({ path: path.join(output, tool.slug + '-' + width + '-error.png') }).catch(() => {});
  } finally { await page.close(); }
  results.push(record);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ slug: tool.slug, width, status: record.status, top: record.metrics?.workspaceTop, modes: record.modes.length, failure: record.failure }));
}

try {
  const jobs = routes.flatMap(tool => widths.map(width => ({ tool, width }))).filter(job => !finished.has(job.tool.slug + ':' + job.width));
  await Promise.all(Array.from({ length: 2 }, async () => {
    const context = await browser.newContext();
    await mockFreeSession(context);
    try {
      while (next < jobs.length) {
        const job = jobs[next++];
        await audit(job.tool, job.width, context);
      }
    } finally { await context.close(); }
  }));
} finally { await browser.close(); }
const issues = results.filter(result => result.status !== 'pass');
console.log(JSON.stringify({ routes: routes.length, viewports: widths, checks: results.length, issues: issues.length, output }));
if (issues.length) process.exitCode = 1;
