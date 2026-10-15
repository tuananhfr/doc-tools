import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { WorkspaceGuide } from '@/features/tools/hub'
import { withBase } from '@/utils/url'
import type { DeckKind } from '../types/entertainment.types'
import { useDraw } from '../hooks/useDraw'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { DrawResultView } from '../components/DrawResultView'
import { SpreadGuide } from '../components/SpreadGuide'

function DrawWorkspace({ kind }: { kind: DeckKind }) {
  const { t } = useTranslation('entertainment')
  const { t: common } = useTranslation('common')
  const [spread, setSpread] = useState(3)
  const [reversed, setReversed] = useState(false)
  const draw = useDraw(kind)
  const tarot = kind === 'tarot'
  const copy = tarot ? 'tarot' : 'playing'
  const spreads = tarot ? [1, 3, 5, 7, 10] : [1, 3, 5, 7, 9]
  const form = <form className="cn-ent-form" onSubmit={event => { event.preventDefault(); void draw.draw(spread, reversed) }}>
    <fieldset disabled={draw.busy}>
      <legend><Icon name="sliders2" /> {common(`studio.${copy}.settings`)}</legend>
      <label htmlFor={`${kind}-spread`}>{t('cards.spread')}
        <select id={`${kind}-spread`} value={spread} onChange={event => setSpread(Number(event.target.value))}>
          {spreads.map(number => <option key={number} value={number}>{t('cards.amount', { number })}</option>)}
        </select>
      </label>
      <div className="cn-tarot-presets" role="group" aria-label={t('cards.spread')}>
        {spreads.map(amount => <button type="button" key={amount} aria-pressed={spread === amount} onClick={() => setSpread(amount)}>{t('cards.amount', { number: amount })}</button>)}
      </div>
      {kind === 'tarot' ? <label className="cn-ent-check"><input type="checkbox" checked={reversed} onChange={event => setReversed(event.target.checked)} /><span>{t('cards.allowReversed')}</span></label> : null}
      <div className="cn-ent-actions">
        <button type="submit" className="cn-button"><Icon name={draw.busy ? 'hourglass-split' : 'shuffle'} />{t(draw.busy ? 'cards.drawing' : draw.error ? 'actions.retry' : 'cards.draw')}</button>
        {draw.error ? <button type="button" className="cn-button cn-button--ghost" onClick={draw.reset}>{t('actions.restart')}</button> : null}
      </div>
    </fieldset>
    {draw.error ? <EntertainmentFailure error={draw.error} /> : null}
  </form>
  return <div className={`cn-tarot-workspace${tarot ? '' : ' cn-playing-workspace'}`}>
    <section className="cn-studio-card cn-tarot-table">
      {draw.result ? <DrawResultView draw={draw} /> : <>
        <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name={tarot ? 'stars' : 'suit-spade'} /></span><div><h2>{common(`studio.${copy}.stageTitle`)}</h2><p>{common(`studio.${copy}.stageHint`)}</p></div><span className="cn-studio-badge">{common(`studio.${copy}.deck`)}</span></div>
        <div className={`cn-tarot-preview${spread > 3 ? ' cn-tarot-preview--many' : ''}`} data-count={spread} aria-hidden="true">
          {Array.from({ length: spread }, (_, index) => <div key={index} className="cn-tarot-preview__card"><img src={withBase(`/assets/entertainment/${tarot ? 'tarot' : 'cards'}/back.svg`)} alt="" width="120" height={tarot ? '201' : '168'} /><span>{index + 1}</span></div>)}
        </div>
        <p className="cn-tarot-preview-hint"><Icon name="hand-index" />{common(`studio.${copy}.previewHint`)}</p>
        <SpreadGuide amount={spread} />
        {!tarot ? <p className="cn-playing-profile">{t('cards.profile')} {t('cards.meaningHint')}</p> : null}
      </>}
    </section>
    <aside className="cn-tarot-sidebar">
      {!draw.result ? form : null}
      <WorkspaceGuide steps={[common(`studio.${copy}.stepChoose`), common(`studio.${copy}.stepReveal`), common(`studio.${copy}.stepRead`)]} tip={common(`studio.${copy}.tip`)} note={t('disclaimer')} noteTitle={common('studio.tarot.noteTitle')} noteIcon="heart" />
    </aside>
  </div>
}
export default function DrawPage({ kind }: { kind: DeckKind }) { return <EntertainmentFrame showReference={false}><DrawWorkspace kind={kind} /></EntertainmentFrame> }
