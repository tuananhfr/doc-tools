// Bảng gate phát hành WP7: chạy mọi kiểm tra TỰ ĐỘNG được ở máy (vitest, test backend, script QA) rồi
// điền actual / evidence / status vào docs/s0-audit/release-gates.csv + release-summary.json.
// Không deploy, không gọi production: SITE bắt buộc là máy này.
//
//   node scripts/doc-tools/release-gates.mjs --plan-only   chỉ điền local_checks / manual_remainder
//   SITE=http://localhost:3002 node scripts/doc-tools/release-gates.mjs
//   ONLY=golden,check-malicious   SKIP=load-test,backend   (tên: vitest, backend, tên script)
//
// Mã thoát: 0 = mọi gate có kiểm ở máy đều PASS / PARTIAL_PASS; 1 = có FAIL; 2 = có BLOCKED.
// Kiểm thiếu (WP trước chưa giao file, DB không chạy) là BLOCKED — không bao giờ tính là đạt.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describeCheck, gateStatus, matchTestFiles, parseCsv, toCsv } from './lib/release-gates.mjs'

const FRONTEND = path.resolve(import.meta.dirname, '../..')
const BACKEND = path.resolve(FRONTEND, '../backend')
const CSV = path.join(FRONTEND, 'docs/s0-audit/release-gates.csv')
const SUMMARY = path.join(FRONTEND, 'docs/s0-audit/release-summary.json')
const SITE = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(SITE).hostname)) {
  console.error('SITE phải là máy này (localhost / 127.0.0.1 / [::1]).')
  process.exit(2)
}
const BASH = process.env.BASH_PATH ?? (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash')
const NODE = process.execPath
const date = new Date().toISOString().slice(0, 10)
const OUT = path.join(FRONTEND, 'qa-output', `release-${date}`)
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const skip = process.env.SKIP ? process.env.SKIP.split(',') : []
const wanted = (name) => (!only || only.includes(name)) && !skip.includes(name)

const T = (file) => ({ kind: 'vitest', file })
const H = (has) => ({ kind: 'vitest', has })
const B = (file) => ({ kind: 'backend', file })
const S = (name) => ({ kind: 'script', name })

/** Ca nào kiểm bằng gì ở máy, và phần nào còn phải làm tay. Ca có `duplicate_of` lấy kết quả ca gốc. */
const GATES = {
  NAV01: { checks: [T('tool-lookup.test.ts'), S('check-legacy-links')], manual: '' },
  NAV02: { checks: [T('tool-search.test.ts')], manual: '' },
  UI01: { checks: [S('check-a11y')], manual: '360px + font 200% trên Android/iPhone thật' },
  UI02: { checks: [H('contrastRatio'), S('check-a11y')], manual: 'Screen reader (TalkBack/VoiceOver) + bàn phím trên thiết bị thật' },
  UI03: { checks: [S('golden')], manual: 'Đổi 5 thumbnail mẫu trên điện thoại thật' },
  UI04: { checks: [S('golden')], manual: 'Tải rồi sửa tiếp trên điện thoại thật (trình tải iOS)' },
  READ01: { checks: [B('read.test.cjs')], manual: 'Link bài báo thật trên internet khi bật read.linkEnabled (canary) + Legal duyệt' },
  READ02: { checks: [B('read.test.cjs')], manual: '' },
  READ03: { checks: [B('read.test.cjs')], manual: 'Trang paywall/robots thật trên internet' },
  READ04: { checks: [], manual: 'PDF scan thật → OCR + nghe trên điện thoại' },
  READ05: { checks: [T('read-source.test.ts')], manual: 'Nghe DOCX/TXT tiếng Việt trên thiết bị thật' },
  READ06: { checks: [], manual: 'Tắt giọng Việt / tắt mạng trên iOS + Android thật' },
  READ07: { checks: [T('speech-chunks.test.ts')], manual: 'Play/pause/tốc độ/tiếp tục với font lớn trên tablet' },
  FEED01: { checks: [T('contribution-payload.test.ts'), B('feedback.test.cjs')], manual: '' },
  FEED02: { checks: [B('feedback.test.cjs')], manual: '' },
  TRUST01: { checks: [H('isStale'), T('signed-rules.test.ts'), B('rules.test.cjs'), S('golden')], manual: 'Thời điểm nguồn trên gói ký thật của production' },
  SEC01: { checks: [S('check-malicious'), B('read.test.cjs')], manual: '' },
  OFF01: { checks: [H(['device', 'offline'])], manual: 'Chế độ máy bay trên điện thoại thật, mở từng công cụ offline' },
  REG01: { checks: [S('golden')], manual: 'Golden trên Chrome Android / Safari iOS thật' },
  REL01: { checks: [S('deploy-test-frontend'), S('deploy-test-backend'), S('no-alter')], manual: 'Diễn tập deploy + rollback trên production; canary read.linkEnabled' },
  'CN-001': { checks: [T('tool-search.test.ts'), T('read-source.test.ts')], manual: 'Phát giọng đọc trên điện thoại thật' },
  'CN-005': { checks: [], manual: 'Ghép 8 ảnh với 4 mẫu trên điện thoại (chưa có kiểm tự động cho ghép ảnh)' },
  'CN-007': { checks: [S('golden')], manual: 'In và đo kích thước ảnh thẻ bằng thước' },
  'CN-008': { checks: [S('golden')], manual: 'Chuỗi thao tác dài + hoàn tác trên trình chỉnh sửa PDF' },
  'CN-009': { checks: [], manual: 'Tài liệu thật có bảng + chữ viết tay' },
  'CN-015': { checks: [S('check-pro-cta')], manual: 'Đọc lại câu miễn trừ với BA' },
  'CN-017': { checks: [], manual: 'Từ chối quyền camera trên điện thoại thật' },
  'CN-019': { checks: [], manual: 'Ma trận thiết bị thật: iPhone Safari, Android Chrome, tablet' },
  'CN-020': { checks: [S('load-test'), S('golden')], manual: 'Load test production (không chạy qua đêm)' },
}

const rows = parseCsv(fs.readFileSync(CSV, 'utf8'))
const ids = new Set(rows.map((row) => row.test_id))
if (rows.length !== 40 || ids.size !== 40) throw new Error(`release-gates.csv phải có 40 ca khác nhau, đang có ${rows.length}/${ids.size}`)
for (const row of rows) {
  const key = row.duplicate_of || row.test_id
  if (!GATES[key]) throw new Error(`Thiếu cấu hình gate cho ${row.test_id} (${key})`)
  row.local_checks = row.duplicate_of ? `= ${row.duplicate_of}` : GATES[key].checks.map(describeCheck).join(' + ')
  row.manual_remainder = row.duplicate_of ? `= ${row.duplicate_of}` : GATES[key].manual
}
if (process.argv.includes('--plan-only')) {
  fs.writeFileSync(CSV, toCsv(rows), 'utf8')
  console.log(JSON.stringify({ planOnly: true, rows: rows.length }))
  process.exit(0)
}

fs.mkdirSync(OUT, { recursive: true })
const rel = (file) => path.relative(FRONTEND, file).replaceAll('\\', '/')
function exec(name, command, args, { cwd = FRONTEND, env = {} } = {}) {
  const started = Date.now()
  const run = spawnSync(command, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 3 * 60 * 60 * 1000 })
  const log = path.join(OUT, `${name}.log`)
  fs.writeFileSync(log, `$ ${command} ${args.join(' ')}\n(cwd ${cwd}, exit ${run.status}, ${Math.round((Date.now() - started) / 1000)}s)\n\n${run.stdout ?? ''}\n${run.stderr ?? ''}${run.error ? '\n' + run.error : ''}`, 'utf8')
  const tail = (run.stdout ?? '').trim().split('\n').reverse().find((line) => line.trim().startsWith('{')) ?? (run.stdout ?? '').trim().split('\n').pop() ?? ''
  return { status: run.status, log: rel(log), tail: tail.trim().slice(0, 200) }
}

// ---------- vitest ----------
let vitest = null
if (wanted('vitest')) {
  const file = path.join(OUT, 'vitest.json')
  const run = exec('vitest', NODE, ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', `--outputFile=${file}`])
  if (fs.existsSync(file)) vitest = { log: run.log, results: JSON.parse(fs.readFileSync(file, 'utf8')).testResults.map((item) => ({ file: item.name, ok: item.status === 'passed' })) }
}

// ---------- backend (cần MariaDB dev của backend/.env) ----------
const DB_PROBE = "require('dotenv/config');require('mysql2/promise').createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME}).then(c=>c.end(),e=>{console.error(e.message);process.exit(1)})"
const backend = {}
let backendReady = false
let backendNote = 'backend bị bỏ qua (SKIP/ONLY)'
if (wanted('backend') || wanted('load-test')) {
  const db = exec('backend-db', NODE, ['-e', DB_PROBE], { cwd: BACKEND })
  if (db.status !== 0) backendNote = `MariaDB không kết nối được (${db.log})`
  else {
    const build = exec('backend-build', NODE, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { cwd: BACKEND })
    backendReady = build.status === 0
    backendNote = backendReady ? '' : `build backend hỏng (${build.log})`
  }
}
const backendFiles = [...new Set(Object.values(GATES).flatMap((gate) => gate.checks.filter((check) => check.kind === 'backend').map((check) => check.file)))]
for (const file of backendFiles) {
  if (!wanted('backend')) continue
  if (!fs.existsSync(path.join(BACKEND, 'tests', file))) { backend[file] = { ok: null, detail: 'chưa có file (WP trước chưa giao)' }; continue }
  if (!backendReady) { backend[file] = { ok: null, detail: backendNote }; continue }
  const run = exec(`backend-${file}`, NODE, ['--test', '--test-concurrency=1', `tests/${file}`], { cwd: BACKEND })
  backend[file] = { ok: run.status === 0, detail: `exit ${run.status}`, log: run.log }
}

// ---------- script ----------
const siteUp = await fetch(SITE + '/').then((response) => response.ok, () => false)
const qaEnv = { BASE: SITE + '/chinh-sua-pdf' }
const a11ySource = path.join(FRONTEND, 'scripts/doc-tools/check-a11y.mjs')
const SCRIPTS = {
  'check-legacy-links': { site: true, run: () => exec('check-legacy-links', NODE, ['scripts/doc-tools/check-legacy-links.mjs'], { env: qaEnv }) },
  'check-a11y': {
    site: true,
    // Script không tự đánh trượt thì exit 0 không chứng minh gì.
    guard: () => (!fs.existsSync(a11ySource) ? { ok: null, detail: 'WP2a chưa có check-a11y.mjs' } : /process\.exit\(\s*1|process\.exitCode\s*=/.test(fs.readFileSync(a11ySource, 'utf8')) ? null : { ok: false, detail: 'check-a11y.mjs không tự đánh trượt — hợp đồng bằng chứng thiếu' }),
    run: () => exec('check-a11y', NODE, ['scripts/doc-tools/check-a11y.mjs'], { env: qaEnv }),
  },
  golden: { site: true, run: () => exec('golden', NODE, ['scripts/doc-tools/golden.mjs'], { env: qaEnv }) },
  'check-malicious': { site: true, run: () => exec('check-malicious', NODE, ['scripts/doc-tools/check-malicious.mjs'], { env: qaEnv }) },
  'check-pro-cta': { site: true, run: () => exec('check-pro-cta', NODE, ['scripts/doc-tools/check-pro-cta.mjs'], { env: qaEnv }) },
  'load-test': { db: true, run: () => exec('load-test', NODE, ['scripts/load-test.cjs'], { cwd: BACKEND, env: { LOAD_OUT: path.join(OUT, 'load-test.json') } }) },
  'deploy-test-frontend': { run: () => exec('deploy-test-frontend', BASH, ['scripts/deploy.test.sh']) },
  'deploy-test-backend': { run: () => exec('deploy-test-backend', BASH, ['scripts/deploy.test.sh'], { cwd: BACKEND }) },
  'no-alter': {
    // Luật DB production: chỉ thêm bảng mới, không ALTER/DROP bảng có sẵn — rollback code không cần rollback DB.
    run: () => {
      const hits = []
      const walk = (dir) => { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else if (file.endsWith('.ts') && /\b(ALTER|DROP)\s+(TABLE|COLUMN)\b/i.test(fs.readFileSync(file, 'utf8'))) hits.push(path.relative(BACKEND, file)) } }
      walk(path.join(BACKEND, 'src'))
      const log = path.join(OUT, 'no-alter.log')
      fs.writeFileSync(log, hits.length ? hits.join('\n') : 'no ALTER/DROP in backend/src', 'utf8')
      return { status: hits.length ? 1 : 0, log: rel(log), tail: hits.length ? `ALTER/DROP ở ${hits.join(', ')}` : 'no ALTER/DROP' }
    },
  },
}
const scripts = {}
for (const [name, spec] of Object.entries(SCRIPTS)) {
  if (!wanted(name)) continue
  const guarded = spec.guard?.()
  if (guarded) { scripts[name] = guarded; continue }
  if (spec.site && !siteUp) { scripts[name] = { ok: null, detail: `app không chạy ở ${SITE}` }; continue }
  if (spec.db && !backendReady) { scripts[name] = { ok: null, detail: backendNote }; continue }
  const run = spec.run()
  scripts[name] = { ok: run.status === 0, detail: `exit ${run.status} ${run.tail}`.trim(), log: run.log }
}

// ---------- điền bảng ----------
const read = (file) => fs.readFileSync(file, 'utf8')
function resolve(check) {
  if (check.kind === 'vitest') return vitest ? { ...matchTestFiles(vitest.results, check, read), log: vitest.log } : { ok: null, detail: 'vitest chưa chạy' }
  if (check.kind === 'backend') return backend[check.file] ?? { ok: null, detail: 'test backend chưa chạy' }
  return scripts[check.name] ?? { ok: null, detail: 'chưa chạy' }
}
const word = (ok) => (ok === true ? 'PASS' : ok === false ? 'FAIL' : 'BLOCKED')
const gates = {}
for (const row of rows.filter((item) => !item.duplicate_of)) {
  const gate = GATES[row.test_id]
  const checks = gate.checks.map((check) => ({ check: describeCheck(check), ...resolve(check) }))
  row.status = gateStatus(checks, gate.manual)
  row.actual = checks.length ? checks.map((item) => `${item.check}: ${word(item.ok)} (${item.detail})`).join('; ') : 'Không tự động hoá được ở máy — xem manual_remainder'
  row.evidence = [...new Set(checks.map((item) => item.log).filter(Boolean))].join(' ')
  gates[row.test_id] = { status: row.status, checks }
}
for (const row of rows.filter((item) => item.duplicate_of)) {
  const origin = rows.find((item) => item.test_id === row.duplicate_of)
  row.status = origin.status
  row.actual = `= ${origin.test_id}: ${origin.actual}`
  row.evidence = origin.evidence
  gates[row.test_id] = { status: row.status, duplicateOf: origin.test_id }
}
fs.writeFileSync(CSV, toCsv(rows), 'utf8')

const count = (status) => rows.filter((row) => row.status === status).length
const summary = {
  createdAt: new Date().toISOString(), site: SITE, evidenceDir: rel(OUT),
  counts: { PASS: count('PASS'), PARTIAL_PASS: count('PARTIAL_PASS'), FAIL: count('FAIL'), BLOCKED: count('BLOCKED'), MANUAL: count('MANUAL') },
  fail: rows.filter((row) => row.status === 'FAIL').map((row) => row.test_id),
  blocked: rows.filter((row) => row.status === 'BLOCKED').map((row) => row.test_id),
  manual: rows.filter((row) => row.status === 'MANUAL').map((row) => row.test_id),
  gates,
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8')
fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ counts: summary.counts, fail: summary.fail, blocked: summary.blocked }))
if (summary.fail.length) process.exit(1)
if (summary.blocked.length) process.exit(2)
