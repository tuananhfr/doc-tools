import { useState } from 'react'
import { Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { VideoWorkspace } from '../components/VideoWorkspace'
import { VideoTimeRange } from '../components/VideoTimeRange'

export default function VideoGifPage() {
  const { t } = useTranslation('video')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(3)
  const [width, setWidth] = useState<320 | 480 | 640>(480)
  const [fps, setFps] = useState<8 | 12 | 15>(12)
  return <VideoWorkspace options={{ action: 'gif', start, end, width, fps }} actionLabel={t('gif.action')} note={t('gif.note')}>
    <VideoTimeRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
    <div className="erp-tool-form__grid mt-3">
      <label className="erp-flow-field__label">{t('gif.width')}<Form.Select value={width} onChange={(event) => setWidth(Number(event.target.value) as typeof width)}><option value={320}>320 px</option><option value={480}>480 px</option><option value={640}>640 px</option></Form.Select></label>
      <label className="erp-flow-field__label">{t('gif.fps')}<Form.Select value={fps} onChange={(event) => setFps(Number(event.target.value) as typeof fps)}><option value={8}>{t('gif.fpsSmall')}</option><option value={12}>{t('gif.fpsBalanced')}</option><option value={15}>{t('gif.fpsSmooth')}</option></Form.Select></label>
    </div>
  </VideoWorkspace>
}
