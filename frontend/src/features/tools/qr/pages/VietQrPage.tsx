import { useId, useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CopyButton, downloadOutput, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { QrPreview } from '../components/QrPreview'
import { qrPngBlob, qrSvgBlob } from '../services/qr-render'
import { createMatrix } from '../utils/qr-matrix'
import { buildVietQr } from '../utils/vietqr'

export default function VietQrPage() {
  const { t } = useTranslation('qr')
  const ids = [useId(), useId(), useId(), useId()]
  const [bin, setBin] = useState('')
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const payload = buildVietQr({ bin, account, amount, note })
  const matrix = useMemo(() => payload ? createMatrix(payload) : null, [payload])

  const download = async (format: 'png' | 'svg') => {
    if (!matrix) return
    const blob = format === 'png' ? await qrPngBlob(matrix, '#102e57') : qrSvgBlob(matrix, '#102e57')
    downloadOutput({ name: `vietqr-${bin}-${account}.${format}`, blob })
  }

  return <ToolBoard side={<>
    <QrPreview matrix={matrix} color="#102e57" placeholder={t('vietqr.placeholder')} />
    {payload ? <div className="erp-flow-field"><span className="erp-flow-field__label">{t('shared.codeContent')}</span><p className="erp-qr-payload">{payload}</p><CopyButton text={payload} label={t('vietqr.copy')} /></div> : null}
    <div className="d-flex flex-wrap gap-2 mt-3"><Button disabled={!matrix} onClick={() => void download('png')}>{t('shared.downloadPng')}</Button><Button variant="outline-secondary" disabled={!matrix} onClick={() => void download('svg')}>{t('vietqr.downloadSvg')}</Button></div>
    <p className="erp-tool-result__note mt-3">{t('vietqr.checkNote')}</p>
  </>} sideLabel={t('vietqr.side')}>
    <ToolPanel title={t('vietqr.panel')}>
      <div className="erp-tool-form__grid">
        <label className="erp-flow-field__label" htmlFor={ids[0]}>{t('vietqr.bin')}
          <Form.Control id={ids[0]} inputMode="numeric" maxLength={6} value={bin} onChange={(event) => setBin(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[1]}>{t('vietqr.account')}
          <Form.Control id={ids[1]} inputMode="numeric" maxLength={30} value={account} onChange={(event) => setAccount(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[2]}>{t('vietqr.amount')}
          <Form.Control id={ids[2]} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="erp-flow-field__label" htmlFor={ids[3]}>{t('vietqr.note')}
          <Form.Control id={ids[3]} maxLength={50} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <p className="erp-tool-result__note mt-3">{t('vietqr.privacy')}</p>
    </ToolPanel>
  </ToolBoard>
}
