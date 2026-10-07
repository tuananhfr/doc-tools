import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { CopyButton, formatQuantity, parseDecimal, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { UNIT_GROUPS, type UnitGroupId } from '../config/units'
import { convertToAll, convertUnit, findUnit } from '../utils/unit-convert'

type Pair = { from: string; to: string }

const FIRST_PAIRS = Object.fromEntries(UNIT_GROUPS.map((group) => [group.id, { from: group.from, to: group.to }])) as Record<UnitGroupId, Pair>

/** CHUYỂN ĐỔI ĐƠN VỊ — chiều dài, diện tích, khối lượng; một giá trị, xem ở mọi đơn vị của nhóm. */
export default function UnitConvertPage() {
  const { t } = useTranslation('utility')
  const ids = useId()
  const [groupId, setGroupId] = useState<UnitGroupId>('length')
  const [pairs, setPairs] = useState(FIRST_PAIRS)
  const [text, setText] = useState('1')

  const group = UNIT_GROUPS.find((item) => item.id === groupId) ?? UNIT_GROUPS[0]
  const pair = pairs[group.id]
  const from = findUnit(group, pair.from)
  const to = findUnit(group, pair.to)
  const value = parseDecimal(text)
  const wrong = text.trim() !== '' && value === null

  const setPair = (patch: Partial<Pair>) => setPairs((current) => ({ ...current, [group.id]: { ...current[group.id], ...patch } }))

  return (
    <ToolBoard
      sideLabel={t('unitConvert.allUnits')}
      side={
        <>
          <h2 className="erp-flow-options__title">
            {value === null ? t('unitConvert.allUnits') : t('unitConvert.equalsHeading', { value: formatQuantity(value), unit: t(from.symbol) })}
          </h2>
          {value === null ? (
            <p className="erp-flow-field__hint">{wrong ? t('unitConvert.notNumber') : t('unitConvert.enterValue')}</p>
          ) : (
            <ul className="erp-tool-rows">
              {convertToAll(value, from, group)
                .filter((item) => item.unit.id !== from.id)
                .map((item) => (
                  <li key={item.unit.id} className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      {formatQuantity(item.value)} <span className="erp-tool-row__unit">{t(item.unit.symbol)}</span>
                    </span>
                    <span className="erp-tool-row__label">{t(item.unit.label)}</span>
                    <CopyButton text={formatQuantity(item.value)} label={t('unitConvert.copyIn', { unit: t(item.unit.label) })} iconOnly variant="link" />
                  </li>
                ))}
            </ul>
          )}
        </>
      }
    >
      <ToolSegments label={t('unitConvert.groupLabel')} value={groupId} options={UNIT_GROUPS.map((item) => ({ value: item.id, label: t(item.label), icon: item.icon }))} onChange={setGroupId} />

      <ToolPanel title={t('unitConvert.panelTitle')}>
        <div className="erp-tool-form">
          <div className="erp-unit-pair">
            <NumberField label={t('unitConvert.value')} value={text} invalid={wrong} onChange={setText} />
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-from`}>
                {t('unitConvert.from')}
              </label>
              <Form.Select id={`${ids}-from`} value={from.id} onChange={(event) => setPair({ from: event.target.value })}>
                {group.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {t('unitConvert.unitOption', { name: t(unit.label), symbol: t(unit.symbol) })}
                  </option>
                ))}
              </Form.Select>
            </div>
            <Button variant="outline-secondary" className="erp-unit-pair__swap" aria-label={t('unitConvert.swap')} title={t('unitConvert.swap')} onClick={() => setPair({ from: to.id, to: from.id })}>
              <Icon name="arrow-left-right" />
            </Button>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-to`}>
                {t('unitConvert.to')}
              </label>
              <Form.Select id={`${ids}-to`} value={to.id} onChange={(event) => setPair({ to: event.target.value })}>
                {group.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {t('unitConvert.unitOption', { name: t(unit.label), symbol: t(unit.symbol) })}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

          <div className="erp-tool-result erp-tool-result--inline" role="status">
            {value === null ? (
              <p className="erp-tool-result__note">{wrong ? t('unitConvert.notNumberExample') : t('unitConvert.enterValue')}</p>
            ) : (
              <>
                <p className="erp-tool-result__label">
                  {t('unitConvert.equals', { value: formatQuantity(value), unit: t(from.symbol) })}
                </p>
                <p className="erp-tool-result__value">
                  {formatQuantity(convertUnit(value, from, to))} <span className="erp-tool-result__unit">{t(to.symbol)}</span>
                </p>
                <CopyButton text={formatQuantity(convertUnit(value, from, to))} label={t('shared.copyResult')} className="align-self-start" />
              </>
            )}
          </div>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
