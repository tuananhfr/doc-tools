import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { WorkspaceGuide } from '@/features/tools/hub'
import type { LoadingProgress } from '../hooks/useDocWorkspace'
import { DropZone } from './DropZone'

export function PdfEditorWelcome({ loading, onFiles }: { loading: LoadingProgress | null; onFiles: (files: File[]) => void }) {
  const { t } = useTranslation('common')
  return <div className="cn-pdf-welcome">
    <section className="cn-studio-card cn-pdf-welcome__input">
      <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="file-earmark-plus" /></span><div><h2>{t('studio.pdf.inputTitle')}</h2><p>{t('studio.pdf.inputHint')}</p></div></div>
      <DropZone loading={loading} onFiles={onFiles} />
      <div className="cn-pdf-welcome__features">
        <div><Icon name="grid-1x2" /><strong>{t('studio.pdf.organize')}</strong></div>
        <div><Icon name="pencil-square" /><strong>{t('studio.pdf.annotate')}</strong></div>
        <div><Icon name="file-earmark-arrow-down" /><strong>{t('studio.pdf.export')}</strong></div>
      </div>
    </section>
    <aside className="cn-pdf-welcome__side">
      <section className="cn-studio-card cn-pdf-welcome__preview">
        <div className="cn-pdf-paper" aria-hidden="true"><span className="cn-pdf-paper__badge"><Icon name="file-earmark-pdf" /></span><span /><span /><span /><span /><span /><i><Icon name="check2" /></i></div>
        <h2>{t('studio.pdf.readyTitle')}</h2>
        <p>{t('studio.pdf.readyHint')}</p>
      </section>
      <WorkspaceGuide steps={[t('studio.pdf.stepUpload'), t('studio.pdf.stepEdit'), t('studio.pdf.stepDownload')]} tip={t('studio.pdf.tip')} note={t('tool.privacyFile')} />
    </aside>
  </div>
}
