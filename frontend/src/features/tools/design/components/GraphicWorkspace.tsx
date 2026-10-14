import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { TemplatePicker, ToolBoard, ToolPanel } from '@/features/tools/hub';
import { ResponsivePreview } from '@/features/tools/hub/components/board/ResponsivePreview';
import { FlowProgress } from '@/features/tools/hub/components/flow/FlowProgress';
import { FlowResult } from '@/features/tools/hub/components/flow/FlowResult';
import { useFlowRun } from '@/features/tools/hub/hooks/useFlowRun';
import type { GraphicBrand, GraphicTemplate } from '../types/graphic.types';
import { GRAPHIC_LIMITS } from '../types/graphic.types';
import { graphicDimensions,graphicSheets } from '../utils/graphic-layout';
import { graphicTask, type GraphicOutput } from '../services/graphic-export';
import { useGraphicPreview } from '../hooks/useGraphicPreview';
import { useTemplateThumbnails } from '../hooks/useTemplateThumbnails';
import { Icon } from '@/components/ui';
import { BRAND_PRESET_KEY, readBrandPreset, saveBrandPreset } from '../utils/brand-preset';
const initialBrand: GraphicBrand = { title: '', subtitle: '', accent: '#005bea', background: '#ffffff', fit: 'contain' };
export function GraphicWorkspace({ files, onFiles, templates, onBack, design = false, visible = true }: {
    files: File[];
    onFiles: (files: File[]) => void;
    templates: readonly GraphicTemplate[];
    onBack?: () => void;
    design?: boolean;
    /** `false` khi màn đang ẩn (ghép ảnh đơn giản): không vẽ thumbnail cho thứ người dùng không thấy. */
    visible?: boolean;
}) {
    const { t } = useTranslation('image'), { t: tc } = useTranslation('common'), [templateId, setTemplateId] = useState(templates[0].id), [brand, setBrand] = useState(initialBrand), [logo, setLogo] = useState<File | null>(null), [format, setFormat] = useState<GraphicOutput>('zip'), [page, setPage] = useState(0), [notice, setNotice] = useState(''), [dimensions, setDimensions] = useState<{
        width: number;
        height: number;
    } | null>(null), run = useFlowRun();
    const baseTemplate = templates.find(item => item.id === templateId) ?? templates[0], template = dimensions ? { ...baseTemplate, widthMm: dimensions.width, heightMm: dimensions.height } : baseTemplate, job = { template, brand, files, logo }, preview = useGraphicPreview(job, page);
    const thumbnails = useTemplateThumbnails({ brand, files, logo }, templates, visible);
    const chooseTemplate = (id: string) => { setTemplateId(id); setPage(0); setDimensions(null); };
    const picker = <TemplatePicker label={t('shop.layout')} value={baseTemplate.id} onChange={chooseTemplate} items={templates.map(item => ({ id: item.id, label: design ? t(`shop.templates.${item.kind}`) : t('shop.slots', { count: item.slots }), preview: thumbnails[item.id] ? <img src={thumbnails[item.id]} alt=""/> : null }))}/>;
    let pages = 1,dimensionsValid=true;
    try {
        pages = graphicSheets(job).length;graphicDimensions(template,300);
    }
    catch { dimensionsValid=false }
    const blocked = !dimensionsValid||!preview.url||files.length > GRAPHIC_LIMITS.files || !design && !files.length || design && !files.length && !brand.title && !brand.subtitle && !logo || preview.error;
    const update = (patch: Partial<GraphicBrand>) => setBrand(current => ({ ...current, ...patch }));
    const action = run.state.phase === 'running' ? <FlowProgress progress={run.state.progress} onCancel={run.cancel}/> : <Button disabled={Boolean(blocked)} onClick={() => void run.start(graphicTask(job, format))}>{t('shop.run')}</Button>;
    return <>
    {onBack ? <Button className="mb-3" variant="outline-secondary" disabled={run.state.phase === 'running'} onClick={onBack}>{t('shop.back')}</Button> : null}
    {run.state.phase === 'done' ? <FlowResult result={run.state.result} onRestart={run.reset}/> : <ToolBoard><ResponsivePreview action={action} templates={picker} preview={<>
      <div className="cn-graphic-preview">{preview.url ? <img src={preview.url} alt={t('shop.preview')}/> : <p>{preview.error ? t('shop.previewFailed') : t('shop.previewWaiting')}</p>}</div>
      {pages > 1 ? <div className="cn-graphic-page-controls"><Button variant="outline-secondary" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>{t('shop.previous')}</Button><span>{page + 1}/{pages}</span><Button variant="outline-secondary" disabled={page >= pages - 1} onClick={() => setPage(value => Math.min(pages - 1, value + 1))}>{t('shop.next')}</Button></div> : null}
      <p className="erp-flow-field__hint mt-3">{t('shop.dimensions', { width: template.widthMm, height: template.heightMm, count: pages })}</p>
      {template.kind === 'seal' ? <p className="erp-flow-field__hint mt-2" role="note">{t('shop.sealNotice')}</p> : null}
    </>}><ToolPanel title={t(design ? 'shop.designPanel' : 'shop.panel')}>
      <label className="erp-flow-field__label">{t('shop.files')}<FileInput multiple accept="image/jpeg,image/png,image/webp" onChange={e => { onFiles([...(e.target as HTMLInputElement).files ?? []]); setPage(0); }}/></label>
      {files.length ? <details className="mt-2"><summary>{t('shop.fileCount', { count: files.length })}</summary><ol>{files.map((file, index) => <li key={index}>{file.name}<Button size="sm" variant="link" disabled={index === 0} aria-label={t('shop.moveUp', { name: file.name })} onClick={() => { const next = [...files]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onFiles(next); }}><Icon name="arrow-up"/></Button><Button size="sm" variant="link" aria-label={t('shop.remove', { name: file.name })} onClick={() => { onFiles(files.filter((_, i) => i !== index)); setPage(0); }}><Icon name="x"/></Button></li>)}</ol></details> : null}
      <label className="erp-flow-field__label mt-3">{t('shop.title')}<Form.Control maxLength={80} value={brand.title} onChange={e => update({ title: e.target.value })}/></label>
      <label className="erp-flow-field__label mt-3">{t('shop.subtitle')}<Form.Control maxLength={160} value={brand.subtitle} onChange={e => update({ subtitle: e.target.value })}/></label>
      <label className="erp-flow-field__label mt-3">{t('shop.logo')}<FileInput accept="image/jpeg,image/png,image/webp" onChange={e => setLogo((e.target as HTMLInputElement).files?.[0] ?? null)}/></label>
      <div className="erp-flow-pair mt-3"><label>{t('shop.accent')}<Form.Control type="color" value={brand.accent} onChange={e => update({ accent: e.target.value })}/></label><label>{t('shop.background')}<Form.Select aria-label={t('shop.background')} value={brand.background} onChange={e => update({ background: e.target.value })}><option value="#ffffff">{t('portrait.white')}</option><option value="#f0f6ff">{t('portrait.blue')}</option><option value="transparent">{t('shop.transparent')}</option></Form.Select></label></div>
      <label className="erp-flow-field__label mt-3">{t('shop.fit')}<Form.Select aria-label={t('shop.fit')} value={brand.fit} onChange={e => update({ fit: e.target.value as GraphicBrand['fit'] })}><option value="contain">{t('shop.contain')}</option><option value="cover">{t('shop.cover')}</option></Form.Select></label>
      <label className="erp-flow-field__label mt-3">{t('shop.format')}<Form.Select aria-label={t('shop.format')} value={format} onChange={e => setFormat(e.target.value as GraphicOutput)}><option value="zip">ZIP (PNG)</option><option value="png">PNG</option><option value="jpg">JPG 300 DPI</option><option value="pdf">PDF</option></Form.Select></label>
      {design ? <>
        <div className="erp-flow-pair mt-3">
          <label>{t('shop.width')}<Form.Control type="number" min={10} max={400} value={template.widthMm} onChange={e => setDimensions({ width: Number(e.target.value), height: template.heightMm })}/></label>
          <label>{t('shop.height')}<Form.Control type="number" min={10} max={400} value={template.heightMm} onChange={e => setDimensions({ width: template.widthMm, height: Number(e.target.value) })}/></label>
        </div>
        <p className="erp-flow-field__hint mt-3">{t('shop.printHint')}</p>
      </> : null}
      <details className="mt-3"><summary>{t('shop.brandPreset')}</summary>
        <p className="erp-flow-field__hint">{t('shop.brandNotice')}</p>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" onClick={() => { try {
            saveBrandPreset(localStorage, brand);
            setNotice(t('shop.brandSaved'));
        }
        catch {
            setNotice(t('shop.brandFailed'));
        } }}>{t('shop.brandSave')}</Button>
          <Button variant="outline-secondary" onClick={() => { const value = readBrandPreset(localStorage); if (value)
            setBrand(value); setNotice(value ? t('shop.brandLoaded') : t('shop.brandMissing')); }}>{t('shop.brandLoad')}</Button>
          <Button variant="outline-secondary" onClick={() => { try {
            localStorage.removeItem(BRAND_PRESET_KEY);
            setNotice(t('shop.brandRemoved'));
        }
        catch {
            setNotice(t('shop.brandFailed'));
        } }}>{t('shop.brandForget')}</Button>
        </div>{notice ? <p role="status">{notice}</p> : null}
      </details>
      {run.state.phase === 'idle' && run.state.error ? <p className="erp-tool-form__error mt-3" role="alert">{run.state.error.message}</p> : null}
      {blocked ? <p className="erp-tool-form__error mt-3" role="alert">{t('shop.invalid')}</p> : null}
      <div className="mt-3">{action}</div>
    </ToolPanel></ResponsivePreview></ToolBoard>}
  </>;
}
