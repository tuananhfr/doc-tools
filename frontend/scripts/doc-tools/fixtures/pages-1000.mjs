import { createRequire } from 'node:module'
import fs from 'node:fs'
import { FIX } from '../lib/qa.mjs'
const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')
const src = await PDFDocument.load(fs.readFileSync(FIX + 'ho-so-500-trang.pdf'))
const out = await PDFDocument.create()
for (let round = 0; round < 2; round++) for (const p of await out.copyPages(src, src.getPageIndices())) out.addPage(p)
fs.writeFileSync(FIX + 'ho-so-1000-trang.pdf', await out.save())
console.log(out.getPageCount(), fs.statSync(FIX + 'ho-so-1000-trang.pdf').size, fs.statSync(FIX + 'ho-so-500-trang.pdf').size)
