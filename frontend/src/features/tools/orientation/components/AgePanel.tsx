import { Button, Form } from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { ToolPanel, ToolSegments } from '@/features/tools/hub'
import { translateKey } from '@/i18n/runtime'
import { CURRENT_RULE_PROFILE } from '../config/rule-profiles'
import { MAX_OWNERS, type Owners } from '../hooks/useOwners'
import type { Sex } from '../types/rule.types'
import { formatDeg } from '../utils/azimuth'
import type { BirthKind, OwnerDraft, OwnerReading } from '../utils/owner'
import { goodDirections, readHouse } from '../utils/rule-engine'
import { elementName, groupHouseName, groupName, starMeaning, starName, trigramName } from '../utils/terms'

interface AgePanelProps {
  owners: Owners
  /** Số độ của đối tượng chính; null = chưa đo / chưa khoá. */
  azimuth: number | null
  targetLabel: string
  /** Bắc dự án không phải phương thật — đọc sao theo nó là sai, phải nói ra. */
  warning?: string | null
}

const BIRTH_KINDS: BirthKind[] = ['SOLAR_DATE', 'LUNAR_YEAR']

/**
 * THEO TUỔI (spec v1.1 §13–14) — tách hẳn khỏi số đo, mặc định tắt. Luật là dữ liệu
 * trong `RULE_PROFILES`; ở đây chỉ hiển thị. Người thứ nhất quyết định vòng sao trên la bàn.
 */
export function AgePanel({ owners, azimuth, targetLabel, warning }: AgePanelProps) {
  const { t } = useTranslation('orientation')
  const profile = CURRENT_RULE_PROFILE

  return (
    <ToolPanel
      title={t('age.title')}
      actions={
        <Form.Check
          type="switch"
          id="orient-age-toggle"
          label={t(owners.open ? 'shared.on' : 'shared.off')}
          checked={owners.open}
          onChange={(event) => owners.setOpen(event.target.checked)}
        />
      }
    >
      {!owners.open ? (
        <p className="erp-orient-muted">{t('age.intro', { method: translateKey(profile.text.name).toLowerCase() })}</p>
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
              {t('age.addPerson')}
            </Button>
          ) : null}

          <div className="erp-orient-disclaimer" role="note">
            <Icon name="info-circle" />
            <div>
              <p>{translateKey(profile.text.disclaimer)}</p>
              <p>{translateKey(profile.text.interpretation)}</p>
              <p className="erp-orient-muted">
                {t('age.method', { name: translateKey(profile.text.name), version: profile.version, source: translateKey(profile.text.source) })}
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
  const { t } = useTranslation('orientation')

  return (
    <div className="erp-orient-person">
      <div className="erp-orient-person__fields">
        <Form.Group controlId={`orient-${draft.id}-label`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">{t('age.name')}</Form.Label>
          <Form.Control value={draft.label} maxLength={20} onChange={(event) => onChange({ label: event.target.value })} />
        </Form.Group>
        <Form.Group controlId={`orient-${draft.id}-sex`} className="erp-flow-field">
          <Form.Label className="erp-flow-field__label">{t('age.sex')}</Form.Label>
          <Form.Select value={draft.sex} onChange={(event) => onChange({ sex: event.target.value as Sex })}>
            <option value="MALE">{t('age.sexes.MALE')}</option>
            <option value="FEMALE">{t('age.sexes.FEMALE')}</option>
          </Form.Select>
        </Form.Group>
        {removable ? (
          <button type="button" className="btn erp-orient-person__remove" aria-label={t('shared.remove', { name: draft.label })} onClick={onRemove}>
            <Icon name="x-lg" />
          </button>
        ) : null}
      </div>

      <ToolSegments label={t('age.inputBy')} value={draft.kind} options={BIRTH_KINDS.map((kind) => ({ value: kind, label: t(`age.birthKinds.${kind}`) }))} onChange={(kind) => onChange({ kind })} />
      {draft.kind === 'SOLAR_DATE' ? (
        <Form.Group controlId={`orient-${draft.id}-date`} className="erp-flow-field">
          <Form.Label className="visually-hidden">{t('age.birthKinds.SOLAR_DATE')}</Form.Label>
          <Form.Control type="date" min="1900-01-01" max="2100-12-31" value={draft.date} isInvalid={result?.ok === false && !birth} onChange={(event) => onChange({ date: event.target.value })} />
        </Form.Group>
      ) : (
        <Form.Group controlId={`orient-${draft.id}-year`} className="erp-flow-field">
          <Form.Label className="visually-hidden">{t('age.birthKinds.LUNAR_YEAR')}</Form.Label>
          <Form.Control inputMode="numeric" placeholder={t('age.yearPlaceholder')} maxLength={4} value={draft.year} isInvalid={result?.ok === false} onChange={(event) => onChange({ year: event.target.value })} />
        </Form.Group>
      )}
      <p className="erp-orient-muted erp-orient-person__lunar">
        {t(draft.kind === 'LUNAR_YEAR' ? 'age.yearNoteLunar' : 'age.yearNote')}
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
            <dt>{t('age.facts.age')}</dt>
            <dd>
              {birth.canChi} ({birth.lunarYear})
            </dd>
          </div>
          <div>
            <dt>{t('age.facts.napAm')}</dt>
            <dd>{birth.napAm.name}</dd>
          </div>
          {reading ? (
            <div>
              <dt>{t('age.facts.trigram')}</dt>
              <dd>
                {trigramName(reading.trigram.id)} ({elementName(reading.trigram.element)}) · {groupName(reading.group.id)}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {birth?.beforeNewYear ? (
        <p className="erp-orient-muted">
          {t('age.beforeTet', { year: birth.lunarYear, canChi: birth.canChi })}
        </p>
      ) : null}

      {reading ? (
        <div className="erp-orient-reading">
          {house ? (
            <>
              <p className={`erp-orient-note erp-orient-note--${good ? 'success' : 'warning'}`}>
                <Icon name={good ? 'check-circle' : 'exclamation-circle'} />
                <span>
                  <Trans
                    ns="orientation"
                    i18nKey={good ? 'age.facingGood' : 'age.facingBad'}
                    values={{ target: targetLabel, segment: house.facing.segment, degree: formatDeg(azimuth ?? 0), star: starName(house.facing.star.id), meaning: starMeaning(house.facing.star.id) }}
                    components={{ strong: <strong /> }}
                  />
                </span>
              </p>
              {house.house ? (
                <p className="erp-orient-muted">
                  {t(house.house.matchesPerson ? 'age.houseSame' : 'age.houseOther', {
                    segment: house.house.segment,
                    trigram: trigramName(house.house.trigram.id),
                    houseGroup: groupHouseName(house.house.group.id),
                    personGroup: groupName(reading.group.id),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="erp-orient-muted">{t('age.lockFirst', { target: targetLabel.toLowerCase() })}</p>
          )}
          <p className="erp-orient-reading__good">
            {t('age.goodDirections', {
              list: goodDirections(reading)
                .map((segment) => `${segment.name} (${starName(segment.star.id)})`)
                .join(' · '),
            })}
          </p>
          {drivesDial ? <p className="erp-orient-muted">{t('age.drivesDial', { name: draft.label || t('age.thisPerson') })}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
