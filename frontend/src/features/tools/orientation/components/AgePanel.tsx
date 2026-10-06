import { Button, Form } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import { ToolPanel, ToolSegments } from '@/features/tools/hub'
import { CURRENT_RULE_PROFILE } from '../config/rule-profiles'
import { MAX_OWNERS, type Owners } from '../hooks/useOwners'
import type { Sex } from '../types/rule.types'
import { formatDeg } from '../utils/azimuth'
import type { BirthKind, OwnerDraft, OwnerReading } from '../utils/owner'
import { goodDirections, readHouse } from '../utils/rule-engine'

interface AgePanelProps {
  owners: Owners
  /** Số độ của đối tượng chính; null = chưa đo / chưa khoá. */
  azimuth: number | null
  targetLabel: string
  /** Bắc dự án không phải phương thật — đọc sao theo nó là sai, phải nói ra. */
  warning?: string | null
}

const BIRTH_KINDS: { value: BirthKind; label: string }[] = [
  { value: 'SOLAR_DATE', label: 'Ngày sinh dương lịch' },
  { value: 'LUNAR_YEAR', label: 'Năm sinh âm lịch' },
]

/** "Đông tứ mệnh" → "Đông tứ": nhóm của người gọi là mệnh, của nhà gọi là trạch. */
const groupStem = (name: string) => name.replace(/\s*mệnh$/, '')

/**
 * THEO TUỔI (spec v1.1 §13–14) — tách hẳn khỏi số đo, mặc định tắt. Luật là dữ liệu
 * trong `RULE_PROFILES`; ở đây chỉ hiển thị. Người thứ nhất quyết định vòng sao trên la bàn.
 */
export function AgePanel({ owners, azimuth, targetLabel, warning }: AgePanelProps) {
  const profile = CURRENT_RULE_PROFILE

  return (
    <ToolPanel
      title="Xem theo tuổi gia chủ"
      actions={
        <Form.Check
          type="switch"
          id="orient-age-toggle"
          label={owners.open ? 'Đang bật' : 'Đang tắt'}
          checked={owners.open}
          onChange={(event) => owners.setOpen(event.target.checked)}
        />
      }
    >
      {!owners.open ? (
        <p className="erp-orient-muted">Không bắt buộc. Bật để hiện vòng sao hợp / kỵ theo tuổi trên la bàn và xem hướng nhà hợp hay kỵ theo {profile.name.toLowerCase()}.</p>
      ) : (
        <>
          {warning ? (
            <p className="erp-orient-note erp-orient-note--warning" role="status">
              <Icon name="exclamation-triangle" />
              {warning}
            </p>
          ) : null}

          {owners.drafts.map((draft, index) => (
            <OwnerCard
              key={draft.id}
              draft={draft}
              result={owners.readings[index]}
              drivesDial={index === 0}
              azimuth={warning ? null : azimuth}
              targetLabel={targetLabel}
              removable={owners.drafts.length > 1}
              onChange={(change) => owners.patch(draft.id, change)}
              onRemove={() => owners.remove(draft.id)}
            />
          ))}

          {owners.drafts.length < MAX_OWNERS ? (
            <Button variant="outline-secondary" className="align-self-start" onClick={owners.add}>
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

interface OwnerCardProps {
  draft: OwnerDraft
  result: OwnerReading | null
  drivesDial: boolean
  azimuth: number | null
  targetLabel: string
  removable: boolean
  onChange: (change: Partial<OwnerDraft>) => void
  onRemove: () => void
}

function OwnerCard({ draft, result, drivesDial, azimuth, targetLabel, removable, onChange, onRemove }: OwnerCardProps) {
  const birth = result?.birth ?? null
  const reading = result?.ok ? result.reading : null
  const house = reading && azimuth !== null ? readHouse(CURRENT_RULE_PROFILE, reading, azimuth) : null
  const good = house?.facing.star.fortune === 'GOOD'

  return (
    <div className="erp-orient-person">
      <div className="erp-orient-person__fields">
        <Form.Group controlId={`orient-${draft.id}-label`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Gọi là</Form.Label>
          <Form.Control value={draft.label} maxLength={20} onChange={(event) => onChange({ label: event.target.value })} />
        </Form.Group>
        <Form.Group controlId={`orient-${draft.id}-sex`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">Giới tính</Form.Label>
          <Form.Select value={draft.sex} onChange={(event) => onChange({ sex: event.target.value as Sex })}>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </Form.Select>
        </Form.Group>
        {removable ? (
          <button type="button" className="btn erp-orient-person__remove" aria-label={`Bỏ ${draft.label}`} onClick={onRemove}>
            <Icon name="x-lg" />
          </button>
        ) : null}
      </div>

      <ToolSegments label="Nhập theo" value={draft.kind} options={BIRTH_KINDS} onChange={(kind) => onChange({ kind })} />
      {draft.kind === 'SOLAR_DATE' ? (
        <Form.Group controlId={`orient-${draft.id}-date`} className="erp-flow-field">
          <Form.Label className="visually-hidden">Ngày sinh dương lịch</Form.Label>
          <Form.Control type="date" min="1900-01-01" max="2100-12-31" value={draft.date} isInvalid={result?.ok === false && !birth} onChange={(event) => onChange({ date: event.target.value })} />
        </Form.Group>
      ) : (
        <Form.Group controlId={`orient-${draft.id}-year`} className="erp-flow-field">
          <Form.Label className="visually-hidden">Năm sinh âm lịch</Form.Label>
          <Form.Control inputMode="numeric" placeholder="Ví dụ 1986" maxLength={4} value={draft.year} isInvalid={result?.ok === false} onChange={(event) => onChange({ year: event.target.value })} />
        </Form.Group>
      )}
      <p className="erp-orient-muted erp-orient-person__lunar">
        Năm tính theo Tết âm lịch{draft.kind === 'LUNAR_YEAR' ? ' — sinh trước Tết thì lấy năm trước đó.' : '.'}
      </p>

      {result && !result.ok ? (
        <p className="erp-orient-note erp-orient-note--danger" role="alert">
          <Icon name="exclamation-triangle" />
          {result.reason}
        </p>
      ) : null}

      {birth ? (
        <dl className="erp-orient-facts">
          <div>
            <dt>Tuổi</dt>
            <dd>
              {birth.canChi} ({birth.lunarYear})
            </dd>
          </div>
          <div>
            <dt>Mệnh (nạp âm)</dt>
            <dd>{birth.napAm.name}</dd>
          </div>
          {reading ? (
            <div>
              <dt>Cung mệnh</dt>
              <dd>
                {reading.trigram.name} ({reading.trigram.element}) · {reading.group.name}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {birth?.beforeNewYear ? (
        <p className="erp-orient-muted">
          Sinh trước Tết nên tính tuổi năm {birth.lunarYear} ({birth.canChi}).
        </p>
      ) : null}

      {reading ? (
        <div className="erp-orient-reading">
          {house ? (
            <>
              <p className={`erp-orient-note erp-orient-note--${good ? 'success' : 'warning'}`}>
                <Icon name={good ? 'check-circle' : 'exclamation-circle'} />
                <span>
                  {targetLabel}: {house.facing.segment} ({formatDeg(azimuth ?? 0)}) — <strong>{house.facing.star.name}</strong>, {good ? 'hợp' : 'kỵ'}. {house.facing.star.meaning}.
                </span>
              </p>
              {house.house ? (
                <p className="erp-orient-muted">
                  Xét theo toạ: nhà toạ {house.house.segment} là {house.house.trigram.name} trạch ({groupStem(house.house.group.name)} trạch),{' '}
                  {house.house.matchesPerson ? 'cùng nhóm' : 'khác nhóm'} với {reading.group.name}.
                </p>
              ) : null}
            </>
          ) : (
            <p className="erp-orient-muted">Khoá số đo {targetLabel.toLowerCase()} để xem hợp hay kỵ.</p>
          )}
          <p className="erp-orient-reading__good">
            Bốn hướng hợp:{' '}
            {goodDirections(reading)
              .map((segment) => `${segment.name} (${segment.star.name})`)
              .join(' · ')}
          </p>
          {drivesDial ? <p className="erp-orient-muted">Vòng sao trên la bàn tính theo {draft.label || 'người này'}.</p> : null}
        </div>
      ) : null}
    </div>
  )
}
