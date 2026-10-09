import { useId, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CopyButton, downloadOutput, formatQuantity, parseMoney, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { QrPreview } from '../components/QrPreview'
import { qrPngBlob, qrSvgBlob } from '../services/qr-render'
import { createMatrix } from '../utils/qr-matrix'
import { buildVietQr, VIETQR_NOTE_MAX, vietQrNote } from '../utils/vietqr'

type Field = 'bin' | 'account' | 'amount'
const AMOUNT_MAX = 999_999_999_999

export default function VietQrPage() {
  const { t } = useTranslation('qr')
  const ids = [useId(), useId(), useId(), useId()]
  const [bin, setBin] = useState('')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  // Thiếu chữ số chỉ báo khi đã rời ô, để không đỏ ngay lúc đang gõ dở; ký tự sai thì báo liền.
  const [left, setLeft] = useState<Record<Field, boolean>>({ bin: false, account: false, amount: false })
  const leave = (field: Field) => () => setLeft((value) => ({ ...value, [field]: true }))

  const binError = bin && (!/^\d+$/.test(bin) || bin.length > 6 || (left.bin && bin.length !== 6)) ? t('vietqr.binError') : ''
  const accountError = !account ? ''
    : !/^\d+$/.test(account) ? t('vietqr.accountDigits')
      : account.length > 30 || (left.account && account.length < 4) ? t('vietqr.accountLength') : ''
  const amountValue = amount.trim() ? parseMoney(amount) : null
  const amountError = !amount.trim() ? ''
    : amountValue === null ? t('vietqr.amountInvalid')
      : !Number.isInteger(amountValue) ? t('vietqr.amountInteger')
        : amountValue < 1 || amountValue > AMOUNT_MAX ? t('vietqr.amountRange') : ''
  const amountEcho = !amountError && amountValue !== null && formatQuantity(amountValue) !== amount.trim() ? t('vietqr.amountUnderstood', { value: formatQuantity(amountValue) }) : ''
  const noteLength = vietQrNote(note).length
  const noteError = noteLength > VIETQR_NOTE_MAX ? t('vietqr.noteTooLong', { max: VIETQR_NOTE_MAX }) : ''

  const ready = /^\d{6}$/.test(bin) && /^\d{4,30}$/.test(account) && !amountError && !noteError
  const payload = ready ? buildVietQr({ bin, account, amount: amountValue === null ? '' : String(amountValue), note }) : null
  const matrix = useMemo(() => payload ? createMatrix(payload) : null, [payload])

  const download = async (format: 'png' | 'svg') => {
    if (!matrix) return
    const blob = format === 'png' ? await qrPngBlob(matrix, '#102e57') : qrSvgBlob(matrix, '#102e57')
    downloadOutput({ name: `vietqr-${bin}-${account}.${format}`, blob })
  }
  const message = (id: string, error: string, hint = '') => error
    ? <span id={`${id}-note`} className="erp-tool-form__error" role="alert">{error}</span>
    : hint ? <span id={`${id}-note`} className="erp-flow-field__hint">{hint}</span> : null
  const describedBy = (id: string, error: string, hint = '') => error || hint ? `${id}-note` : undefined

  return <ToolBoard side={<>
    <QrPreview matrix={matrix} color="#102e57" placeholder={t('vietqr.placeholder')} />
    {payload ? <div className="erp-flow-field"><span className="erp-flow-field__label">{t('shared.codeContent')}</span><p className="erp-qr-payload">{payload}</p><CopyButton text={payload} label={t('vietqr.copy')} /></div> : null}
    <div className="d-flex flex-wrap gap-2 mt-3"><Button disabled={!matrix} onClick={() => void download('png')}>{t('shared.downloadPng')}</Button><Button variant="outline-secondary" disabled={!matrix} onClick={() => void download('svg')}>{t('vietqr.downloadSvg')}</Button></div>
    <p className="erp-tool-result__note mt-3">{t('vietqr.checkNote')}</p>
  </>} sideLabel={t('vietqr.side')}>
    <ToolPanel title={t('vietqr.panel')}>
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={ids[0]}>{t('vietqr.bin')}
          <Form.Control id={ids[0]} inputMode="numeric" autoComplete="off" value={bin} isInvalid={Boolean(binError)} aria-describedby={describedBy(ids[0], binError)} onBlur={leave('bin')} onChange={(event) => setBin(event.target.value.trim())} />
          {message(ids[0], binError)}
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[1]}>{t('vietqr.account')}
          {/* Số tài khoản hay được chép kèm dấu cách nhóm số ("0123 456 789"). */}
          <Form.Control id={ids[1]} inputMode="numeric" autoComplete="off" value={account} isInvalid={Boolean(accountError)} aria-describedby={describedBy(ids[1], accountError)} onBlur={leave('account')} onChange={(event) => setAccount(event.target.value.replace(/\s/g, ''))} />
          {message(ids[1], accountError)}
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[2]}>{t('vietqr.amount')}
          <Form.Control id={ids[2]} inputMode="decimal" autoComplete="off" value={amount} isInvalid={Boolean(amountError)} aria-describedby={describedBy(ids[2], amountError, amountEcho)} onBlur={leave('amount')} onChange={(event) => setAmount(event.target.value)} />
          {message(ids[2], amountError, amountEcho)}
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[3]}>{t('vietqr.note')}
          <Form.Control id={ids[3]} value={note} isInvalid={Boolean(noteError)} aria-describedby={note ? `${ids[3]}-counter${noteError ? ` ${ids[3]}-note` : ''}` : undefined} onChange={(event) => setNote(event.target.value)} />
          {note ? <span id={`${ids[3]}-counter`} className="erp-flow-field__hint d-block">{t('vietqr.noteCounter', { used: noteLength, max: VIETQR_NOTE_MAX })}</span> : null}
          {message(ids[3], noteError)}
        </label>
      </div>
      <p className="erp-tool-result__note mt-3">{t('vietqr.privacy')}</p>
    </ToolPanel>
  </ToolBoard>
}
