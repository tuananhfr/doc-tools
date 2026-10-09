import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { VideoWorkspace } from '../components/VideoWorkspace'
import { readSeconds, VideoTimeRange } from '../components/VideoTimeRange'

export default function TrimVideoPage() {
  const { t } = useTranslation('video')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('5')
  return <VideoWorkspace options={{ action: 'trim', start: readSeconds(start), end: readSeconds(end) }} actionLabel={t('trim.action')} note={t('trim.note')}>
    <VideoTimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
  </VideoWorkspace>
}
