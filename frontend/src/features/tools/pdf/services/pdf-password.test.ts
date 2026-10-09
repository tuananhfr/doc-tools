import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import { createQpdfRunner } from './qpdf'
import { hasPdfHeader, protectPdf, removePdfPassword } from './pdf-password'

const run = createQpdfRunner(resolve('node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm'))

it('sets AES-256 and requires the owner password to remove edit restrictions', async () => {
  const document = await PDFDocument.create()
  document.addPage([200, 200]).drawText('QA')
  const original = await document.save()
  const locked = await protectPdf(original, 'open-test-123', 'owner-test-123', { printing: false, copying: false, modifying: false }, run)
  expect(locked.length).toBeGreaterThan(100)
  await expect(removePdfPassword(locked, 'open-test-123', run)).rejects.toThrow(/quản lý/)
  const unlocked = await removePdfPassword(locked, 'owner-test-123', run)
  expect((await PDFDocument.load(unlocked)).getPageCount()).toBe(1)
})

it('says a PDF without a password has nothing to remove instead of "restricted"', async () => {
  const document = await PDFDocument.create()
  document.addPage([200, 200])
  await expect(removePdfPassword(await document.save(), '', run)).rejects.toThrow(/không có mật khẩu/)
})

it('rejects a non-PDF file in both modes before qpdf blames the password', async () => {
  const fake = new TextEncoder().encode('not a pdf at all')
  await expect(removePdfPassword(fake, 'x', run)).rejects.toThrow(/Không phải tệp PDF/)
  await expect(protectPdf(fake, 'open-test-123', '', { printing: true, copying: true, modifying: true }, run)).rejects.toThrow(/Không phải tệp PDF/)
})

it('finds the PDF header within the first 1024 bytes only', () => {
  const encode = (text: string) => new TextEncoder().encode(text)
  expect(hasPdfHeader(encode('%PDF-1.7\n'))).toBe(true)
  expect(hasPdfHeader(encode('junk\r\n%PDF-1.4'))).toBe(true)
  expect(hasPdfHeader(encode(`${' '.repeat(1100)}%PDF-1.4`))).toBe(false)
  expect(hasPdfHeader(encode('%PDF'))).toBe(false)
})
