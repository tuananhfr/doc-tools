// Chạy một script kiểm thử ở 3 theme × 3 khổ màn hình, in dòng kết quả cuối của từng lượt.
//
//   node scripts/doc-tools/matrix.mjs check-batch.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = process.argv[2]
if (!script) {
  console.error('Cần tên script, ví dụ: node scripts/doc-tools/matrix.mjs check-batch.mjs')
  process.exit(2)
}
const path = fileURLToPath(new URL(`./${script}`, import.meta.url))
let failed = 0
for (const theme of ['light', 'dark', 'field']) {
  for (const view of ['360x740', '768x1024', '1440x900']) {
    const run = spawnSync(process.execPath, [path], { env: { ...process.env, THEME: theme, VIEW: view }, encoding: 'utf8', timeout: 600_000 })
    const output = `${run.stdout}${run.stderr}`.replace(/\s+/g, ' ').trim()
    if (run.status !== 0) failed++
    console.log(`${run.status === 0 ? 'OK ' : 'SAI'} ${theme} ${view} :: ${output.slice(-600)}`)
  }
}
process.exit(failed ? 1 : 0)
