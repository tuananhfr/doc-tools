// Tệp mật khẩu / hạn chế quyền — mã hoá bằng chính qpdf-wasm của repo. Cần a2.mjs chạy trước.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { FIX } from '../lib/qa.mjs'

const createModule = createRequire(import.meta.url)('@neslinesli93/qpdf-wasm/dist/qpdf.js')

async function encrypt(input, user, owner, extra = []) {
  const q = await createModule({ noInitialRun: true })
  q.FS.writeFile('/in.pdf', input)
  const code = q.callMain(['--encrypt', user, owner, '256', ...extra, '--', '/in.pdf', '/out.pdf'])
  if (code !== 0) throw new Error('encrypt ' + code)
  return q.FS.readFile('/out.pdf')
}

const form = fs.readFileSync(FIX + 'ho-so-form.pdf')
const annot = fs.readFileSync(FIX + 'co-annot.pdf')
fs.writeFileSync(FIX + 'ma-hoa-trong.pdf', await encrypt(annot, '', ''))
fs.writeFileSync(FIX + 'mat-khau.pdf', await encrypt(form, 'Mật-khẩu-2026', 'chu456'))
fs.writeFileSync(FIX + 'han-che.pdf', await encrypt(annot, '', 'chu456', ['--modify=none', '--print=none']))
fs.writeFileSync(FIX + 'mo-han-che.pdf', await encrypt(form, 'mo123', 'chu456', ['--modify=none']))
console.log('password: ma-hoa-trong, mat-khau, han-che, mo-han-che')
