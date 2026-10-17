import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VideoWorkspace } from '../components/VideoWorkspace'

export default function ExtractAudioPage() {
  const { t } = useTranslation('video')
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3')
  return <VideoWorkspace options={{ action: 'audio', format }} actionLabel={t('audio.action')} note={t('audio.note')}>
    <div className="cn-audiostudio-formats" role="group" aria-label={t('audio.format')}>{(['mp3', 'm4a', 'wav'] as const).map(value => <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)}>{value.toUpperCase()}</button>)}</div>
  </VideoWorkspace>
}
