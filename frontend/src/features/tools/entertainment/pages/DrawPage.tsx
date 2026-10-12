import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeckKind } from '../types/entertainment.types'
import { useDraw } from '../hooks/useDraw'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { DrawResultView } from '../components/DrawResultView'
import { SpreadGuide } from '../components/SpreadGuide'

function DrawWorkspace({ kind }: { kind: DeckKind }) {
  const { t } = useTranslation('entertainment')
  const [spread, setSpread] = useState(3)
  const [reversed, setReversed] = useState(false)
  const draw = useDraw(kind)
  if (draw.result) return <DrawResultView draw={draw} />
  return <form className="cn-ent-form" onSubmit={event => { event.preventDefault(); void draw.draw(spread, reversed) }}>
    <fieldset disabled={draw.busy}>
      <legend>{t('cards.configure')}</legend>
      <label htmlFor={`${kind}-spread`}>{t('cards.spread')}
        <select id={`${kind}-spread`} value={spread} onChange={event => setSpread(Number(event.target.value))}>
          {(kind === 'cards' ? [1, 3, 5, 7, 9] : [1, 3, 5, 7, 10]).map(number => <option key={number} value={number}>{t('cards.amount', { number })}</option>)}
        </select>
      </label>
      <SpreadGuide amount={spread} />
      {kind === 'tarot' ? <label className="cn-ent-check"><input type="checkbox" checked={reversed} onChange={event => setReversed(event.target.checked)} /><span>{t('cards.allowReversed')}</span></label> : null}
      <p>{t('cards.profile')}</p><p>{t('cards.meaningHint')}</p>
      <div className="cn-ent-actions">
        <button type="submit" className="cn-button">{t(draw.busy ? 'cards.drawing' : draw.error ? 'actions.retry' : 'cards.draw')}</button>
        {draw.error ? <button type="button" className="cn-button cn-button--ghost" onClick={draw.reset}>{t('actions.restart')}</button> : null}
      </div>
    </fieldset>
    {draw.error ? <EntertainmentFailure error={draw.error} /> : null}
  </form>
}
export default function DrawPage({ kind }: { kind: DeckKind }) { return <EntertainmentFrame><DrawWorkspace kind={kind} /></EntertainmentFrame> }
