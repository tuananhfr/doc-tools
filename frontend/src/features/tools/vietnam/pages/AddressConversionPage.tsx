import { PracticalStudio } from '@/features/tools/utility/components/PracticalStudio'
import { useMemo, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { StructuredTextRows } from '@/features/tools/hub/components/board/StructuredTextRows'
import { ToolBoard, ToolPanel } from '@/features/tools/hub'
import { Icon } from '@/components/ui'
import { formatRuleDate, ruleSnapshot } from '@/features/tools/rules/services/signed-rules'
import { useSignedRules } from '@/features/tools/rules/hooks/useSignedRules'
import { RuleStatus } from '@/features/tools/rules/components/RuleStatus'
import { loginPath, useMe } from '@/features/account'
import { AiSourceCheckPanel } from '@/features/ai'
import { SaveResultBar, type SaveAdapter } from '@/features/cloud'
import { addressSnapshot, parseAddressSaved } from '../utils/address-saved'
import { convertAddress, indexAddressRules, parseAddressMappings, parseAddressRules} from '../utils/address-conversion'
import { SourceFreshness } from '@/features/tools/rules/components/SourceFreshness'

const csvField = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`

const ADDRESS_KINDS = ['addresses']

export default function AddressConversionPage() {
  const { t } = useTranslation('vietnam')
  const { t: studio } = useTranslation('common', { keyPrefix: 'studio.address' })
  const me = useMe()
  const member = me.data ? { signedIn: Boolean(me.data.user), pro: me.data.plan.pro } : null
  const [addresses, setAddresses] = useState('')
  const [mappingText, setMappingText] = useState('')
  const [usingVerified, setUsingVerified] = useState(false)
  const addressRules = useSignedRules('addresses', parseAddressRules)
  const verified = addressRules.state === 'ready' ? addressRules.current : null
  const manualRules = useMemo(() => parseAddressMappings(mappingText), [mappingText])
  const rules = usingVerified && verified ? verified.data : manualRules
  // Không có bảng thì mọi dòng ra "không nhận ra tỉnh": báo "0/N đổi đủ" là đổ lỗi cho địa chỉ trong khi thiếu là dữ liệu.
  const hasTable = Boolean(rules && (rules.provinces.length || rules.wards.length))
  const index = useMemo(() => rules ? indexAddressRules(rules) : null, [rules])
  const lines = addresses.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 500)
  const results = index && hasTable ? lines.map((line) => convertAddress(line, index)) : []
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
  return <PracticalStudio kind="address"><ToolBoard className="cn-address-workspace" layout="balanced" after={<><AiSourceCheckPanel member={member} loginTo={loginPath('/doi-dia-chi')} toolId="doi-dia-chi" domain="addresses" kinds={ADDRESS_KINDS} snapshot={ruleSnapshot(verified)} currentResult={results.map((row) => `${row.input} → ${row.output}`).join('\n')} /></>} side={<div className="erp-tool-result cn-address-result" aria-live="polite">
    <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name="geo-alt" /></span><div><h2>{t('address.resultLabel')}</h2><p>{studio('resultHint')}</p></div></div>
    {!results.length ? <div className="cn-address-empty" aria-hidden="true"><Icon name="geo" /><Icon name="arrow-right" /><Icon name="geo-alt-fill" /></div> : null}
    <p className="erp-tool-result__value">{hasTable ? t('address.resultValue', { full, total: lines.length }) : t('address.noTable')}</p>
    <p className="erp-tool-result__note">{hasTable ? t('address.resultNote') : t('address.noTableNote')}</p>
    {results.length ? <Button className="cn-address-download" onClick={download}><Icon name="download" className="me-2" />{t('address.downloadCsv')}</Button> : null}
    {hasTable ? <p className="erp-tool-result__note mt-3">{usingVerified && verified ? t('address.verifiedNote', { date: formatRuleDate(verified.effectiveFrom), source: verified.source.title }) : t('address.manualNote')}</p> : null}
    {usingVerified && verified ? <a href={verified.source.url} target="_blank" rel="noopener noreferrer">{t('address.viewSource')}</a> : null}
  </div>}>
    <ToolPanel title={t('address.panelTitle')} actions={<span className="cn-studio-small-icon"><Icon name="pencil-square" /></span>}>
      <p className="cn-studio-form-hint">{studio('inputHint')}</p>
      <label className="erp-flow-field__label">{t('address.addressesLabel')}<Form.Control as="textarea" rows={6} maxLength={100000} value={addresses} onChange={(event) => setAddresses(event.target.value)} placeholder={t('address.addressesPlaceholder')} /></label>
      {verified ? <Button className="mt-3" variant="outline-secondary" onClick={() => setUsingVerified(true)} disabled={usingVerified}>{t(usingVerified ? 'address.usingVerified' : 'address.applyVerified')}</Button> : null}
      <RuleStatus rules={addressRules} label={t('address.rulesLabel')} noneText={t('address.rulesNone')} />
      <SourceFreshness rules={addressRules} />
      <details className="mt-3"><summary>{t('address.manualTitle')}</summary><StructuredTextRows label={t('address.manualTitle')} columns={(['oldProvince', 'oldDistrict', 'oldWard', 'newProvince', 'newWard'] as const).map(key => t(`address.mappingFields.${key}`))} separator="|" value={mappingText} onChange={value => { setMappingText(value); setUsingVerified(false) }} /></details>
      {manualRules === null ? <p role="alert">{t('address.manualInvalid')}</p> : null}
    </ToolPanel>
    {/* Bảng ở cột chính: cột kết quả bên phải chỉ rộng 320px, ba cột địa chỉ dài trong đó bị cắt. */}
    {results.length ? <ToolPanel className="cn-address-table" title={t('address.tableTitle')} actions={<span className="cn-studio-small-icon"><Icon name="table" /></span>}>
      <div className="table-responsive"><table className="table table-sm mb-0"><thead><tr><th>{t('address.columns.old')}</th><th>{t('address.columns.proposed')}</th><th>{t('address.columns.status')}</th></tr></thead><tbody>{results.map((row, at) => <tr key={at}><td>{row.input}</td><td>{row.output}</td><td>{statusLabel(row)}</td></tr>)}</tbody></table></div>
    </ToolPanel> : null}
    <SaveResultBar member={member} toolId="doi-dia-chi" adapter={saveAdapter} />
  </ToolBoard></PracticalStudio>
}
