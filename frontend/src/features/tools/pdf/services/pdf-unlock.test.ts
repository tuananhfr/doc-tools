import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { lockKind, unlockPdf } from './pdf-unlock'
import { createQpdfRunner } from './qpdf'

const run = createQpdfRunner(resolve('node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm'))

async function encrypt(plain: Uint8Array, user: string, owner: string, restrict: string[] = []) {
  const { output } = await run(['--encrypt', user, owner, '256', ...restrict, '--', '/in.pdf', '/out.pdf'], plain)
  return output!
}

let plain: Uint8Array
beforeAll(async () => {
  const doc = await PDFDocument.create()
  doc.addPage([200, 200]).drawText('Hop dong 12/2026')
  plain = await doc.save()
})

describe('lockKind', () => {
  it('asks for the open password, the owner password, or nothing', async () => {
    expect(await lockKind(await encrypt(plain, 'mo123', 'chu456'), run)).toBe('open')
    expect(await lockKind(await encrypt(plain, '', 'chu456', ['--modify=none', '--print=none']), run)).toBe('owner')
    // Mã hoá mà không đặt mật khẩu nào, không cấm gì: không có gì để hỏi.
    expect(await lockKind(await encrypt(plain, '', ''), run)).toBeNull()
  })
})

describe('unlockPdf', () => {
  it('decrypts with the open password when the file allows editing', async () => {
    const locked = await encrypt(plain, 'mở-khoá', 'chu456')
    expect(await unlockPdf(locked, 'sai', run)).toEqual({ ok: false, reason: 'wrong-password' })
    const result = await unlockPdf(locked, 'mở-khoá', run)
    expect(result.ok).toBe(true)
    const doc = await PDFDocument.load(result.ok ? result.bytes : new Uint8Array())
    expect(doc.isEncrypted).toBe(false)
    expect(doc.getPageCount()).toBe(1)
  })

  it('refuses to lift edit restrictions without the owner password', async () => {
    const locked = await encrypt(plain, 'mo123', 'chu456', ['--modify=none'])
    expect(await unlockPdf(locked, 'mo123', run)).toEqual({ ok: false, reason: 'restricted' })
    expect((await unlockPdf(locked, 'chu456', run)).ok).toBe(true)
    const ownerOnly = await encrypt(plain, '', 'chu456', ['--modify=none'])
    expect(await unlockPdf(ownerOnly, '', run)).toEqual({ ok: false, reason: 'restricted' })
  })
})
