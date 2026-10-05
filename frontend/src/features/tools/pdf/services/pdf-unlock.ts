import { QPDF_OK, runQpdf, type QpdfRun } from './qpdf'

/**
 * Mở khoá PDF có mật khẩu bằng mật khẩu NGƯỜI DÙNG đưa (spec 07 — "yêu cầu
 * password từ user; không bypass").
 *
 * PDF có hai mật khẩu: mật khẩu mở và mật khẩu chủ (owner — giữ quyền in,
 * sửa). Tệp mở được mà bị cấm sửa thì qpdf vẫn gỡ được không cần mật khẩu —
 * đó chính là lách quyền, nên chỉ giải mã khi có mật khẩu chủ hoặc tệp vốn
 * cho phép sửa mọi thứ.
 */

/** `open`: cần mật khẩu mở tệp. `owner`: mở được nhưng cấm sửa — cần mật khẩu chủ. */
export type LockKind = 'open' | 'owner'

export type UnlockResult =
  | { ok: true; bytes: Uint8Array<ArrayBuffer> }
  | { ok: false; reason: 'wrong-password' | 'restricted' | 'failed' }

interface Access {
  opened: boolean
  owner: boolean
  fullRights: boolean
}

async function access(bytes: Uint8Array, password: string, run: QpdfRun): Promise<Access> {
  const { code, stdout } = await run(['--show-encryption', `--password=${password}`, '/in.pdf'], bytes)
  if (!QPDF_OK(code)) return { opened: false, owner: false, fullRights: false }
  return {
    opened: true,
    owner: stdout.some((line) => /Supplied password is owner password/.test(line)),
    fullRights: stdout.some((line) => /modify anything: allowed/.test(line)),
  }
}

/** Tệp đã mã hoá cần gì để dùng: `null` = không cần mật khẩu (mã hoá mà không đặt mật khẩu, không cấm gì). */
export async function lockKind(bytes: Uint8Array, run: QpdfRun = runQpdf): Promise<LockKind | null> {
  const blank = await access(bytes, '', run)
  if (!blank.opened) return 'open'
  return blank.owner || blank.fullRights ? null : 'owner'
}

/** Bản giải mã (không còn mật khẩu, không còn hạn chế) của tệp — chỉ khi `password` đủ quyền. */
export async function unlockPdf(bytes: Uint8Array, password: string, run: QpdfRun = runQpdf): Promise<UnlockResult> {
  const granted = await access(bytes, password, run)
  if (!granted.opened) return { ok: false, reason: 'wrong-password' }
  if (!granted.owner && !granted.fullRights) return { ok: false, reason: 'restricted' }
  const { code, output } = await run(['--decrypt', `--password=${password}`, '/in.pdf', '/out.pdf'], bytes)
  return QPDF_OK(code) && output ? { ok: true, bytes: output } : { ok: false, reason: 'failed' }
}
