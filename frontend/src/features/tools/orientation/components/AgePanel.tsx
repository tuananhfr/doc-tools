import { useState } from 'react'
import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolPanel } from '@/features/tools/hub'
import { RULE_PROFILES } from '../config/rule-profiles'
import type { PersonProfile, Sex } from '../types/rule.types'
import { goodDirections, readDirection, readPerson } from '../utils/rule-engine'

interface AgePanelProps {
  /** Số độ của đối tượng đang chọn; null = chưa đo được. */
  azimuth: number | null
  targetLabel: string
}

/** Spec v1.1 §13: so tối đa hai người (vợ chồng) — nhiều hơn là bảng rối, không ai đọc. */
const MAX_PEOPLE = 2

const blankPerson = (index: number): PersonProfile => ({ id: `p${index}`, label: `Người ${index}`, year: Number.NaN, sex: 'MALE' })

/**
 * THEO TUỔI (spec v1.1 §13–14) — tách hẳn khỏi kết quả đo, mặc định đóng. Luật là
 * dữ liệu trong `RULE_PROFILES`; ở đây chỉ hiển thị. Không lưu, không gửi đi đâu.
 */
export function AgePanel({ azimuth, targetLabel }: AgePanelProps) {
  const [open, setOpen] = useState(false)
  const [people, setPeople] = useState<PersonProfile[]>([blankPerson(1)])
  const profile = RULE_PROFILES[0]

  const patch = (id: string, change: Partial<PersonProfile>) => setPeople((list) => list.map((person) => (person.id === id ? { ...person, ...change } : person)))

  return (
    <ToolPanel
      title="Xem thêm theo tuổi"
      actions={
        <Form.Check
          type="switch"
          id="orient-age-toggle"
          label={open ? 'Đang bật' : 'Đang tắt'}
          checked={open}
          onChange={(event) => setOpen(event.target.checked)}
        />
      }
    >
      {!open ? (
        <p className="erp-orient-muted">Không bắt buộc. Bật để xem hướng vừa đo hợp hay kỵ với tuổi gia chủ theo {profile.name.toLowerCase()}.</p>
      ) : (
        <>
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              azimuth={azimuth}
              targetLabel={targetLabel}
              removable={people.length > 1}
              onChange={(change) => patch(person.id, change)}
              onRemove={() => setPeople((list) => list.filter((item) => item.id !== person.id))}
            />
          ))}

          {people.length < MAX_PEOPLE ? (
            <Button
              variant="outline-secondary"
              className="align-self-start"
              onClick={() => setPeople((list) => [...list, blankPerson(list.some((item) => item.id === 'p2') ? 1 : 2)])}
            >
              <Icon name="person-plus" className="me-2" />
              So thêm một người
            </Button>
          ) : null}

          <div className="erp-orient-disclaimer" role="note">
            <Icon name="info-circle" />
            <div>
              <p>{profile.disclaimer}</p>
              <p>{profile.interpretation}</p>
              <p className="erp-orient-muted">
                Phương pháp: {profile.name} · bộ luật v{profile.version} · {profile.sourceReference}
              </p>
            </div>
          </div>
        </>
      )}
    </ToolPanel>
  )
}

interface PersonCardProps {
  person: PersonProfile
  azimuth: number | null
  targetLabel: string
  removable: boolean
  onChange: (change: Partial<PersonProfile>) => void
  onRemove: () => void
}

function PersonCard({ person, azimuth, targetLabel, removable, onChange, onRemove }: PersonCardProps) {
  const profile = RULE_PROFILES[0]
  const [yearText, setYearText] = useState('')
  const filled = yearText.trim() !== ''
  const outcome = filled ? readPerson(profile, person) : null
  const reading = outcome?.ok ? outcome.value : null
  const here = reading && azimuth !== null ? readDirection(reading, azimuth) : null
  const tone = here?.star.fortune === 'GOOD' ? 'success' : 'warning'

  return (
    <div className="erp-orient-person">
      <div className="erp-orient-person__fields">
        <Form.Group controlId={`orient-${person.id}-label`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Gọi là</Form.Label>
          <Form.Control value={person.label} maxLength={20} onChange={(event) => onChange({ label: event.target.value })} />
        </Form.Group>
        <Form.Group controlId={`orient-${person.id}-year`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Năm sinh âm lịch</Form.Label>
          <Form.Control
            inputMode="numeric"
            placeholder="Ví dụ 1985"
            value={yearText}
            isInvalid={outcome?.ok === false}
            onChange={(event) => {
              setYearText(event.target.value)
              onChange({ year: Number(event.target.value.trim()) })
            }}
          />
        </Form.Group>
        <Form.Group controlId={`orient-${person.id}-sex`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Giới tính</Form.Label>
          <Form.Select value={person.sex} onChange={(event) => onChange({ sex: event.target.value as Sex })}>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </Form.Select>
        </Form.Group>
        {removable ? (
          <button type="button" className="btn erp-orient-person__remove" aria-label={`Bỏ ${person.label}`} onClick={onRemove}>
            <Icon name="x-lg" />
          </button>
        ) : null}
      </div>
      <p className="erp-orient-muted erp-orient-person__lunar">Sinh trước Tết âm lịch thì lấy năm trước đó.</p>

      {outcome && !outcome.ok ? (
        <p className="erp-orient-note erp-orient-note--danger" role="alert">
          <Icon name="exclamation-triangle" />
          {outcome.reason}
        </p>
      ) : null}

      {reading ? (
        <div className="erp-orient-reading">
          <p className="erp-orient-reading__kua">
            Cung <strong>{reading.trigram.name}</strong> ({reading.trigram.element}) · {reading.group.name}
          </p>
          {here ? (
            <p className={`erp-orient-note erp-orient-note--${tone}`}>
              <Icon name={here.star.fortune === 'GOOD' ? 'check-circle' : 'exclamation-circle'} />
              <span>
                {targetLabel} hướng {here.segment}: <strong>{here.star.name}</strong> ({here.star.fortune === 'GOOD' ? 'hợp' : 'kỵ'}) — {here.star.meaning}.
              </span>
            </p>
          ) : (
            <p className="erp-orient-muted">Đo xong hướng {targetLabel.toLowerCase()} để xem hợp hay kỵ.</p>
          )}
          <p className="erp-orient-reading__good">
            Bốn hướng hợp:{' '}
            {goodDirections(reading)
              .map((segment) => `${segment.name} (${segment.star.name})`)
              .join(' · ')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
