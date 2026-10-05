import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import { createQpdfRunner } from './qpdf'
import { protectPdf, removePdfPassword } from './pdf-password'

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
