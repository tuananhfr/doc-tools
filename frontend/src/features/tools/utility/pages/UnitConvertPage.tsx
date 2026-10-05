import { useId, useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { CopyButton, formatQuantity, parseDecimal, ToolBoard, ToolPanel, ToolSegments } from '@/features/tools/hub'
import { NumberField } from '../components/NumberField'
import { UNIT_GROUPS, type UnitGroupId } from '../config/units'
import { convertToAll, convertUnit, findUnit } from '../utils/unit-convert'

type Pair = { from: string; to: string }

const SEGMENTS = UNIT_GROUPS.map((group) => ({ value: group.id, label: group.label, icon: group.icon }))

const FIRST_PAIRS = Object.fromEntries(UNIT_GROUPS.map((group) => [group.id, { from: group.from, to: group.to }])) as Record<UnitGroupId, Pair>

/** CHUYỂN ĐỔI ĐƠN VỊ — chiều dài, diện tích, khối lượng; một giá trị, xem ở mọi đơn vị của nhóm. */
export default function UnitConvertPage() {
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
      sideLabel="Ở mọi đơn vị"
      side={
        <>
          <h2 className="erp-flow-options__title">
            {value === null ? 'Ở mọi đơn vị' : `${formatQuantity(value)} ${from.symbol} bằng`}
          </h2>
          {value === null ? (
            <p className="erp-flow-field__hint">{wrong ? 'Giá trị chưa phải một con số.' : 'Nhập giá trị cần đổi.'}</p>
          ) : (
            <ul className="erp-tool-rows">
              {convertToAll(value, from, group)
                .filter((item) => item.unit.id !== from.id)
                .map((item) => (
                  <li key={item.unit.id} className="erp-tool-row">
                    <span className="erp-tool-row__value">
                      {formatQuantity(item.value)} <span className="erp-tool-row__unit">{item.unit.symbol}</span>
                    </span>
                    <span className="erp-tool-row__label">{item.unit.label}</span>
                    <CopyButton text={formatQuantity(item.value)} label={`Chép giá trị theo ${item.unit.label}`} iconOnly variant="link" />
                  </li>
                ))}
            </ul>
          )}
        </>
      }
    >
      <ToolSegments label="Loại đơn vị" value={groupId} options={SEGMENTS} onChange={setGroupId} />

      <ToolPanel title="Đổi đơn vị">
        <div className="erp-tool-form">
          <div className="erp-unit-pair">
            <NumberField label="Giá trị" value={text} invalid={wrong} onChange={setText} />
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-from`}>
                Từ đơn vị
              </label>
              <Form.Select id={`${ids}-from`} value={from.id} onChange={(event) => setPair({ from: event.target.value })}>
                {group.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </Form.Select>
            </div>
            <Button variant="outline-secondary" className="erp-unit-pair__swap" aria-label="Đảo hai đơn vị" title="Đảo hai đơn vị" onClick={() => setPair({ from: to.id, to: from.id })}>
              <Icon name="arrow-left-right" />
            </Button>
            <div className="erp-flow-field">
              <label className="erp-flow-field__label" htmlFor={`${ids}-to`}>
                Sang đơn vị
              </label>
              <Form.Select id={`${ids}-to`} value={to.id} onChange={(event) => setPair({ to: event.target.value })}>
                {group.units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label} ({unit.symbol})
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>

          <div className="erp-tool-result erp-tool-result--inline" role="status">
            {value === null ? (
              <p className="erp-tool-result__note">{wrong ? 'Giá trị chưa phải một con số. Ví dụ: 2,5 hoặc 1200.' : 'Nhập giá trị cần đổi.'}</p>
            ) : (
              <>
                <p className="erp-tool-result__label">
                  {formatQuantity(value)} {from.symbol} =
                </p>
                <p className="erp-tool-result__value">
                  {formatQuantity(convertUnit(value, from, to))} <span className="erp-tool-result__unit">{to.symbol}</span>
                </p>
                <CopyButton text={formatQuantity(convertUnit(value, from, to))} label="Chép kết quả" className="align-self-start" />
              </>
            )}
          </div>
        </div>
      </ToolPanel>
    </ToolBoard>
  )
}
