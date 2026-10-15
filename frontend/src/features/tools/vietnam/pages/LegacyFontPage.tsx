import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { CopyButton, ToolBoard, ToolPanel, WorkspaceGuide } from '@/features/tools/hub'
import { isUnicodeVietnamese, removeVietnameseMarks, tcvn3ToUnicode, vniToUnicode } from '../utils/legacy-font'

type Conversion = 'tcvn3' | 'tcvn3-upper' | 'vni' | 'nfc' | 'strip' | 'lower' | 'upper'

const LEGACY_CONVERSIONS: readonly Conversion[] = ['tcvn3', 'tcvn3-upper', 'vni']

export default function LegacyFontPage() {
  const { t } = useTranslation('vietnam')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.legacyFont' })
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

  return <ToolBoard className="cn-legacyfont-workspace" layout="wide-result" after={<div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('step1'), studio('step2'), studio('step3')]} tip={studio('tip')} /></div>} side={<div className="erp-tool-result">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="alphabet" /></span><div><h2>{t('legacyFont.resultLabel')}</h2><p>{studio('resultHint')}</p></div></div>
    {alreadyUnicode ? <p className="erp-flow-note erp-flow-note--warning mb-0" role="alert"><Icon name="exclamation-triangle" /><span>{t('legacyFont.alreadyUnicode')}</span></p> : null}
    <div className="cn-legacyfont-output">{!output ? <Icon name="fonts" /> : null}<p className="erp-qr-payload" aria-live="polite">{output || '—'}</p></div>
    {output ? <CopyButton text={output} label={t('legacyFont.copy')} variant="primary" className="cn-legacyfont-copy" /> : null}
    <p className="erp-tool-result__note mt-3">{t('legacyFont.note')}</p>
  </div>}>
    <ToolPanel title={t('legacyFont.panelTitle')} actions={<span className="cn-studio-small-icon"><Icon name="input-cursor-text" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
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
