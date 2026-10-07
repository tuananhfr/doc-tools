import { useId, useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CopyButton, ToolBoard, ToolPanel } from '@/features/tools/hub'
import { numberToVietnameseWords } from '../utils/number-words'

export default function NumberWordsPage() {
  const { t } = useTranslation('vietnam')
  const inputId = useId()
  const [input, setInput] = useState('')
  const [zeroWord, setZeroWord] = useState<'linh' | 'lẻ'>('linh')
  const [fourWord, setFourWord] = useState<'bốn' | 'tư'>('bốn')
  const words = input ? numberToVietnameseWords(input, { zeroWord, fourWord }) : null

  return (
    <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
      <p className="erp-tool-result__label">{t('numberWords.resultLabel')}</p>
      <p className="erp-tool-result__value">{words ?? '—'}</p>
      <p className="erp-tool-result__note">{t(words === null && input ? 'numberWords.invalid' : 'numberWords.note')}</p>
      {words ? <CopyButton text={words} label={t('numberWords.copy')} /> : null}
    </div>}>
      <ToolPanel title={t('numberWords.panelTitle')}>
        <label className="erp-flow-field__label" htmlFor={inputId}>{t('numberWords.inputLabel')}</label>
        <Form.Control id={inputId} inputMode="numeric" value={input} onChange={(event) => setInput(event.target.value)} placeholder={t('numberWords.placeholder')} />
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
    </ToolBoard>
  )
}
