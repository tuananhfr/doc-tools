import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { withBase } from '@/utils/url'
import type { DeckKind } from '../types/entertainment.types'
import { useDraw } from '../hooks/useDraw'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { DrawResultView } from '../components/DrawResultView'
import { SpreadGuide } from '../components/SpreadGuide'
import { EntertainmentStudio } from '../components/EntertainmentStudio'

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
      <legend><Icon name="sliders2" /> 1. {common(`studio.${copy}.settings`)}</legend>
      <span className="cn-fun-field-label" id={`${kind}-spread`}>{t('cards.spread')}</span>
      <div className="cn-tarot-presets" role="group" aria-labelledby={`${kind}-spread`}>
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
  return <div className={`cn-tarot-workspace${tarot ? '' : ' cn-playing-workspace'}`} data-state={draw.result ? 'result' : 'setup'}>
    {!draw.result ? <aside className="cn-tarot-sidebar">{form}<p className="cn-fun-session-note"><Icon name="info-circle" />{common('funStudio.drawNote')}</p></aside> : null}
    <section className="cn-studio-card cn-tarot-table">
      {draw.result ? <DrawResultView draw={draw} /> : <>
        <div className="cn-studio-card-head"><span className="cn-studio-small-icon"><Icon name={tarot ? 'stars' : 'suit-spade'} /></span><div><h2>2. {common(`studio.${copy}.stageTitle`)}</h2><p>{common(`studio.${copy}.stageHint`)}</p></div><span className="cn-studio-badge">{common(`studio.${copy}.deck`)}</span></div>
        <div className={`cn-tarot-preview${spread > 3 ? ' cn-tarot-preview--many' : ''}`} data-count={spread} aria-hidden="true">
          {Array.from({ length: spread }, (_, index) => <div key={index} className="cn-tarot-preview__card"><img src={withBase(`/assets/entertainment/${tarot ? 'tarot' : 'cards'}/back.svg`)} alt="" width="120" height={tarot ? '201' : '168'} /><span>{index + 1}</span></div>)}
        </div>
        <p className="cn-tarot-preview-hint"><Icon name="hand-index" />{common(`studio.${copy}.previewHint`)}</p>
        <SpreadGuide amount={spread} />
        {!tarot ? <p className="cn-playing-profile">{t('cards.profile')} {t('cards.meaningHint')}</p> : null}
      </>}
    </section>
  </div>
}
export default function DrawPage({ kind }: { kind: DeckKind }) { return <EntertainmentStudio kind={kind}><EntertainmentFrame><DrawWorkspace kind={kind} /></EntertainmentFrame></EntertainmentStudio> }
