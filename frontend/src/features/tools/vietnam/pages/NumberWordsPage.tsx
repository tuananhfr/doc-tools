import { CalculationStudio } from '@/features/tools/utility/components/CalculationStudio'
import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CopyButton, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { numberToVietnameseWords } from '../utils/number-words'

export default function NumberWordsPage() {
  const { t } = useTranslation('vietnam')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.numberWords' })
  const inputId = useId()
  const [input, setInput] = useState('')
  const [zeroWord, setZeroWord] = useState<'linh' | 'lẻ'>('linh')
  const [fourWord, setFourWord] = useState<'bốn' | 'tư'>('bốn')
  const words = input ? numberToVietnameseWords(input, { zeroWord, fourWord }) : null
  const invalid = input !== '' && words === null

  return (
    <CalculationStudio kind="numbers"><ToolBoard className="cn-numberwords-workspace" layout="balanced" side={<div className="erp-tool-result cn-numberwords-result" aria-live="polite">
      <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="chat-left-text" /></span><div><h2>2. {t('numberWords.resultLabel')}</h2><p>{studio('resultHint')}</p></div></div>
      <div className={`cn-numberwords-text${words ? '' : ' cn-numberwords-text--empty'}`}>{!words ? <Icon name="chat-left-text" /> : null}<p className="erp-tool-result__value">{words ?? '—'}</p></div>
      <p id={`${inputId}-hint`} className={invalid ? 'erp-tool-form__error' : 'erp-tool-result__note'} role={invalid ? 'alert' : undefined}>{t(invalid ? 'numberWords.invalid' : 'numberWords.note')}</p>
      {words ? <CopyButton className="cn-numberwords-copy" variant="primary" text={words} label={t('numberWords.copy')} /> : null}
    </div>}>
      <ToolPanel title={`1. ${t('numberWords.panelTitle')}`} actions={<span className="cn-studio-small-icon"><Icon name="123" /></span>}>
        <p className="cn-studio-form-hint">{studio('inputHint')}</p>
        <label className="erp-flow-field__label" htmlFor={inputId}>{t('numberWords.inputLabel')}</label>
        <Form.Control id={inputId} inputMode="numeric" value={input} isInvalid={invalid} aria-invalid={invalid} aria-describedby={`${inputId}-hint`} onChange={(event) => setInput(event.target.value)} placeholder={t('numberWords.placeholder')} />
        <div className="erp-tool-form__grid mt-3">
          <label className="erp-flow-field__label">{t('numberWords.zeroWordLabel')}
            <Form.Select value={zeroWord} onChange={(event) => setZeroWord(event.target.value as 'linh' | 'lẻ')}>
              <option value="linh">Linh</option><option value="lẻ">Lẻ</option>
            </Form.Select>
          </label>
          <label className="erp-flow-field__label">{t('numberWords.fourWordLabel')}
            <Form.Select value={fourWord} onChange={(event) => setFourWord(event.target.value as 'bốn' | 'tư')}>
              <option value="bốn">Bốn</option><option value="tư">Tư</option>
            </Form.Select>
          </label>
        </div>
      </ToolPanel>
    </ToolBoard></CalculationStudio>
  )
}
