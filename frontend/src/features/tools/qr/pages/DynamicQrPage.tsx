import { FileInput } from '@/features/tools/hub/components/flow/FileInput'
import { useMemo, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui';
import { ToolPanel, downloadOutput } from '@/features/tools/hub';
import { QrPreview } from '../components/QrPreview';
import { createDynamicCode, DynamicCodeError, revokeDynamicCode } from '../services/dynamic-codes.api';
import { qrPdfBlob, qrPngBlob, qrSvgBlob } from '../services/qr-render';
import { CODE_STORE, parseCodeReceipt, readCodeReceipts, writeCodeReceipts, type DynamicCodeReceipt } from '../utils/dynamic-codes';
import { createMatrix } from '../utils/qr-matrix';
import { CodeWorkspace, QrStudio } from '../components/QrStudio'

export default function DynamicQrPage({ embedded = false }: { embedded?: boolean }) {
    const { t } = useTranslation('qr');
    const { t: s } = useTranslation('qr', { keyPrefix: 'codeStudio' });
    const [destination, setDestination] = useState('');
    const [expiry, setExpiry] = useState('');
    const [consent, setConsent] = useState(false);
    const [items, setItems] = useState<DynamicCodeReceipt[]>([]);
    const [saved, setSaved] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showKey, setShowKey] = useState(false);
    const active = items.find(item => item.id === activeId) ?? null;
    const matrix = useMemo(() => active ? createMatrix(active.resolve_url) : null, [active]);
    const update = (next: DynamicCodeReceipt[]) => {
        setItems(next);
        if (saved)
            try {
                writeCodeReceipts(localStorage, next);
            }
            catch {
                setError(t('dynamic.storageFailed'));
                setSaved(false);
            }
    };
    const create = async () => {
        if (!consent || busy || items.length >= 100)
            return;
        setBusy(true);
        setError('');
        try {
            const expiresAt = expiry ? new Date(expiry).toISOString() : null;
            const receipt = await createDynamicCode(destination.trim(), expiresAt);
            update([receipt, ...items]);
            setActiveId(receipt.id);
            setShowKey(false);
        }
        catch (cause) {
            setError(cause instanceof DynamicCodeError && cause.code === 'CODE_RATE_LIMITED' ? t('dynamic.rateLimit') : cause instanceof DynamicCodeError && cause.code === 'CODE_INPUT_INVALID' || cause instanceof RangeError ? t('dynamic.invalid') : t('dynamic.failed'));
        }
        finally {
            setBusy(false);
        }
    };
    const revoke = async () => {
        if (!active || busy || !window.confirm(t('dynamic.revokeConfirm')))
            return;
        setBusy(true);
        setError('');
        try {
            await revokeDynamicCode(active);
            update(items.map(item => item.id === active.id ? { ...item, revoked: true } : item));
        }
        catch {
            setError(t('dynamic.revokeFailed'));
        }
        finally {
            setBusy(false);
        }
    };
    const save = (value: boolean) => {
        try {
            if (value)
                writeCodeReceipts(localStorage, items);
            else
                localStorage.removeItem(CODE_STORE);
            setSaved(value);
        }
        catch {
            setError(t('dynamic.storageFailed'));
        }
    };
    const loadSaved = () => {
        const remembered = readCodeReceipts(localStorage);
        update([...remembered, ...items.filter(item => !remembered.some(other => other.id === item.id))].slice(0, 100));
        setActiveId(remembered[0]?.id ?? activeId);
        setSaved(remembered.length > 0);
        if (!remembered.length)
            setError(t('dynamic.noSaved'));
    };
    const importReceipt = async (file: File | undefined) => {
        if (!file)
            return;
        try {
            if (file.size > 16000)
                throw new Error('limit');
            const receipt = parseCodeReceipt(JSON.parse(await file.text()));
            if (!receipt || items.length >= 100)
                throw new Error('invalid');
            update([receipt, ...items.filter(item => item.id !== receipt.id)]);
            setActiveId(receipt.id);
            setError('');
            setShowKey(false);
        }
        catch {
            setError(t('dynamic.receiptInvalid'));
        }
    };
    const download = async (format: 'png' | 'svg' | 'pdf') => {
        if (!matrix)
            return;
        try {
            const blob = format === 'png' ? await qrPngBlob(matrix, '#102a4c', '#ffffff') : format === 'pdf' ? await qrPdfBlob(matrix, '#102a4c', '#ffffff') : qrSvgBlob(matrix, '#102a4c', '#ffffff');
            downloadOutput({ name: `qr-${active?.id}.${format}`, blob });
        }
        catch {
            setError(t('qrCreate.renderFailed'));
        }
    };
    const workspace = <CodeWorkspace inputTitle={s('manager.input')} previewTitle={s('preview')}
      input={<>
    <div className="cn-codestudio-dynamic-create">
      <p>{t('dynamic.notice')}</p>
      <label className="erp-flow-field__label">{t('dynamic.destination')}<Form.Control type="url" value={destination} placeholder="https://" maxLength={1800} disabled={busy} onChange={event => setDestination(event.target.value)}/></label>
      <label className="erp-flow-field__label mt-3">{t('dynamic.expiry')}<Form.Control type="datetime-local" value={expiry} disabled={busy} onChange={event => setExpiry(event.target.value)}/></label>
      <p className="erp-flow-field__hint">{t('dynamic.noExpiryHint')}</p>
      <Form.Check id="cn-dynamic-consent" label={t('dynamic.consent')} checked={consent} onChange={event => setConsent(event.target.checked)}/>
      <Button className="mt-3" disabled={!consent || !destination || busy || items.length >= 100} onClick={() => void create()}>{busy ? t('dynamic.working') : t('dynamic.create')}</Button>
      {error ? <p role="alert" className="erp-tool-form__error mt-3">{error}</p> : null}
    </div>
    <ToolPanel title={t('dynamic.manager')}>
      <p>{t('dynamic.keyNotice')}</p>
      <Button variant="outline-secondary" disabled={busy} onClick={loadSaved}>{t('dynamic.loadSaved')}</Button>
      <label className="erp-flow-field__label mt-3">{t('dynamic.import')}<FileInput accept="application/json,.json" disabled={busy} onChange={event => void importReceipt((event.target as HTMLInputElement).files?.[0])}/></label>
      {items.length ? <label className="erp-flow-field__label mt-3">{t('dynamic.select')}<Form.Select value={activeId ?? ''} disabled={busy} onChange={event => { setActiveId(event.target.value); setShowKey(false); }}>{items.map(item => <option key={item.id} value={item.id}>{item.destination_url}</option>)}</Form.Select></label> : null}
      {active ? <>
        <Form.Check id="cn-dynamic-save" className="mt-3" label={t('dynamic.saveDevice')} checked={saved} onChange={event => save(event.target.checked)}/>
        <div className="d-flex flex-wrap gap-2 mt-3">
          <Button variant="outline-secondary" onClick={() => downloadOutput({ name: `qr-management-${active.id}.json`, blob: new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' }) })}>{t('dynamic.receipt')}</Button>
          <Button variant="outline-secondary" onClick={() => setShowKey(!showKey)}>{showKey ? t('dynamic.hideKey') : t('dynamic.showKey')}</Button>
          <Button variant="outline-danger" disabled={busy || active.revoked} onClick={() => void revoke()}>{t('dynamic.revoke')}</Button>
        </div>
        {showKey ? <p className="erp-qr-payload mt-3">{active.manage_key}</p> : null}
        <Button variant="link" disabled={busy} onClick={() => { const next = items.filter(item => item.id !== active.id); update(next); setActiveId(next[0]?.id ?? null); setShowKey(false); }}>{t('dynamic.forget')}</Button>
        <p className="erp-flow-field__hint">{t('dynamic.forgetHint')}</p>
      </> : null}
    </ToolPanel>

      </>}
      preview={<>
    <QrPreview matrix={matrix} color="#102a4c" background="#ffffff" placeholder={t('dynamic.empty')}/>
    {active ? <>
      <p className="erp-qr-payload">{active.destination_url}</p>
      <p role="status">{active.revoked ? t('dynamic.revoked') : active.expires_at && Date.parse(active.expires_at) <= Date.now() ? t('dynamic.expired') : t('dynamic.active')}</p>
      <p>{active.expires_at ? t('dynamic.expires', { date: new Date(active.expires_at).toLocaleString() }) : t('dynamic.noExpiry')}</p>
      <p className="erp-flow-field__hint">{t('dynamic.needsNetwork')}</p>
      <Button disabled={active.revoked} onClick={() => void download('png')}><Icon name="download" className="me-2"/>{t('qrCreate.downloadPng')}</Button>
      <Button variant="outline-secondary" disabled={active.revoked} onClick={() => void download('pdf')}>{t('qrCreate.downloadPdf')}</Button>
      <Button variant="outline-secondary" disabled={active.revoked} onClick={() => void download('svg')}>{t('qrCreate.downloadSvg')}</Button>
    </> : null}

      </>} />;
    return embedded ? workspace : <QrStudio kind="manager">{workspace}</QrStudio>;
}
