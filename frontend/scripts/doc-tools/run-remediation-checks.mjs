import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(process.env.QA_OUT ?? 'qa-output/2026-10-11-remediation')
const build = fs.readFileSync('.next/BUILD_ID', 'utf8').trim()
const env = { ...process.env, SITE: 'http://localhost:37061', BASE: 'http://localhost:37061/chinh-sua-pdf', QA_OUT: root, EXPECTED_BUILD: build, VIEW: '1366x900' }
const runs = [
  ['client-states', 'check-client-states.mjs', {}],
  ['golden', 'golden.mjs', { NON_OCR: '1' }],
  ['independent-search', 'check-independent-search.mjs', {}],
  ...['320', '390', '1366'].map(width => [`p0-${width}`, 'check-p0-journeys.mjs', { VIEW: `${width}x844`, ONLY: 'P0-MERGE,P0-SPLIT,P0-PDF-COMPRESS,P0-IMAGE-PDF,P0-IMAGE-COMPRESS,P0-QR', OCR_FIXTURES: path.resolve('qa-output/2026-10-11-baseline/chuyen-nho-qa-20261011/fixtures-ocr') }]),
  ['populated-tools', 'check-populated-tools.mjs', {}],
  ...['image-extra', 'image-tools', 'money-date', 'page-tools', 'password', 'sign-compare'].map(name => [name, `check-${name}.mjs`, {}]),
  ['utility-camera', 'check-utility-tools.mjs', { VIEW: '390x844' }],
  ['media-tools', 'check-media-remediation.mjs', {}],
]
const selected = process.env.SUITES?.split(',')
const directory = path.join(root, 'verification')
fs.mkdirSync(directory, { recursive: true })
const report = { build, createdAt: new Date().toISOString(), runs: [] }
const save = () => fs.writeFileSync(path.join(directory, process.env.RUN_REPORT ?? 'browser-runs.json'), JSON.stringify(report, null, 2), 'utf8')
for (const [name, script, overrides] of runs.filter(([name]) => !selected || selected.includes(name))) {
  const row = { name, status: 'running' }; report.runs.push(row); save()
  const child = spawn(process.execPath, [`scripts/doc-tools/${script}`], { env: { ...env, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = '', stderr = ''
  child.stdout.on('data', data => { stdout += data })
  child.stderr.on('data', data => { stderr += data })
  row.code = await new Promise(resolve => child.on('close', resolve))
  fs.writeFileSync(path.join(directory, `${name}.stdout.log`), stdout, 'utf8')
  fs.writeFileSync(path.join(directory, `${name}.stderr.log`), stderr, 'utf8')
  try { row.output = JSON.parse(stdout.trim().slice(stdout.indexOf('{'))) } catch { /* Progress logs remain in their original files. */ }
  row.status = row.code === 0 ? 'passed' : 'failed'
  save(); console.log(JSON.stringify({ name, code: row.code, status: row.status }))
}
report.status = report.runs.length > 0 && report.runs.every(row => row.status === 'passed') ? 'passed' : 'failed'
save()
if (report.status !== 'passed') process.exitCode = 1
