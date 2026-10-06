import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// pdf.js 6 giải mã ảnh CCITT / JBIG2 (bản scan đen trắng) và JPEG 2000 bằng WASM tải lúc chạy,
// ghép tên tệp cố định vào `wasmUrl` — nên phải phục vụ nguyên thư mục, không qua bundler (bị gắn hash).
// Thư mục mang số phiên bản: WASM lệch phiên bản với worker là vỡ im lặng, và đổi phiên bản thì đổi URL cache.
const root = fileURLToPath(new URL('../', import.meta.url))
const packagePath = path.join(root, 'node_modules/pdfjs-dist')
const { version } = JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8'))
// Phải khớp `pdfjsWasmUrl()` ở src/utils/pdfjs-wasm.ts.
const vendor = path.join(root, 'public/vendor/pdfjs')
const output = path.join(vendor, version)
// Bỏ bản `*_nowasm_fallback.js`: trình duyệt qua được `browser-support` đều chạy WASM. quickjs chỉ cho script trong form.
const files = ['jbig2.wasm', 'openjpeg.wasm', 'qcms_bg.wasm', 'LICENSE_JBIG2', 'LICENSE_OPENJPEG', 'LICENSE_QCMS', 'LICENSE_PDFJS_JBIG2', 'LICENSE_PDFJS_OPENJPEG', 'LICENSE_PDFJS_QCMS']

fs.rmSync(vendor, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })
for (const name of files) fs.copyFileSync(path.join(packagePath, 'wasm', name), path.join(output, name))
console.log(`Prepared pdf.js ${version} decoders`)
