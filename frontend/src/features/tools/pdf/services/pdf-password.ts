import { translate } from '@/i18n/runtime'
import { QPDF_OK, runQpdf, type QpdfRun } from './qpdf'
import { unlockPdf } from './pdf-unlock'

export interface PdfPermissions { printing: boolean; copying: boolean; modifying: boolean }

/** Đầu tệp PDF (`%PDF-`) — chuẩn cho phép rác đứng trước trong 1024 byte đầu. */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 1024) - 5
  for (let index = 0; index <= end; index++) {
    if (bytes[index] === 0x25 && bytes[index + 1] === 0x50 && bytes[index + 2] === 0x44 && bytes[index + 3] === 0x46 && bytes[index + 4] === 0x2d) return true
  }
  return false
}

// qpdf báo mọi tệp không đọc được là "sai mật khẩu" / "không đặt được" — kiểm trước để báo đúng lý do.
function assertPdf(bytes: Uint8Array): void {
  if (!hasPdfHeader(bytes)) throw new Error(translate('pdf:passwordErrors.notPdf'))
}

export async function protectPdf(bytes: Uint8Array, userPassword: string, ownerPassword: string, permissions: PdfPermissions, run: QpdfRun = runQpdf): Promise<Uint8Array<ArrayBuffer>> {
  assertPdf(bytes)
  if (userPassword.length < 8 || userPassword === ownerPassword) throw new Error(translate('pdf:passwordErrors.userShort'))
  if ((!permissions.printing || !permissions.copying || !permissions.modifying) && ownerPassword.length < 8) throw new Error(translate('pdf:passwordErrors.ownerShort'))
  const args = ['--encrypt', userPassword, ownerPassword || crypto.randomUUID(), '256']
  if (!permissions.printing) args.push('--print=none')
  if (!permissions.copying) args.push('--extract=n')
  if (!permissions.modifying) args.push('--modify=none')
  args.push('--', '/in.pdf', '/out.pdf')
  const result = await run(args, bytes)
  if (!QPDF_OK(result.code) || !result.output) throw new Error(translate('pdf:passwordErrors.protectFailed'))
  return result.output
}

export async function removePdfPassword(bytes: Uint8Array, password: string, run: QpdfRun = runQpdf): Promise<Uint8Array<ArrayBuffer>> {
  assertPdf(bytes)
  // Tệp không mã hoá thì unlockPdf báo nhầm "hạn chế quyền". Không dùng `--is-encrypted`: mã 2 vừa là "không mã hoá" vừa là "tệp hỏng".
  const { stdout } = await run(['--show-encryption', '/in.pdf'], bytes)
  if (stdout.some((line) => /File is not encrypted/.test(line))) throw new Error(translate('pdf:passwordErrors.notEncrypted'))
  const result = await unlockPdf(bytes, password, run)
  if (!result.ok) {
    throw new Error(
      translate(
        result.reason === 'restricted'
          ? 'pdf:passwordErrors.restricted'
          : result.reason === 'wrong-password'
            ? 'pdf:passwordErrors.wrong'
            : 'pdf:passwordErrors.removeFailed',
      ),
    )
  }
  return result.bytes
}
