import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { formatRuleDate, ruleSnapshot } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { SaveResultBar, type SaveAdapter } from '@/features/cloud'
import { addressSnapshot, parseAddressSaved } from '../utils/address-saved'
import { convertAddress, indexAddressRules, parseAddressMappings, parseAddressRules} from '../utils/address-conversion'

const csvField = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`

const ADDRESS_KINDS = ['addresses']

export default function AddressConversionPage() {
  const { t } = useTranslation('vietnam')
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
  const [addresses, setAddresses] = useState('')
  const [mappingText, setMappingText] = useState('')
  const [usingVerified, setUsingVerified] = useState(false)
  const addressRules = useSignedRules('addresses', parseAddressRules)
  const verified = addressRules.state === 'ready' ? addressRules.current : null
  const manualRules = useMemo(() => parseAddressMappings(mappingText), [mappingText])
  const rules = usingVerified && verified ? verified.data : manualRules
  const index = useMemo(() => rules ? indexAddressRules(rules) : null, [rules])
  const lines = addresses.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 500)
  const results = index ? lines.map((line) => convertAddress(line, index)) : []
  const full = results.filter((item) => item.status === 'full').length
  const statusLabel = (row: (typeof results)[number]) => t(`address.status.${row.status}`, { options: row.options.join(t('address.orSeparator')) })
  const saveAdapter: SaveAdapter = {
    snapshot: () => addressSnapshot({ addresses, mappingText, useVerified: usingVerified && Boolean(verified) }),
    restore: (payload) => {
      const saved = parseAddressSaved(payload)
      if (!saved) return false
      setAddresses(saved.addresses); setMappingText(saved.mappingText)
      // Saved with the verified package: use whatever package is verified now, if any.
      setUsingVerified(saved.useVerified && Boolean(verified))
      return true
    },
  }
  const download = () => {
    const header = [t('address.columns.old'), t('address.columns.proposed'), t('address.columns.status'), t('address.columns.droppedDistrict')]
    const csv = '﻿' + [header, ...results.map((row) => [row.input, row.output, statusLabel(row), row.droppedDistrict])].map((row) => row.map(csvField).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${t('address.csvFileName')}.csv`; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <ToolBoard side={<div className="erp-tool-result" aria-live="polite">
    <p className="erp-tool-result__label">{t('address.resultLabel')}</p>
    <p className="erp-tool-result__value">{t('address.resultValue', { full, total: lines.length })}</p>
    <p className="erp-tool-result__note">{t('address.resultNote')}</p>
    {results.length ? <><div className="table-responsive"><table className="table table-sm"><thead><tr><th>{t('address.columns.old')}</th><th>{t('address.columns.proposed')}</th><th>{t('address.columns.status')}</th></tr></thead><tbody>{results.map((row, at) => <tr key={at}><td>{row.input}</td><td>{row.output}</td><td>{statusLabel(row)}</td></tr>)}</tbody></table></div><Button variant="outline-secondary" onClick={download}>{t('address.downloadCsv')}</Button></> : null}
    <p className="erp-tool-result__note mt-3">{usingVerified && verified ? t('address.verifiedNote', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('address.manualNote')}</p>
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('address.viewSource')}</a> : null}
  </div>}>
    <ToolPanel title={t('address.panelTitle')}>
      <label className="erp-flow-field__label">{t('address.addressesLabel')}<Form.Control as="textarea" rows={6} maxLength={100000} value={addresses} onChange={(event) => setAddresses(event.target.value)} placeholder={t('address.addressesPlaceholder')} /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={() => setUsingVerified(true)} disabled={usingVerified}>{t(usingVerified ? 'address.usingVerified' : 'address.applyVerified')}</Button> : null}
      <RuleStatus rules={addressRules} label={t('address.rulesLabel')} noneText={t('address.rulesNone')} />
      <label className="erp-flow-field__label mt-3">{t('address.manualLabel')}<Form.Control as="textarea" rows={6} maxLength={1000000} value={mappingText} onChange={(event) => { setMappingText(event.target.value); setUsingVerified(false) }} /></label>
      {manualRules === null ? <p role="alert">{t('address.manualInvalid')}</p> : null}
    </ToolPanel>
    <SaveResultBar member={member} toolId="doi-dia-chi" adapter={saveAdapter} />
    <AiSourceCheckPanel member={member} loginTo={loginPath('/doi-dia-chi')} toolId="doi-dia-chi" domain="addresses" kinds={ADDRESS_KINDS} snapshot={ruleSnapshot(verified)} currentResult={results.map((row) => `${row.input} → ${row.output}`).join('\n')} />
  </ToolBoard>
}
