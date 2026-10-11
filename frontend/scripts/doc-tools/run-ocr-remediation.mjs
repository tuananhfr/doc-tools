import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const root = path.resolve(process.env.QA_OUT ?? 'qa-output/2026-10-11-ocr-remediation/verified')
const fixtures = path.resolve(process.env.OCR_FIXTURES ?? 'qa-output/2026-10-11-baseline/chuyen-nho-qa-20261011/fixtures-ocr-v2')
const build = fs.readFileSync('.next/BUILD_ID', 'utf8').trim(), site = process.env.SITE ?? 'http://localhost:37062'
assert(fs.existsSync(path.join(fixtures, 'manifest.json')))
fs.mkdirSync(root, { recursive: true })
const checks = [
  { id: 'printed', script: 'bench-ocr.mjs', env: { OCR_FIXTURES: path.join(fixtures, 'baseline-v1') } },
  { id: 'layout', script: 'bench-ocr-layout.mjs' },
  { id: 'outputs', script: 'check-ocr-v2.mjs' },
  { id: 'tables', script: 'check-ocr-tables.mjs' },
  { id: 'states', script: 'check-ocr-states.mjs' },
  { id: 'responsive', script: 'check-ocr-responsive.mjs' },
  { id: 'p0-mobile', script: 'check-p0-journeys.mjs', env: { OCR_FIXTURES: path.join(fixtures, 'baseline-v1'), ONLY: 'P0-OCR-TXT,P0-OCR-PDF', VIEW: '390x844' } },
  { id: 'p0-desktop', script: 'check-p0-journeys.mjs', env: { OCR_FIXTURES: path.join(fixtures, 'baseline-v1'), ONLY: 'P0-OCR-TXT,P0-OCR-PDF', VIEW: '1440x900' } },
  { id: 'pdf-visual', script: 'check-ocr-pdf-visual.mjs', env: { OCR_EXPORTS: path.join(root, 'ocr-tables') } },
  { id: 'non-ocr-smoke', script: 'golden.mjs', env: { BASE: site + '/chinh-sua-pdf', FIXTURES: path.resolve(fixtures, '../fixtures'), ONLY: 'ghep-pdf,nen-anh,tao-ma-qr', NON_OCR: '1' } },
]
const report = { createdAt: new Date().toISOString(), target: site, build, checks: [] }
const save = () => fs.writeFileSync(path.join(root, 'run-results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
for (const check of checks) {
  const record = { id: check.id, script: check.script, startedAt: new Date().toISOString(), status: 'running' }
  report.checks.push(record); save()
  const log = fs.createWriteStream(path.join(root, check.id + '.log'), { encoding: 'utf8' })
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join('scripts/doc-tools', check.script)], { cwd: process.cwd(), windowsHide: true,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512', SITE: site, QA_OUT: root, OCR_FIXTURES: fixtures, EXPECTED_BUILD: build, ONLY: '', WIDTHS: '320,360,390,430,768,1366,1920', ENTRY: '', ...check.env } })
    child.stdout.on('data', chunk => { log.write(chunk); process.stdout.write(chunk) })
    child.stderr.on('data', chunk => log.write(chunk))
    child.on('error', reject); child.on('close', resolve)
  })
  log.end(); record.exitCode = code; record.status = code === 0 ? 'passed' : 'failed'; record.finishedAt = new Date().toISOString(); save()
  console.log(JSON.stringify({ check: check.id, status: record.status, build }))
}
report.status = report.checks.every(check => check.status === 'passed') ? 'passed' : 'failed'; save()
if (report.status === 'failed') process.exitCode = 1
