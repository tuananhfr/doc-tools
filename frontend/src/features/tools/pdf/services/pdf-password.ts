import { translate } from '@/i18n/runtime'
import { QPDF_OK, runQpdf, type QpdfRun } from './qpdf'
import { unlockPdf } from './pdf-unlock'

export interface PdfPermissions { printing: boolean; copying: boolean; modifying: boolean }

export async function protectPdf(bytes: Uint8Array, userPassword: string, ownerPassword: string, permissions: PdfPermissions, run: QpdfRun = runQpdf): Promise<Uint8Array<ArrayBuffer>> {
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
