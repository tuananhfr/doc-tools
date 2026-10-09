import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { CopyButton, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { isUnicodeVietnamese, removeVietnameseMarks, tcvn3ToUnicode, vniToUnicode } from '../utils/legacy-font'

type Conversion = 'tcvn3' | 'tcvn3-upper' | 'vni' | 'nfc' | 'strip' | 'lower' | 'upper'

const LEGACY_CONVERSIONS: readonly Conversion[] = ['tcvn3', 'tcvn3-upper', 'vni']

export default function LegacyFontPage() {
  const { t } = useTranslation('vietnam')
  const inputId = useId()
  const [input, setInput] = useState('')
  const [conversion, setConversion] = useState<Conversion>('tcvn3')
  const alreadyUnicode = LEGACY_CONVERSIONS.includes(conversion) && isUnicodeVietnamese(input)
  const output = alreadyUnicode ? input : ({
    tcvn3: () => tcvn3ToUnicode(input),
    'tcvn3-upper': () => tcvn3ToUnicode(input, true),
    vni: () => vniToUnicode(input),
    nfc: () => input.normalize('NFC'),
    strip: () => removeVietnameseMarks(input),
    lower: () => input.toLowerCase(),
    upper: () => input.toUpperCase(),
  })[conversion]()

  return <ToolBoard side={<div className="erp-tool-result">
    <p className="erp-tool-result__label">{t('legacyFont.resultLabel')}</p>
    {alreadyUnicode ? <p className="erp-flow-note erp-flow-note--warning mb-0" role="alert"><Icon name="exclamation-triangle" /><span>{t('legacyFont.alreadyUnicode')}</span></p> : null}
    <p className="erp-qr-payload" aria-live="polite">{output || '—'}</p>
    {output ? <CopyButton text={output} label={t('legacyFont.copy')} /> : null}
    <p className="erp-tool-result__note mt-3">{t('legacyFont.note')}</p>
  </div>}>
    <ToolPanel title={t('legacyFont.panelTitle')}>
      <label className="erp-flow-field__label">{t('legacyFont.conversionLabel')}
        <Form.Select value={conversion} onChange={(event) => setConversion(event.target.value as Conversion)}>
          <option value="tcvn3">{t('legacyFont.conversions.tcvn3')}</option>
          <option value="tcvn3-upper">{t('legacyFont.conversions.tcvn3Upper')}</option>
          <option value="vni">{t('legacyFont.conversions.vni')}</option>
          <option value="nfc">{t('legacyFont.conversions.nfc')}</option>
          <option value="strip">{t('legacyFont.conversions.strip')}</option>
          <option value="lower">{t('legacyFont.conversions.lower')}</option>
          <option value="upper">{t('legacyFont.conversions.upper')}</option>
        </Form.Select>
      </label>
      <label className="erp-flow-field__label mt-3" htmlFor={inputId}>{t('legacyFont.contentLabel')}</label>
      <Form.Control id={inputId} as="textarea" rows={12} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t('legacyFont.placeholder')} />
    </ToolPanel>
  </ToolBoard>
}
