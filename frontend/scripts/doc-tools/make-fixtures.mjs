// Sinh toàn bộ tệp mẫu cho script kiểm thử DocTools vào FIXTURES (mặc định thư mục tạm).
//
//   node scripts/doc-tools/make-fixtures.mjs
//
// Thứ tự là phụ thuộc: big cần hop-dong + ảnh hiện trường, password cần tệp của a2,
// ocr cần bang-ke.html, pages-1000 cần ho-so-500-trang.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { FIX } from './lib/qa.mjs'

const STEPS = ['base', 'big', 'a2', 'password', 'bang-ke', 'danh-sach', 'bo-cuc', 'ocr', 'scan-heavy', 'scan-mess', 'pages-1000']

for (const step of STEPS) {
  const run = spawnSync(process.execPath, [fileURLToPath(new URL(`./fixtures/${step}.mjs`, import.meta.url))], { stdio: 'inherit' })
  if (run.status !== 0) {
    console.error(`Hỏng ở bước ${step}`)
    process.exit(1)
  }
}
console.log(`Xong — tệp mẫu ở ${FIX}`)
