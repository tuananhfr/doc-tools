import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { FlowProgress } from '@/features/tools/hub/components/flow/FlowProgress';
import { FlowResult } from '@/features/tools/hub/components/flow/FlowResult';
import { CodeWorkspace } from '../components/QrStudio';
import { useFlowRun } from '@/features/tools/hub/hooks/useFlowRun';
import {Gs1Notice} from '../components/Gs1Notice'
import {checkBarcode} from '../utils/barcode-check'
import { BARCODE_KINDS } from '../config/barcode-kinds';
import { useBarcodeEngine } from '../hooks/useBarcodeEngine';
import { labelTask } from '../services/label-export';
import { csvFirstColumn } from '../utils/barcode-batch';
import { labelCode, type LabelCodeKind } from '../utils/label-code';
import { labelPages, type LabelSettings } from '../utils/label-layout';
export default function LabelSheetPage() {
    const { t } = useTranslation('qr'), [text, setText] = useState(''), [csv, setCsv] = useState(false), [skipHeader, setSkipHeader] = useState(false);
    const [kind, setKind] = useState<LabelCodeKind>('qr'), [settings, setSettings] = useState<LabelSettings>({ widthMm: 60, heightMm: 40, copies: 1, gapMm: 2, marginMm: 8 });
    const [preview, setPreview] = useState<{
        value: string;
        url: string;
        width: number;
        height: number;
    }[]>([]), [previewError, setPreviewError] = useState(''), [fileError, setFileError] = useState(''), [pageIndex, setPageIndex] = useState(0), engine = useBarcodeEngine(kind !== 'qr'), run = useFlowRun();
    let values = (csv ? csvFirstColumn(text) : text.split(/\r\n|\n|\r/)).map(value => value.trim()).filter(Boolean);
    if (skipHeader)
        values = values.slice(1);
    const changes=kind==='qr'?[]:values.flatMap(raw=>{const checked=checkBarcode(kind,raw);return checked.ok&&checked.value!==raw?[{raw,value:checked.value}]:[]})
  let pages: ReturnType<typeof labelPages> = [], invalid = false;
    try {
        pages = labelPages(values, settings);
    }
    catch {
        invalid = Boolean(text);
    }
    const currentPage = Math.min(pageIndex, Math.max(0, pages.length - 1)), signature = JSON.stringify([values, settings, kind, currentPage]);
    useEffect(() => {
        let stopped = false;
        const urls: string[] = [];
        setPreview([]);
        setPreviewError('');
        const timer = window.setTimeout(async () => {
            try {
                const cache = new Map<string, {
                    url: string;
                    width: number;
                    height: number;
                value: string;}>(), next: {
                    value: string;
                    url: string;
                    width: number;
                    height: number;
                }[] = [];
                for (const placement of pages[currentPage] ?? []) {
                    if (stopped)
                        return;
                    let encoded = cache.get(placement.value);
                    if (!encoded) {
                        const code = await labelCode(placement.value, kind, settings.widthMm, settings.heightMm, engine.status === 'ready' ? engine.engine : null);
                        if (stopped)
                            return;
                        const url = URL.createObjectURL(code.preview);
                        urls.push(url);
                        encoded = { url, width: code.width, height: code.height, value: code.value };
                        cache.set(placement.value, encoded);
                    }
                    next.push({ ...encoded });
                }
                if (!stopped)
                    setPreview(next);
            }
            catch {
                if (!stopped)
                    setPreviewError(t('labels.codeInvalid'));
            }
        }, 250);
        return () => { stopped = true; clearTimeout(timer); urls.forEach(url => URL.revokeObjectURL(url)); };
    }, [signature, engine.status, t]);
    const blocked = !values.length || invalid || Boolean(previewError) || kind !== 'qr' && engine.status !== 'ready';
    const action = run.state.phase === 'running' ? <FlowProgress progress={run.state.progress} onCancel={run.cancel}/> : <Button disabled={blocked} onClick={() => void run.start(labelTask(values, settings, kind, engine.status === 'ready' ? engine.engine : null))}>{t('labels.run')}</Button>;
    const readFile = async (file: File | undefined) => { if (!file)
        return; try {
        if (file.size > 1024 * 1024)
            throw new Error('limit');
        setText(await file.text());
        setCsv(true);
        setFileError('');
        setPageIndex(0);
    }
    catch {
        setFileError(t('labels.fileInvalid'));
    } };
    if (run.state.phase === 'done')
        return <FlowResult result={run.state.result} onRestart={run.reset}/>;
    return <CodeWorkspace inputTitle={t('labels.title')} previewTitle={t('labels.output')} preview={<>
    <div className="cn-label-paper" style={{ aspectRatio: '210 / 297' }}>{(pages[currentPage] ?? []).map((placement, index) => <div key={index} className="cn-label-cell" style={{ left: `${placement.xMm / 210 * 100}%`, top: `${placement.yMm / 297 * 100}%`, width: `${settings.widthMm / 210 * 100}%`, height: `${settings.heightMm / 297 * 100}%` }}>{preview[index] ? <img src={preview[index].url} style={{ width: `${preview[index].width / settings.widthMm * 100}%`, height: `${preview[index].height / settings.heightMm * 100}%` }} alt={t('labels.codeAlt', { value: preview[index].value })}/> : null}</div>)}</div>
    {pages.length ? <div className="cn-graphic-page-controls"><Button variant="outline-secondary" disabled={!currentPage} onClick={() => setPageIndex(currentPage - 1)}>{t('labels.previous')}</Button><span>{currentPage + 1}/{pages.length}</span><Button variant="outline-secondary" disabled={currentPage >= pages.length - 1} onClick={() => setPageIndex(currentPage + 1)}>{t('labels.next')}</Button></div> : null}
    <p className="erp-flow-field__hint mt-3">{t('labels.printHint')}</p>
  </>} input={<>
    <p>{t('labels.notice')}</p>
    <label className="erp-flow-field__label">{t('labels.kind')}<Form.Select aria-label={t('labels.kind')} value={kind} onChange={event => setKind(event.target.value as LabelCodeKind)}><option value="qr">QR</option>{BARCODE_KINDS.map(item => <option key={item.kind} value={item.kind}>{item.label}</option>)}</Form.Select></label>
    <label className="erp-flow-field__label mt-3">{t('labels.values')}<Form.Control aria-label={t('labels.values')} as="textarea" rows={6} maxLength={1000000} value={text} onChange={event => { setText(event.target.value); setPageIndex(0); }}/></label>
    <label className="erp-flow-field__label mt-3">{t('labels.fileInput')}<FileInput accept="text/csv,text/plain,.csv,.txt" onChange={event => void readFile((event.target as HTMLInputElement).files?.[0])}/></label>
    <Form.Check id="cn-label-csv" className="mt-2" label={t('labels.csv')} checked={csv} onChange={event => setCsv(event.target.checked)}/>
    <Form.Check id="cn-label-header" label={t('labels.skipHeader')} checked={skipHeader} onChange={event => setSkipHeader(event.target.checked)}/>
    {['ean13','ean8','itf14'].includes(kind)?<Gs1Notice/>:null}
      {changes.length?<details open className="mt-3"><summary>{t('labels.changed',{total:changes.length})}</summary><ul>{changes.map((item,index)=><li key={index}>{item.raw} → {item.value}</li>)}</ul></details>:null}
      <div className="erp-tool-form__grid mt-3">{(['widthMm', 'heightMm', 'copies', 'gapMm', 'marginMm'] as const).map(key => <label key={key}>{t(`labels.${key}`)}<Form.Control type="number" step={key === 'copies' ? 1 : .5} value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: Number(event.target.value) }))}/></label>)}</div>
    {invalid || previewError || fileError ? <p role="alert" className="erp-tool-form__error mt-3">{fileError || previewError || t('labels.invalid')}</p> : null}
    {run.state.phase === 'idle' && run.state.error ? <p role="alert" className="erp-tool-form__error mt-3">{run.state.error.message}</p> : null}
    <div className="mt-3">{action}</div>
  </>} />;
}
