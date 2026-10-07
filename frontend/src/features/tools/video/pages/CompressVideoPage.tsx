import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { VideoWorkspace } from '../components/VideoWorkspace'

export default function CompressVideoPage() {
  const { t } = useTranslation('video')
  const [quality, setQuality] = useState<23 | 28 | 32>(28)
  const [edge, setEdge] = useState<720 | 1080>(720)
  return <VideoWorkspace options={{ action: 'compress', quality, edge }} actionLabel={t('compress.action')} note={t('compress.note')}>
    <div className="erp-tool-form__grid">
      <label className="erp-flow-field__label">{t('compress.level')}<Form.Select value={quality} onChange={(event) => setQuality(Number(event.target.value) as typeof quality)}><option value={23}>{t('compress.light')}</option><option value={28}>{t('compress.medium')}</option><option value={32}>{t('compress.strong')}</option></Form.Select></label>
      <label className="erp-flow-field__label">{t('compress.maxEdge')}<Form.Select value={edge} onChange={(event) => setEdge(Number(event.target.value) as typeof edge)}><option value={720}>720 px</option><option value={1080}>1080 px</option></Form.Select></label>
    </div>
  </VideoWorkspace>
}
