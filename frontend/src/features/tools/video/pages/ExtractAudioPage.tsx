import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { VideoWorkspace } from '../components/VideoWorkspace'

export default function ExtractAudioPage() {
  const { t } = useTranslation('video')
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3')
  return <VideoWorkspace options={{ action: 'audio', format }} actionLabel={t('audio.action')} note={t('audio.note')}>
    <label className="erp-flow-field__label">{t('audio.format')}<Form.Select value={format} onChange={(event) => setFormat(event.target.value as typeof format)}><option value="mp3">{t('audio.mp3')}</option><option value="m4a">M4A · AAC</option><option value="wav">{t('audio.wav')}</option></Form.Select></label>
  </VideoWorkspace>
}
